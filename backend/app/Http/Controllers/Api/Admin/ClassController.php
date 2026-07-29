<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\LessonChatLog;
use App\Models\QuizResult;
use App\Models\SchoolClass;
use App\Models\StudentLessonProgress;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClassController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            SchoolClass::with(['teacher', 'students'])
                ->when($request->search, fn($q) => $q->where('name', 'like', '%' . $request->search . '%'))
                ->paginate(20)
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string',
            'grade_level' => 'required|string',
            'section'     => 'required|string',
            'teacher_id'  => 'required|exists:users,id',
            'subject_id'  => 'required|exists:subjects,id',
        ]);

        // Resolve subject_id to the subject name (string) for storage,
        // since the classes table stores subject as TEXT, not a FK.
        $subject = Subject::findOrFail($validated['subject_id']);

        $class = SchoolClass::create([
            'name'        => $validated['name'],
            'grade_level' => $validated['grade_level'],
            'section'     => $validated['section'],
            'teacher_id'  => $validated['teacher_id'],
            'subject'     => $subject->name,
        ]);

        return response()->json($class->load(['teacher']), 201);
    }

    public function show(SchoolClass $class)
    {
        return response()->json($class->load(['teacher', 'students']));
    }

    public function update(Request $request, SchoolClass $class)
    {
        $data = $request->only(['name', 'grade_level', 'section', 'is_active']);

        // If subject_id is provided, resolve it to the subject name
        if ($request->has('subject_id')) {
            $request->validate(['subject_id' => 'required|exists:subjects,id']);
            $subject = Subject::findOrFail($request->subject_id);
            $data['subject'] = $subject->name;
        }

        $class->update($data);
        return response()->json($class->load(['teacher']));
    }

    public function destroy(SchoolClass $class)
    {
        $class->delete();
        return response()->json(['message' => 'Class deleted.']);
    }

    public function enrollStudents(Request $request, SchoolClass $class)
    {
        $request->validate([
            'student_ids'   => 'required|array',
            'student_ids.*' => 'exists:users,id',
        ]);

        $class->students()->syncWithoutDetaching($request->student_ids);

        // Log enrollment for each student
        foreach ($request->student_ids as $studentId) {
            $student = User::find($studentId);
            if ($student) {
                ActivityLog::create([
                    'user_id'     => $request->user()->id,
                    'action'      => 'student_enrolled',
                    'description' => "Student {$student->name} enrolled in class {$class->name}",
                ]);
            }
        }

        return response()->json(['message' => 'Students enrolled.']);
    }

    public function removeStudent(SchoolClass $class, $studentId)
    {
        $class->students()->detach($studentId);
        return response()->json(['message' => 'Student removed.']);
    }

    /**
     * GET /api/admin/classes/{class}/detail
     * Returns enriched class detail with student progress data.
     */
    public function detail(Request $request, SchoolClass $class)
    {
        $class->load(['teacher']);

        // Get all topics/lessons for this class
        $topics = DB::table('topics')->where('class_id', $class->id)->orderBy('order_index')->get();
        $topicIds = $topics->pluck('id');
        $lessonIds = DB::table('lessons')->whereIn('topic_id', $topicIds)->pluck('id');

        // Get enrolled students with their progress
        $students = $class->students()->get();
        $studentIds = $students->pluck('id');

        $studentProgress = $students->map(function ($student) use ($lessonIds, $topicIds) {
            $studentId = $student->id;

            $lessonProgress = StudentLessonProgress::where('student_id', $studentId)
                ->whereIn('lesson_id', $lessonIds)
                ->get();

            $totalLessons = $lessonIds->count();
            $completedLessons = $lessonProgress->where('status', 'completed')->count();
            $avgMastery = $totalLessons > 0 ? (int) round($lessonProgress->sum('mastery_percentage') / $totalLessons) : 0;

            $quizResults = QuizResult::where('student_id', $studentId)
                ->whereIn('lesson_id', $lessonIds)
                ->get();

            $quizAttempts = $quizResults->count();
            $avgScore = $quizAttempts > 0 ? (int) round($quizResults->avg('score')) : 0;

            $aiInteractions = LessonChatLog::where('student_id', $studentId)
                ->whereIn('lesson_id', $lessonIds)
                ->count();

            $lastActivity = $lessonProgress->sortByDesc('updated_at')->first()?->updated_at
                ?? $quizResults->sortByDesc('submitted_at')->first()?->submitted_at;

            return [
                'id'                 => $studentId,
                'name'               => $student->name,
                'email'              => $student->email,
                'avatar'             => $student->avatar,
                'mastery_percentage' => $avgMastery,
                'completed_lessons'  => $completedLessons,
                'total_lessons'      => $totalLessons,
                'quiz_attempts'      => $quizAttempts,
                'avg_quiz_score'     => $avgScore,
                'ai_interactions'    => $aiInteractions,
                'last_activity'      => $lastActivity,
            ];
        });

        // Topic summary — calculate per-student averages, then average across students
        $topicSummary = $topics->map(function ($topic) use ($studentIds) {
            $topicLessons = DB::table('lessons')->where('topic_id', $topic->id)->pluck('id');
            $lessonCount = $topicLessons->count();
            $progress = StudentLessonProgress::whereIn('student_id', $studentIds)
                ->whereIn('lesson_id', $topicLessons)
                ->get();

            $total = $studentIds->count();

            // Calculate per-student average mastery (divide by total lessons, unattempted = 0%)
            $studentMasteries = $studentIds->map(function ($sid) use ($progress, $lessonCount) {
                $studentRecords = $progress->where('student_id', $sid);
                if ($studentRecords->isEmpty()) return 0; // Not started = 0%
                return (int) round($studentRecords->sum('mastery_percentage') / $lessonCount);
            });

            $avgMastery = $total > 0 ? (int) round($studentMasteries->avg()) : 0;
            $mastered = $studentMasteries->filter(fn($m) => $m === 100)->count();

            return [
                'id'           => $topic->id,
                'title'        => $topic->title,
                'lesson_count' => $lessonCount,
                'avg_mastery'  => $avgMastery,
                'mastered_count' => $mastered,
                'total_students' => $total,
            ];
        });

        $classAvgMastery = $studentProgress->count() > 0
            ? (int) round($studentProgress->avg('mastery_percentage'))
            : 0;

        $masteredCount = $studentProgress->where('mastery_percentage', '>=', 100)->count();
        $developingCount = $studentProgress->where('mastery_percentage', '>', 0)->where('mastery_percentage', '<', 100)->count();
        $notStartedCount = $studentProgress->where('mastery_percentage', 0)->count();

        return response()->json([
            'class' => [
                'id'          => $class->id,
                'name'        => $class->name,
                'grade_level' => $class->grade_level,
                'section'     => $class->section,
                'subject'     => $class->subject,
                'is_active'   => $class->is_active,
                'teacher'     => $class->teacher ? [
                    'id'   => $class->teacher->id,
                    'name' => $class->teacher->name,
                    'email' => $class->teacher->email,
                ] : null,
            ],
            'summary' => [
                'total_students'    => $studentIds->count(),
                'avg_mastery'       => $classAvgMastery,
                'mastered_count'    => $masteredCount,
                'developing_count'  => $developingCount,
                'not_started_count' => $notStartedCount,
                'total_lessons'     => $lessonIds->count(),
                'total_topics'      => $topicIds->count(),
            ],
            'students'      => $studentProgress,
            'topic_summary' => $topicSummary,
        ]);
    }
}