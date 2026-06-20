<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\Topic;
use App\Models\StudentLessonProgress;
use App\Models\StudentTopicProgress;
use App\Models\QuizResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SkillTreeController extends Controller
{
    /**
     * GET /api/student/classes/{classId}/skill-tree
     *
     * Returns topics for a class, enriched with:
     *  - mastery_percentage (null when no lessons exist)
     *  - completed_lessons / total_lessons
     *  - quiz_attempts (total number of quiz attempts across all lessons in the topic)
     *  - best_quiz_score (best score across all quiz attempts in the topic)
     *  - status (locked/active/completed)
     *  - lessons (array of lessons with their own mastery data)
     *  - class_info with overall_mastery
     */
    public function index(Request $request, int $classId): JsonResponse
    {
        $student = $request->user();

        // Verify enrollment
        $class = SchoolClass::whereHas('students', fn($q) => $q->where('users.id', $student->id))
            ->where('id', $classId)
            ->firstOrFail();

        // Get topics with lessons
        $topics = Topic::where('class_id', $classId)
            ->orderBy('order_index')
            ->with('lessons')
            ->get();

        // Collect all lesson IDs for batch queries
        $allLessonIds = [];
        $topicLessonMap = []; // topic_id => [lesson_ids]
        foreach ($topics as $topic) {
            $lessonIds = $topic->lessons->pluck('id')->toArray();
            $topicLessonMap[$topic->id] = $lessonIds;
            $allLessonIds = array_merge($allLessonIds, $lessonIds);
        }

        // Batch query 1: All lesson progress for this student in this class
        $allProgress = StudentLessonProgress::where('student_id', $student->id)
            ->whereIn('lesson_id', $allLessonIds)
            ->get()
            ->keyBy('lesson_id');

        // Batch query 2: All quiz results aggregated by lesson
        $allQuizResults = QuizResult::where('student_id', $student->id)
            ->whereIn('lesson_id', $allLessonIds)
            ->selectRaw('lesson_id, MAX(score) as best_score, COUNT(*) as attempt_count')
            ->groupBy('lesson_id')
            ->get()
            ->keyBy('lesson_id');

        // Batch query 3: All topic progress for this student
        $allTopicProgress = StudentTopicProgress::where('student_id', $student->id)
            ->whereIn('topic_id', $topics->pluck('id'))
            ->get()
            ->keyBy('topic_id');

        $topicResults = $topics->map(function ($topic) use ($student, $allProgress, $allQuizResults, $allTopicProgress) {
            $lessonIds = $topic->lessons->pluck('id');
            $totalLessons = $lessonIds->count();

            if ($totalLessons === 0) {
                return [
                    'id'                 => $topic->id,
                    'title'              => $topic->title,
                    'description'        => $topic->description,
                    'order_index'        => $topic->order_index,
                    'lesson_count'       => 0,
                    'completed_lessons'  => 0,
                    'mastery_percentage' => null,
                    'best_quiz_score'    => null,
                    'quiz_attempts'      => 0,
                    'status'             => 'locked',
                    'lessons'            => [],
                ];
            }

            // Get progress from batch data
            $topicProgressIds = $lessonIds->toArray();
            $progress = collect();
            foreach ($topicProgressIds as $lid) {
                if ($allProgress->has($lid)) {
                    $progress->put($lid, $allProgress->get($lid));
                }
            }

            $completedLessons = $progress->where('status', 'completed')->count();
            $masterySum = $progress->sum('mastery_percentage');
            $avgMastery = $totalLessons > 0 ? (int) round($masterySum / $totalLessons) : 0;

            // Quiz attempts across all lessons in this topic
            $topicQuizResults = collect();
            foreach ($topicProgressIds as $lid) {
                if ($allQuizResults->has($lid)) {
                    $topicQuizResults->push($allQuizResults->get($lid));
                }
            }

            $totalAttempts = $topicQuizResults->sum('attempt_count');
            $bestScore = $topicQuizResults->max('best_score');

            // Get topic status from batch data
            $topicProgress = $allTopicProgress->get($topic->id);

            $status = 'locked';
            if ($topicProgress) {
                $status = $topicProgress->status;
            } elseif ($completedLessons > 0) {
                $status = 'active';
            }

            // Build lessons array with progress
            $lessons = $topic->lessons->map(function ($lesson) use ($allProgress, $allQuizResults) {
                $p = $allProgress->get($lesson->id);
                $quiz = $allQuizResults->get($lesson->id);
                return [
                    'id'                 => $lesson->id,
                    'title'              => $lesson->title,
                    'order'              => $lesson->order,
                    'mastery_percentage' => $p?->mastery_percentage ?? 0,
                    'status'             => $p?->status ?? 'not_started',
                    'best_quiz_score'    => $quiz ? (int) $quiz->best_score : ($p?->best_quiz_score ? (int) $p->best_quiz_score : null),
                    'quiz_attempts'      => $quiz ? (int) $quiz->attempt_count : 0,
                ];
            });

            return [
                'id'                 => $topic->id,
                'title'              => $topic->title,
                'description'        => $topic->description,
                'order_index'        => $topic->order_index,
                'lesson_count'       => $totalLessons,
                'completed_lessons'  => $completedLessons,
                'mastery_percentage' => $avgMastery,
                'best_quiz_score'    => $bestScore !== null ? (int) $bestScore : null,
                'quiz_attempts'      => $totalAttempts,
                'status'             => $status,
                'lessons'            => $lessons,
            ];
        });

        // Calculate overall class mastery
        $totalLessonsInClass = 0;
        $totalMasterySum = 0;
        foreach ($topicResults as $tr) {
            $totalLessonsInClass += $tr['lesson_count'];
            if ($tr['mastery_percentage'] !== null) {
                $totalMasterySum += $tr['mastery_percentage'] * $tr['lesson_count'];
            }
        }
        $overallMastery = $totalLessonsInClass > 0
            ? (int) round($totalMasterySum / $totalLessonsInClass)
            : 0;

        return response()->json([
            'class_info' => [
                'id'               => $class->id,
                'name'             => $class->name,
                'subject'          => $class->subject,
                'grade_level'      => $class->grade_level,
                'section'          => $class->section,
                'overall_mastery'  => $overallMastery,
            ],
            'topics' => $topicResults,
        ]);
    }
}