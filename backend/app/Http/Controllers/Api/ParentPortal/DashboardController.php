<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use App\Models\GuidedSession;
use App\Models\GuidedSessionView;
use App\Models\LearningMaterial;
use App\Models\Lesson;
use App\Models\QuizResult;
use App\Models\StudentLessonProgress;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $parent   = $request->user();

        // Get all linked children (regardless of link_status for now — migration may not be run)
        $children = $parent->children()
            ->with([
                'studentProfile',
                'subjectMastery.subject',
            ])->get()
            ->values();

        // Enrich each child with lesson progress and recent activity
        $children->each(function ($child) {
            $studentId = $child->id;

            // Get all lesson progress for this student across all enrolled classes
            $lessonProgress = StudentLessonProgress::where('student_id', $studentId)
                ->orderByDesc('updated_at')
                ->get()
                ->map(function ($progress) {
                    $lesson = $progress->lesson;
                    if (!$lesson) return null;

                    $topicTitle     = data_get($lesson, 'topic.title') ?? 'Unknown Topic';
                    $subjectName    = data_get($lesson, 'topic.quarter.subject.name') ?? 'Unknown Subject';
                    $className      = data_get($lesson, 'topic.schoolClass.name') ?? 'Unknown Class';

                    return [
                        'id'                => $progress->id,
                        'lesson_id'         => $lesson->id,
                        'lesson_title'      => $lesson->title,
                        'topic_title'       => $topicTitle,
                        'subject_name'      => $subjectName,
                        'class_name'        => $className,
                        'mastery_percentage'=> $progress->mastery_percentage,
                        'status'            => $progress->status,
                        'best_quiz_score'   => $progress->best_quiz_score,
                        'completed_at'      => $progress->completed_at,
                        'updated_at'        => $progress->updated_at,
                    ];
                })
                ->filter()
                ->values();

            $child->lesson_progress = $lessonProgress;

            // Get recent quiz results
            $recentQuizzes = QuizResult::where('student_id', $studentId)
                ->orderByDesc('submitted_at')
                ->limit(10)
                ->get()
                ->map(function ($quiz) {
                    $lesson = $quiz->lesson;
                    if (!$lesson) return null;

                    $subjectName = data_get($lesson, 'topic.quarter.subject.name') ?? 'Unknown Subject';

                    return [
                        'id'            => $quiz->id,
                        'lesson_title'  => $lesson->title,
                        'subject_name'  => $subjectName,
                        'score'         => $quiz->score,
                        'correct'       => $quiz->correct_answers,
                        'total'         => $quiz->total_questions,
                        'attempt'       => $quiz->attempt_number,
                        'submitted_at'  => $quiz->submitted_at,
                    ];
                })
                ->filter()
                ->values();

            $child->recent_quizzes = $recentQuizzes;

            // Build recent activity feed
            $activities = [];

            // Add lesson progress events
            foreach ($lessonProgress->take(5) as $lp) {
                $activities[] = [
                    'type'      => 'lesson',
                    'action'    => $lp['status'] === 'completed' ? 'completed' : 'attempted',
                    'title'     => $lp['lesson_title'],
                    'subject'   => $lp['subject_name'],
                    'score'     => $lp['mastery_percentage'],
                    'timestamp' => $lp['updated_at'],
                ];
            }

            // Add quiz events
            foreach ($recentQuizzes->take(5) as $quiz) {
                $activities[] = [
                    'type'      => 'quiz',
                    'action'    => 'quiz_completed',
                    'title'     => $quiz['lesson_title'],
                    'subject'   => $quiz['subject_name'],
                    'score'     => $quiz['score'],
                    'timestamp' => $quiz['submitted_at'],
                ];
            }

            // Sort by timestamp descending
            usort($activities, function ($a, $b) {
                return strtotime($b['timestamp']) - strtotime($a['timestamp']);
            });

            $child->recent_activity = array_slice($activities, 0, 10);

            // Calculate total lessons enrolled in (across all classes)
            $enrolledLessonIds = DB::table('lessons')
                ->join('topics', 'lessons.topic_id', '=', 'topics.id')
                ->join('classes', 'topics.class_id', '=', 'classes.id')
                ->join('class_student', 'classes.id', '=', 'class_student.class_id')
                ->where('class_student.student_id', $studentId)
                ->pluck('lessons.id')
                ->unique()
                ->count();

            // Calculate real stats
            $child->stats = [
                'total_lessons'        => $enrolledLessonIds,
                'lessons_completed'    => $lessonProgress->where('status', 'completed')->count(),
                'lessons_attempted'    => $lessonProgress->count(),
                'total_quizzes'        => $recentQuizzes->count(),
                'avg_quiz_score'       => $recentQuizzes->count() > 0
                    ? (int) round($recentQuizzes->avg('score'))
                    : 0,
                'overall_mastery'      => $this->calculateOverallMastery($lessonProgress),
            ];
        });

        return response()->json([
            'children' => $children,
        ]);
    }

    private function calculateOverallMastery($lessonProgress)
    {
        if ($lessonProgress->isEmpty()) return 0;
        return (int) round($lessonProgress->avg('mastery_percentage'));
    }

    /**
     * Search for students by name or enrollment code (for linking).
     */
    public function searchStudents(Request $request)
    {
        $request->validate(['query' => 'required|string|min:2']);

        $search = $request->input('query');

        $students = User::where('role', 'student')
            ->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('enrollment_code', 'like', '%' . $search . '%');
            })
            ->limit(20)
            ->get(['id', 'name', 'email', 'enrollment_code'])
            ->map(function ($s) {
                return [
                    'id'              => $s->id,
                    'name'            => $s->name,
                    'email'           => $s->email,
                    'enrollment_code' => $s->enrollment_code ?? 'N/A',
                ];
            });

        return response()->json($students);
    }

    public function linkChild(Request $request)
    {
        $request->validate([
            'student_id' => 'required|exists:users,id',
        ]);

        $student = User::where('id', $request->student_id)
                       ->where('role', 'student')
                       ->first();

        if (! $student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        $parent = $request->user();

        // Check if already linked
        $existing = $parent->children()->where('student_id', $student->id)->first();
        if ($existing) {
            $status = $existing->pivot->link_status;
            if ($status === 'confirmed') {
                return response()->json(['message' => 'Child already linked.'], 409);
            }
            if ($status === 'pending') {
                return response()->json(['message' => 'Link request already sent and awaiting student confirmation.'], 409);
            }
            if ($status === 'rejected') {
                // Re-send: update back to pending
                $parent->children()->updateExistingPivot($student->id, [
                    'link_status'  => 'pending',
                    'confirmed_at' => null,
                ]);
                return response()->json(['message' => 'Link request re-sent. Waiting for student confirmation.', 'child' => $student]);
            }
        }

        $parent->children()->attach($student->id, [
            'link_status'  => 'pending',
            'confirmed_at' => null,
        ]);

        return response()->json([
            'message' => 'Link request sent. Waiting for student confirmation.',
            'child'   => $student,
        ]);
    }

    public function childProgress(Request $request, User $child)
    {
        $this->ensureParentOwnsChild($request->user(), $child);

        return response()->json($child->load([
            'studentProfile',
            'subjectMastery.subject',
            'topicProgress.topic.quarter.subject',
            'practiceAttempts' => fn($q) => $q->latest()->take(10),
        ]));
    }

    public function guidedSessions(Request $request, User $child)
    {
        $this->ensureParentOwnsChild($request->user(), $child);

        $sessions = GuidedSession::whereIn('subject_id', $child->subjectMastery()->pluck('subject_id'))
            ->with(['teacher', 'subject'])
            ->get()
            ->map(function ($session) use ($request, $child) {
                $view = GuidedSessionView::where([
                    'parent_id'         => $request->user()->id,
                    'student_id'        => $child->id,
                    'guided_session_id' => $session->id,
                ])->first();

                return array_merge($session->toArray(), [
                    'view_progress' => $view?->progress_percent ?? 0,
                    'completed'     => $view?->completed ?? false,
                ]);
            });

        return response()->json($sessions);
    }

    public function updateSessionProgress(Request $request, GuidedSession $session)
    {
        $request->validate([
            'student_id'       => 'required|exists:users,id',
            'progress_percent' => 'required|integer|min:0|max:100',
        ]);

        $this->ensureParentOwnsChild($request->user(), User::find($request->student_id));

        GuidedSessionView::updateOrCreate(
            [
                'parent_id'         => $request->user()->id,
                'student_id'        => $request->student_id,
                'guided_session_id' => $session->id,
            ],
            [
                'progress_percent' => $request->progress_percent,
                'completed'        => $request->progress_percent >= 100,
                'last_watched_at'  => now(),
            ]
        );

        return response()->json(['message' => 'Progress updated.']);
    }

    public function courseMaterials(Request $request, User $child)
    {
        $this->ensureParentOwnsChild($request->user(), $child);

        $subjectIds = $child->subjectMastery()->pluck('subject_id');

        $materials = LearningMaterial::whereIn('subject_id', $subjectIds)
            ->with(['subject', 'teacher'])
            ->latest()
            ->get();

        return response()->json($materials);
    }

    private function ensureParentOwnsChild(User $parent, ?User $child): void
    {
        if (! $child) {
            abort(403, 'Access denied.');
        }

        $link = $parent->children()->where('student_id', $child->id)->first();
        if (! $link || ($link->pivot->link_status ?? 'pending') !== 'confirmed') {
            abort(403, 'Access denied.');
        }
    }
}