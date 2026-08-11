<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\PracticeAttempt;
use App\Services\Learning\LearningProfileService;
use App\Services\Quiz\QuestionGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LessonPracticeController extends Controller
{
    public function __construct(
        private readonly QuestionGenerator $questionGenerator,
        private readonly LearningProfileService $learningProfile,
    ) {}

    /**
     * POST /api/student/lessons/{lesson}/practice/generate
     *
     * Generate practice questions for a lesson using AI.
     * Practice questions are NOT saved to the database — they are for self-assessment only.
     */
    public function generate(Request $request, Lesson $lesson): JsonResponse
    {
        $student = $request->user();

        // Verify enrollment
        $isEnrolled = $lesson->topic->schoolClass->students()
            ->where('users.id', $student->id)
            ->exists();

        if (!$isEnrolled) {
            return response()->json(['error' => 'You are not enrolled in this class.'], 403);
        }

        // Adapt generation to the learner's profile. Cold-start (no
        // recommendation yet) passes null → current mixed-difficulty behavior.
        $recommended = $this->learningProfile->analyze($student)['recommended_difficulty'] ?? null;

        try {
            $result = $this->questionGenerator->generate($lesson, 'practice', 5, $recommended);

            return response()->json([
                'questions' => $result['questions'],
                'source'    => $result['source'],
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }

    /**
     * POST /api/student/lessons/{lesson}/practice/submit
     *
     * Submit practice answers for scoring feedback only. The score/feedback is
     * returned for immediate display; a PracticeAttempt is also persisted with
     * a question_meta snapshot ({index, difficulty, correct}) so the learning
     * profile can derive the difficulty_appetite trait from AI practice.
     */
    public function submit(Request $request, Lesson $lesson): JsonResponse
    {
        $student = $request->user();

        $isEnrolled = $lesson->topic->schoolClass->students()
            ->where('users.id', $student->id)
            ->exists();

        if (!$isEnrolled) {
            return response()->json(['error' => 'You are not enrolled in this class.'], 403);
        }

        $validated = $request->validate([
            'answers'                    => 'required|array|min:1',
            'answers.*'                  => 'integer|between:0,3',
            'questions'                  => 'required|array|min:1',
            'questions.*.question'       => 'required|string',
            'questions.*.options'        => 'required|array|size:4',
            'questions.*.correct_index'  => 'required|integer|between:0,3',
            'questions.*.explanation'    => 'nullable|string',
            'questions.*.difficulty'     => 'sometimes|in:easy,medium,hard',
            'time_spent_seconds'         => 'nullable|integer',
        ]);

        $answers   = $validated['answers'];
        $questions = $validated['questions'];

        $correct = 0;
        foreach ($questions as $i => $q) {
            if (isset($answers[$i]) && (int) $answers[$i] === (int) $q['correct_index']) {
                $correct++;
            }
        }

        $total = count($questions);
        $score = $total > 0 ? (int) round(($correct / $total) * 100) : 0;

        // Persist the attempt snapshot for the learning profile.
        $meta = [];
        foreach ($questions as $i => $q) {
            $isCorrect = isset($answers[$i]) && (int) $answers[$i] === (int) $q['correct_index'];
            $meta[] = [
                'index'      => (int) ($q['index'] ?? $i),
                'difficulty' => strtolower((string) ($q['difficulty'] ?? 'medium')),
                'correct'    => $isCorrect,
            ];
        }

        PracticeAttempt::create([
            'student_id'         => $student->id,
            'topic_id'           => $lesson->topic_id,
            'score'              => $score,
            'total_questions'    => $total,
            'correct_answers'    => $correct,
            'answers'            => $answers,
            'question_meta'      => $meta,
            'time_spent_seconds' => $validated['time_spent_seconds'] ?? null,
        ]);

        // Build per-question feedback
        $feedback = [];
        foreach ($questions as $i => $q) {
            $isCorrect = isset($answers[$i]) && (int) $answers[$i] === (int) $q['correct_index'];
            $feedback[] = [
                'question_index'  => $i,
                'is_correct'      => $isCorrect,
                'correct_index'   => $q['correct_index'],
                'explanation'     => $q['explanation'] ?? null,
            ];
        }

        return response()->json([
            'score'           => $score,
            'correct'         => $correct,
            'total'           => $total,
            'feedback'        => $feedback,
        ]);
    }
}