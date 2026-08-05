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
use Illuminate\Support\Facades\Log;

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
            'difficulty' => 'nullable|in:Easy,Medium,Hard',
        ]);

        $student = $request->user();
        $lessonIds = $request->lesson_ids;
        $difficulty = $request->difficulty;

        // Verify enrollment
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

        // Distribute the requested count across lessons, then chunk each
        // lesson's quota into batches. Hard questions are far more verbose
        // (longer stems + full-sentence options), so use a smaller batch
        // size for Hard to stay under the token ceiling and the 30s timeout.
        $maxBatchSize = strtolower($difficulty ?? '') === 'hard' ? 3 : 5;
        $questionsPerLesson = max(1, intdiv($count, $lessons->count()));
        $remaining = $count;

        $batches = [];
        foreach ($lessons as $lesson) {
            if ($remaining <= 0) {
                break;
            }
            $quota = min($questionsPerLesson, $remaining);
            $remaining -= $quota;

            for ($offset = 0; $offset < $quota; $offset += $maxBatchSize) {
                $batchSize = min($maxBatchSize, $quota - $offset);
                $batches[] = ['lesson' => $lesson, 'size' => $batchSize];
            }
        }

        // Run batches concurrently (Laravel 12 concurrency helper), but cap
        // the concurrency window at 3. Running 7+ simultaneous Mistral calls
        // trips the provider's rate limit / 30s timeout (observed: count=20
        // with 7 batches failed 4 batches; count=15 with 5 batches worked).
        // Each closure must take zero arguments — bind the batch + difficulty
        // into the closure via `use` so the subprocess driver can serialize it.
        $results = [];
        foreach (array_chunk($batches, 3) as $window) {
            $windowResults = \Illuminate\Support\Facades\Concurrency::run(
                collect($window)->map(function ($b) use ($difficulty) {
                    return fn () => $this->generateBatch($b['lesson'], $b['size'], $difficulty);
                })->all()
            );
            array_push($results, ...$windowResults);
        }

        foreach ($results as $result) {
            if ($result === null) {
                continue;
            }
            foreach ($result as $q) {
                if (count($allQuestions) >= $count) {
                    break;
                }
                $allQuestions[] = [
                    'id' => count($allQuestions) + 1,
                    'lesson_id' => $q['lesson_id'],
                    'question' => $q['question'],
                    'options' => $q['options'],
                    'correct_index' => $q['correct_index'],
                    'explanation' => $q['explanation'] ?? '',
                ];
            }
        }

        // No more silent mock fallback. If nothing generated, return an
        // honest error so the frontend can surface it instead of showing
        // fake placeholder questions.
        if (empty($allQuestions)) {
            Log::error('Practice generation produced zero questions', [
                'student_id' => $student->id,
                'lesson_ids' => $lessonIds,
                'count' => $count,
                'difficulty' => $difficulty,
            ]);
            return response()->json([
                'error' => 'Unable to generate practice questions. The AI service may be unavailable. Please try again.',
                'questions' => [],
                'total' => 0,
            ], 502);
        }

        return response()->json([
            'questions' => $allQuestions,
            'total' => count($allQuestions),
            'partial' => count($allQuestions) < $count,
            'lessons' => $lessons->pluck('id'),
        ]);
    }

    /**
     * Generate a single batch of questions for a lesson.
     *
     * @return array<int, array{lesson_id:int, question:string, options:array, correct_index:int, explanation:string}>|null
     */
    private function generateBatch(Lesson $lesson, int $size, ?string $difficulty): ?array
    {
        try {
            $result = $this->questionGenerator->generate($lesson, 'practice', $size, $difficulty);

            return array_map(fn ($q) => [
                'lesson_id' => $lesson->id,
                'question' => $q['question'],
                'options' => $q['options'],
                'correct_index' => $q['correct_index'],
                'explanation' => $q['explanation'] ?? '',
            ], $result['questions']);
        } catch (\RuntimeException $e) {
            Log::warning('Practice batch generation failed', [
                'lesson_id' => $lesson->id,
                'size' => $size,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
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