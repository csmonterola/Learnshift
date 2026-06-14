<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\LearningMaterial;
use App\Models\SchoolClass;
use App\Models\Topic;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ClassController extends Controller
{
    /**
     * List all classes the student is enrolled in.
     */
    public function index(Request $request)
    {
        $student = $request->user();

        $classes = $student->enrolledClasses()
            ->where('is_active', true)
            ->with('teacher:id,name,avatar')
            ->get();

        return response()->json($classes);
    }

    /**
     * Get a single class (must be enrolled).
     */
    public function show(Request $request, int $classId)
    {
        $student = $request->user();

        $class = SchoolClass::whereHas('students', fn($q) => $q->where('users.id', $student->id))
            ->where('id', $classId)
            ->with('teacher:id,name,avatar')
            ->firstOrFail();

        return response()->json($class);
    }

    /**
     * Get topics for a class (student must be enrolled).
     */
    public function topics(Request $request, int $classId)
    {
        $student = $request->user();

        // Verify enrollment
        SchoolClass::whereHas('students', fn($q) => $q->where('users.id', $student->id))
            ->where('id', $classId)
            ->firstOrFail();

        $topics = Topic::where('class_id', $classId)
            ->orderBy('order_index')
            ->withCount('lessons')
            ->get();

        return response()->json($topics);
    }

    /**
     * Get a single topic with its lessons.
     */
    public function topic(Request $request, int $classId, int $topicId)
    {
        $student = $request->user();

        SchoolClass::whereHas('students', fn($q) => $q->where('users.id', $student->id))
            ->where('id', $classId)
            ->firstOrFail();

        $topic = Topic::where('id', $topicId)
            ->where('class_id', $classId)
            ->with(['lessons' => fn($q) => $q->orderBy('order')])
            ->firstOrFail();

        return response()->json($topic);
    }

    /**
     * Get a single lesson with its materials and links.
     */
    public function lesson(Request $request, int $classId, int $topicId, int $lessonId)
    {
        $student = $request->user();

        SchoolClass::whereHas('students', fn($q) => $q->where('users.id', $student->id))
            ->where('id', $classId)
            ->firstOrFail();

        $lesson = Lesson::where('id', $lessonId)
            ->where('topic_id', $topicId)
            ->firstOrFail();

        // Get materials (files) and links for this lesson
        $materials = LearningMaterial::where('lesson_id', $lessonId)
            ->where('file_type', '!=', 'LINK')
            ->get()
            ->map(fn($m) => array_merge($m->toArray(), [
                'file_url' => Storage::disk('public')->url($m->file_path),
            ]));

        $links = LearningMaterial::where('lesson_id', $lessonId)
            ->where('file_type', 'LINK')
            ->get();

        return response()->json(array_merge($lesson->toArray(), [
            'materials' => $materials,
            'links'     => $links,
        ]));
    }
}
