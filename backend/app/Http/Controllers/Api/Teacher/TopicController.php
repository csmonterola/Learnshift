<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\LearningMaterial;
use App\Models\SchoolClass;
use App\Models\Topic;
use App\Services\Storage\MaterialUploadService;
use App\Services\Storage\StorageConfigurationValidator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class TopicController extends Controller
{
    public function __construct(
        private readonly MaterialUploadService $materialUploadService,
        private readonly StorageConfigurationValidator $storageValidator,
    ) {}

    // ── Helpers ───────────────────────────────────────────────────

    private function authorizeClass(Request $request, int $classId): SchoolClass
    {
        return SchoolClass::where('id', $classId)
            ->where('teacher_id', $request->user()->id)
            ->firstOrFail();
    }

    private function authorizeTopic(Request $request, int $topicId): Topic
    {
        $topic = Topic::findOrFail($topicId);
        // Ensure the topic's class belongs to this teacher
        SchoolClass::where('id', $topic->class_id)
            ->where('teacher_id', $request->user()->id)
            ->firstOrFail();
        return $topic;
    }

    private function authorizeLesson(Request $request, int $lessonId): Lesson
    {
        $lesson = Lesson::findOrFail($lessonId);
        $this->authorizeTopic($request, $lesson->topic_id);
        return $lesson;
    }

    // ── Topics ────────────────────────────────────────────────────

    public function indexTopics(Request $request, int $classId)
    {
        $this->authorizeClass($request, $classId);

        $topics = Topic::where('class_id', $classId)
            ->orderBy('order_index')
            ->with(['lessons' => fn($q) => $q->orderBy('order')])
            ->get();

        return response()->json($topics);
    }

    public function storeTopic(Request $request, int $classId)
    {
        $this->authorizeClass($request, $classId);

        $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $orderIndex = Topic::where('class_id', $classId)->max('order_index') ?? -1;

        $topic = Topic::create([
            'class_id'    => $classId,
            'title'       => $request->title,
            'description' => $request->description,
            'order_index' => $orderIndex + 1,
            'order'       => $orderIndex + 1,
            'lesson_count' => 0,
        ]);

        return response()->json($topic->load('lessons'), 201);
    }

    public function updateTopic(Request $request, int $classId, int $topicId)
    {
        $this->authorizeClass($request, $classId);
        $topic = Topic::where('id', $topicId)->where('class_id', $classId)->firstOrFail();

        $request->validate([
            'title'       => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $topic->update($request->only(['title', 'description']));
        return response()->json($topic);
    }

    public function destroyTopic(Request $request, int $classId, int $topicId)
    {
        $this->authorizeClass($request, $classId);
        $topic = Topic::where('id', $topicId)->where('class_id', $classId)->firstOrFail();
        $topic->delete();
        return response()->json(['message' => 'Topic deleted.']);
    }

    // ── Lessons ───────────────────────────────────────────────────

    public function storeLessonForTopic(Request $request, int $classId, int $topicId)
    {
        $this->authorizeClass($request, $classId);
        $topic = Topic::where('id', $topicId)->where('class_id', $classId)->firstOrFail();

        $request->validate([
            'title'   => 'required|string|max:255',
            'content' => 'nullable|string',
        ]);

        $order = Lesson::where('topic_id', $topicId)->max('order') ?? -1;

        $lesson = Lesson::create([
            'topic_id' => $topicId,
            'title'    => $request->title,
            'content'  => $request->content,
            'order'    => $order + 1,
        ]);

        // Keep lesson_count in sync
        $topic->increment('lesson_count');

        return response()->json($lesson, 201);
    }

    public function destroyLesson(Request $request, int $classId, int $topicId, int $lessonId)
    {
        $this->authorizeClass($request, $classId);
        $topic = Topic::where('id', $topicId)->where('class_id', $classId)->firstOrFail();
        $lesson = Lesson::where('id', $lessonId)->where('topic_id', $topicId)->firstOrFail();
        $lesson->delete();
        $topic->decrement('lesson_count');
        return response()->json(['message' => 'Lesson deleted.']);
    }

    // ── Materials (file uploads) ──────────────────────────────────

    public function storeMaterial(Request $request, int $classId, int $topicId, int $lessonId)
    {
        $this->authorizeClass($request, $classId);
        Lesson::where('id', $lessonId)->where('topic_id', $topicId)->firstOrFail();

        $request->validate([
            'file'  => 'required|file|mimes:pdf,docx,pptx,doc,ppt,xlsx,xls,png,jpg,jpeg,gif,mp4,mov|max:51200',
            'title' => 'nullable|string|max:255',
        ]);

        // Validate storage configuration before attempting upload
        $configValidation = $this->storageValidator->validateCurrentConfig('public');
        if (!$configValidation['valid']) {
            Log::error('Storage configuration validation failed during material upload', [
                'lesson_id' => $lessonId,
                'errors' => $configValidation['errors'],
                'credential_type' => $configValidation['credential_type']
            ]);
            
            return response()->json([
                'message' => 'Storage configuration error: Unable to upload files',
                'errors' => $configValidation['errors'],
                'credential_type' => $configValidation['credential_type']
            ], 500);
        }

        try {
            $storagePath = $this->materialUploadService->upload($request->file('file'), $lessonId);
            $fileUrl = $this->materialUploadService->url($storagePath);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to upload material.', 'error' => $e->getMessage()], 500);
        }

        $fileType = strtoupper($request->file('file')->getClientOriginalExtension());
        // Auto-enable AI sync for indexable document types so the RAG pipeline
        // ingests the material automatically via LearningMaterialObserver.
        $aiSync = in_array($fileType, ['PDF', 'DOCX', 'PPTX']);

        $material = LearningMaterial::create([
            'teacher_id' => $request->user()->id,
            'subject_id' => null,
            'topic_id'   => $topicId,
            'lesson_id'  => $lessonId,
            'title'      => $request->title ?? $file->getClientOriginalName(),
            'file_path'  => $storagePath,
            'file_name'  => $file->getClientOriginalName(),
            'file_type'  => $fileType,
            'file_size'  => $file->getSize(),
            'ai_sync'    => $aiSync,
        ]);

        return response()->json(array_merge($material->toArray(), ['file_url' => $fileUrl]), 201);
    }

    public function destroyMaterial(Request $request, int $classId, int $topicId, int $lessonId, int $materialId)
    {
        $this->authorizeClass($request, $classId);
        $material = LearningMaterial::where('id', $materialId)
            ->where('lesson_id', $lessonId)
            ->firstOrFail();
        Storage::disk('public')->delete($material->file_path);
        $material->delete();
        return response()->json(['message' => 'Material deleted.']);
    }

    // ── Links ─────────────────────────────────────────────────────

    public function storeLink(Request $request, int $classId, int $topicId, int $lessonId)
    {
        $this->authorizeClass($request, $classId);
        Lesson::where('id', $lessonId)->where('topic_id', $topicId)->firstOrFail();

        $request->validate([
            'title' => 'required|string|max:255',
            'url'   => 'required|url',
        ]);

        $material = LearningMaterial::create([
            'teacher_id' => $request->user()->id,
            'subject_id' => null,
            'topic_id'   => $topicId,
            'lesson_id'  => $lessonId,
            'title'      => $request->title,
            'file_path'  => $request->url,
            'file_name'  => $request->url,
            'file_type'  => 'LINK',
        ]);

        return response()->json($material, 201);
    }

    // ── Get materials/links for a lesson ──────────────────────────

    public function lessonMaterials(Request $request, int $classId, int $topicId, int $lessonId)
    {
        $this->authorizeClass($request, $classId);
        Lesson::where('id', $lessonId)->where('topic_id', $topicId)->firstOrFail();

        $materials = LearningMaterial::where('lesson_id', $lessonId)
            ->where('file_type', '!=', 'LINK')
            ->get()
            ->map(fn($m) => array_merge($m->toArray(), [
                'file_url' => Storage::disk('public')->url($m->file_path),
            ]));

        $links = LearningMaterial::where('lesson_id', $lessonId)
            ->where('file_type', 'LINK')
            ->get();

        return response()->json(['materials' => $materials, 'links' => $links]);
    }
}
