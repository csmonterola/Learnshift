<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\LearningMaterial;
use App\Models\SchoolClass;
use App\Models\StudentLessonProgress;
use App\Models\Topic;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
     * Now includes per-topic mastery for the current student.
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
            ->get()
            ->map(function ($topic) use ($student) {
                // Get lesson IDs for this topic
                $lessonIds = DB::table('lessons')->where('topic_id', $topic->id)->pluck('id');

                $progress = StudentLessonProgress::where('student_id', $student->id)
                    ->whereIn('lesson_id', $lessonIds)
                    ->get();

                $totalLessons = $lessonIds->count();
                $completedLessons = $progress->where('status', 'completed')->count();
                $masteredLessons = $progress->where('mastery_percentage', 100)->count();
                // Divide by TOTAL lessons (not just attempted ones) so unattempted lessons count as 0%
                $avgMastery = $totalLessons > 0 ? (int) round($progress->sum('mastery_percentage') / $totalLessons) : 0;

                return [
                    'id'                 => $topic->id,
                    'title'              => $topic->title,
                    'description'        => $topic->description,
                    'order_index'        => $topic->order_index,
                    'lesson_count'       => $topic->lessons_count,
                    'mastery_percentage' => $avgMastery,
                    'completed_lessons'  => $completedLessons,
                    'mastered_lessons'   => $masteredLessons,
                    'total_lessons'      => $totalLessons,
                ];
            });

        return response()->json($topics);
    }

    /**
     * Get a single topic with its lessons, including per-lesson mastery.
     */
    public function topic(Request $request, int $classId, int $topicId)
    {
        $student = $request->user();

        SchoolClass::whereHas('students', fn($q) => $q->where('users.id', $student->id))
            ->where('id', $classId)
            ->firstOrFail();

        $topic = Topic::where('id', $topicId)
            ->where('class_id', $classId)
            ->firstOrFail();

        // Get lessons with mastery data
        $lessons = DB::table('lessons')
            ->where('topic_id', $topicId)
            ->orderBy('order')
            ->get()
            ->map(function ($lesson) use ($student) {
                $progress = StudentLessonProgress::where('student_id', $student->id)
                    ->where('lesson_id', $lesson->id)
                    ->first();

                return [
                    'id'                 => $lesson->id,
                    'title'              => $lesson->title,
                    'content'            => $lesson->content,
                    'order'              => $lesson->order,
                    'status'             => $progress?->status ?? 'not_started',
                    'mastery_percentage' => $progress?->mastery_percentage ?? 0,
                    'best_quiz_score'    => $progress?->best_quiz_score,
                ];
            });

        // Calculate topic mastery
        $topicLessonCount = $lessons->count();
        $topicAvg = $topicLessonCount > 0
            ? (int) round($lessons->avg('mastery_percentage'))
            : 0;

        return response()->json([
            'id'                 => $topic->id,
            'title'              => $topic->title,
            'description'        => $topic->description,
            'mastery_percentage' => $topicAvg,
            'lessons'            => $lessons,
        ]);
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
