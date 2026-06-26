<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\PracticeAttempt;
use App\Models\StudentTopicProgress;
use App\Models\Topic;
use App\Services\Quiz\QuestionGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PracticeController extends Controller
{
    public function __construct(
        private readonly QuestionGenerator $questionGenerator,
    ) {}

    /**
     * Get enrolled classes for the practice module
     */
    public function classes(Request $request)
    {
        $student = $request->user();

        $classes = $student->enrolledClasses()
            ->with(['topics.lessons'])
            ->get()
            ->map(function ($class) {
                $topics = $class->topics->map(function ($topic) {
                    return [
                        'id' => $topic->id,
                        'title' => $topic->title,
                        'lessons' => $topic->lessons->map(function ($lesson) {
                            return [
                                'id' => $lesson->id,
                                'title' => $lesson->title,
                            ];
                        }),
                    ];
                });

                return [
                    'id' => $class->id,
                    'name' => $class->name,
                    'subject' => $class->subject,
                    'topics' => $topics,
                ];
            });

        return response()->json($classes);
    }

    /**
     * Generate practice questions from selected lessons using AI
     */
    public function generate(Request $request)
    {
        $request->validate([
            'lesson_ids' => 'required|array|min:1',
            'lesson_ids.*' => 'integer|exists:lessons,id',
            'count' => 'integer|min:1|max:20',
        ]);

        $student = $request->user();
        $lessonIds = $request->lesson_ids;

        $enrolledLessonIds = DB::table('lessons')
            ->join('topics', 'lessons.topic_id', '=', 'topics.id')
            ->join('class_student', 'topics.class_id', '=', 'class_student.class_id')
            ->whereIn('lessons.id', $lessonIds)
            ->where('class_student.student_id', $student->id)
            ->pluck('lessons.id');

        if ($enrolledLessonIds->isEmpty()) {
            return response()->json(['error' => 'You are not enrolled in the selected lessons.'], 403);
        }

        // Load the lessons
        $lessons = Lesson::whereIn('id', $enrolledLessonIds)->get();
        $count = min($request->count ?? 10, 20);
        $allQuestions = [];
        $questionsPerLesson = max(1, intdiv($count, $lessons->count()));

        foreach ($lessons as $lesson) {
            if (count($allQuestions) >= $count) {
                break;
            }

            try {
                $result = $this->questionGenerator->generate($lesson, 'practice', $questionsPerLesson);

                foreach ($result['questions'] as $q) {
                    if (count($allQuestions) >= $count) {
                        break;
                    }
                    $allQuestions[] = [
                        'id' => count($allQuestions) + 1,
                        'lesson_id' => $lesson->id,
                        'question' => $q['question'],
                        'options' => $q['options'],
                        'correct_index' => $q['correct_index'],
                        'explanation' => $q['explanation'] ?? '',
                    ];
                }
            } catch (\RuntimeException $e) {
                // If AI fails for one lesson, continue with others
                // Don't fail the whole request — return what we have
                continue;
            }
        }

        // If AI failed completely, fall back to mock questions
        if (empty($allQuestions)) {
            foreach ($lessons->take(3) as $lesson) {
                for ($i = 0; $i < $count && count($allQuestions) < $count; $i++) {
                    $allQuestions[] = [
                        'id' => count($allQuestions) + 1,
                        'lesson_id' => $lesson->id,
                        'question' => "Practice question for {$lesson->title}?",
                        'options' => ['Option A', 'Option B', 'Option C', 'Option D'],
                        'correct_index' => 0,
                        'explanation' => "Review the lesson content for {$lesson->title} to learn more.",
                    ];
                }
            }
        }

        return response()->json([
            'questions' => $allQuestions,
            'total' => count($allQuestions),
            'lessons' => $lessons->pluck('id'),
        ]);
    }

    /**
     * Submit a completed practice session.
     */
    public function submit(Request $request)
    {
        $request->validate([
            'topic_id'           => 'required|exists:topics,id',
            'answers'            => 'required|array',
            'time_spent_seconds' => 'nullable|integer',
        ]);

        $topic     = Topic::with('questions')->findOrFail($request->topic_id);
        $student   = $request->user();
        $answers   = $request->answers;
        $correct   = 0;

        foreach ($topic->questions as $question) {
            if (isset($answers[$question->id]) && $answers[$question->id] === $question->correct_answer) {
                $correct++;
            }
        }

        $total = $topic->questions->count();
        $score = $total > 0 ? round(($correct / $total) * 100) : 0;

        $attempt = PracticeAttempt::create([
            'student_id'          => $student->id,
            'topic_id'            => $topic->id,
            'score'               => $score,
            'total_questions'     => $total,
            'correct_answers'     => $correct,
            'answers'             => $answers,
            'time_spent_seconds'  => $request->time_spent_seconds,
        ]);

        // Update topic progress
        $progress = StudentTopicProgress::firstOrCreate(
            ['student_id' => $student->id, 'topic_id' => $topic->id],
            ['status' => 'active', 'mastery_score' => 0]
        );

        $progress->update([
            'mastery_score' => max($progress->mastery_score, $score),
            'status'        => $score >= 80 ? 'completed' : 'active',
        ]);

        return response()->json([
            'attempt'  => $attempt,
            'score'    => $score,
            'progress' => $progress->fresh(),
        ]);
    }

    public function history(Request $request)
    {
        $attempts = PracticeAttempt::where('student_id', $request->user()->id)
            ->with('topic.quarter.subject')
            ->latest()
            ->paginate(20);

        return response()->json($attempts);
    }
}