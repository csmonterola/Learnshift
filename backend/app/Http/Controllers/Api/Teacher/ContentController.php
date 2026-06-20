<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\LearningMaterial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class ContentController extends Controller
{
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

        $material->update([
            'ingestion_status' => 'pending',
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Material queued for reprocessing.']);
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