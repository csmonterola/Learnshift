<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\LearningMaterial;
use App\Services\Rag\EmbeddingService;
use App\Services\Rag\TextChunker;
use App\Services\Rag\TextExtractor;
use App\Exceptions\TextExtractionException;
use App\Exceptions\EmbeddingException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ContentController extends Controller
{
    public function __construct(
        private readonly TextExtractor    $textExtractor,
        private readonly TextChunker      $textChunker,
        private readonly EmbeddingService $embeddingService,
    ) {}
    
    public function index(Request $request)
    {
        $materials = LearningMaterial::where('teacher_id', $request->user()->id)
            ->with(['lesson.topic.schoolClass', 'subject'])
            ->latest()
            ->get()
            ->map(function ($material) {
                $class = $material->lesson?->topic?->schoolClass;
                return [
                    'id'               => $material->id,
                    'title'            => $material->title,
                    'file_name'        => $material->file_name,
                    'file_type'        => $material->file_type,
                    'file_size'        => $material->file_size,
                    'file_path'        => $material->file_path,
                    'file_url'         => $material->file_type !== 'LINK' ? Storage::disk('public')->url($material->file_path) : $material->file_path,
                    'ai_sync'          => $material->ai_sync,
                    'ingestion_status' => $material->ingestion_status ?? 'pending',
                    'created_at'       => $material->created_at,
                    'updated_at'       => $material->updated_at,
                    'subject'          => $class?->subject ?? 'N/A',
                    'class_name'       => $class?->name ?? ($material->subject?->name ?? 'N/A'),
                    'class_id'         => $class?->id,
                    'topic'            => $material->lesson?->topic?->title ?? 'N/A',
                    'topic_id'         => $material->lesson?->topic?->id,
                    'lesson'           => $material->lesson?->title ?? 'N/A',
                    'lesson_id'        => $material->lesson_id,
                ];
            });

        return response()->json($materials);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title'      => 'required|string|max:255',
            'lesson_id'  => 'required|exists:lessons,id',
            'file'       => 'required|file|mimes:pdf,docx,pptx,doc,ppt,txt|max:51200',
        ]);

        // Verify ownership
        $lesson = DB::table('lessons')
            ->join('topics', 'lessons.topic_id', '=', 'topics.id')
            ->join('classes', 'topics.class_id', '=', 'classes.id')
            ->where('lessons.id', $request->lesson_id)
            ->where('classes.teacher_id', $request->user()->id)
            ->select('lessons.id')
            ->first();

        if (!$lesson) {
            return response()->json(['message' => 'Lesson not found or unauthorized.'], 403);
        }

        $file = $request->file('file');
        $path = $file->store("lessons/{$request->lesson_id}/materials", 'public');

        $material = LearningMaterial::create([
            'teacher_id'       => $request->user()->id,
            'lesson_id'        => $request->lesson_id,
            'title'            => $request->title,
            'file_path'        => $path,
            'file_name'        => $file->getClientOriginalName(),
            'file_type'        => strtoupper($file->getClientOriginalExtension()),
            'file_size'        => $file->getSize(),
            'ingestion_status' => 'pending',
        ]);

        ActivityLog::create([
            'user_id'     => $request->user()->id,
            'action'      => 'material_uploaded',
            'description' => "Teacher {$request->user()->name} uploaded material '{$material->title}'",
        ]);

        return response()->json($material->load(['lesson.topic.schoolClass', 'subject']), 201);
    }

    public function update(Request $request, LearningMaterial $material)
    {
        if ($material->teacher_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $material->update($request->only(['title', 'lesson_id']));
        return response()->json($material->load(['lesson.topic.schoolClass', 'subject']));
    }

    public function destroy(Request $request, LearningMaterial $material)
    {
        if ($material->teacher_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($material->file_type !== 'LINK') {
            Storage::disk('public')->delete($material->file_path);
        }
        $material->delete();

        return response()->json(['message' => 'Material deleted.']);
    }

    public function reprocess(Request $request, LearningMaterial $material)
    {
        if ($material->teacher_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Set status to processing
        $material->update([
            'ingestion_status' => 'processing',
            'updated_at' => now(),
        ]);

        try {
            // 1. Get full file path on disk
            $fullPath = Storage::disk('public')->path($material->file_path);

            if (!file_exists($fullPath)) {
                throw new \RuntimeException('File not found on disk: ' . $fullPath);
            }

            // 2. Extract text
            $text = $this->textExtractor->extract($fullPath, $material->file_type);

            if (trim($text) === '') {
                throw new \RuntimeException('No text could be extracted from the file.');
            }

            // 3. Delete old embeddings for this material if re-processing
            DB::table('lesson_embeddings')
                ->where('lesson_id', $material->lesson_id)
                ->where('material_id', $material->id)
                ->delete();

            // 4. Chunk the text
            $chunks = $this->textChunker->chunk($text);

            if (empty($chunks)) {
                throw new \RuntimeException('Text chunking produced no chunks.');
            }

            // 5. Generate embeddings in batch
            $vectors = $this->embeddingService->embedBatch($chunks);

            // 6. Store embeddings in the database
            $now = now();
            $insertData = [];
            foreach ($chunks as $index => $chunkText) {
                $vector = $vectors[$index] ?? [];
                if (empty($vector)) continue;

                $insertData[] = [
                    'lesson_id'        => $material->lesson_id,
                    'material_id'      => $material->id,
                    'chunk_index'      => $index,
                    'chunk_text'       => $chunkText,
                    'embedding'        => '[' . implode(',', $vector) . ']',
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ];
            }

            if (!empty($insertData)) {
                // Insert in batches using raw SQL for the vector column
                foreach (array_chunk($insertData, 25) as $batch) {
                    $placeholders = [];
                    $values = [];
                    foreach ($batch as $row) {
                        $placeholders[] = '(?, ?, ?, ?, ?::vector, ?, ?)';
                        $values[] = $row['lesson_id'];
                        $values[] = $row['material_id'];
                        $values[] = $row['chunk_index'];
                        $values[] = $row['chunk_text'];
                        $values[] = $row['embedding'];
                        $values[] = $row['created_at'];
                        $values[] = $row['updated_at'];
                    }
                    DB::statement(
                        'INSERT INTO lesson_embeddings (lesson_id, material_id, chunk_index, chunk_text, embedding, created_at, updated_at) VALUES ' .
                        implode(', ', $placeholders),
                        $values
                    );
                }
            }

            // 7. Mark as indexed
            $material->update([
                'ingestion_status' => 'indexed',
                'ai_sync'          => true,
                'updated_at'       => now(),
            ]);

            return response()->json([
                'message' => 'Material successfully processed and indexed.',
                'chunks'  => count($insertData),
            ]);

        } catch (TextExtractionException $e) {
            Log::error('Content reprocess text extraction failed', [
                'material_id' => $material->id,
                'error'       => $e->getMessage(),
            ]);
            $material->update(['ingestion_status' => 'failed']);
            return response()->json(['message' => 'Failed to extract text: ' . $e->getMessage()], 422);

        } catch (EmbeddingException $e) {
            Log::error('Content reprocess embedding failed', [
                'material_id' => $material->id,
                'error'       => $e->getMessage(),
            ]);
            $material->update(['ingestion_status' => 'failed']);
            return response()->json(['message' => 'AI embedding service error: ' . $e->getMessage()], 502);

        } catch (\Throwable $e) {
            Log::error('Content reprocess failed', [
                'material_id' => $material->id,
                'error'       => $e->getMessage(),
                'trace'       => $e->getTraceAsString(),
            ]);
            $material->update(['ingestion_status' => 'failed']);
            return response()->json(['message' => 'Processing failed: ' . $e->getMessage()], 500);
        }
    }

    public function lessons(Request $request)
    {
        $teacher = $request->user();
        $classId = $request->query('class_id');

        $lessons = DB::table('lessons')
            ->join('topics', 'lessons.topic_id', '=', 'topics.id')
            ->join('classes', 'topics.class_id', '=', 'classes.id')
            ->where('classes.teacher_id', $teacher->id)
            ->when($classId, fn($q) => $q->where('classes.id', $classId))
            ->select('lessons.id', 'lessons.title', 'topics.title as topic_title', 'classes.name as class_name', 'classes.id as class_id')
            ->orderBy('classes.name')
            ->orderBy('topics.title')
            ->orderBy('lessons.title')
            ->get();

        return response()->json($lessons);
    }
}