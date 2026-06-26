<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Services\EnrollmentGuard;
use App\Services\Quiz\QuestionGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LessonPracticeController extends Controller
{
    public function __construct(
        private readonly QuestionGenerator $questionGenerator,
        private readonly EnrollmentGuard   $enrollmentGuard,
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

        $denied = $this->enrollmentGuard->denyIfNotEnrolled($student, $lesson);
        if ($denied) return $denied;

        try {
            $result = $this->questionGenerator->generate($lesson, 'practice', 5);

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
     * Submit practice answers for scoring feedback only.
     * Results are NOT persisted — purely for immediate feedback.
     */
    public function submit(Request $request, Lesson $lesson): JsonResponse
    {
        $validated = $request->validate([
            'answers'                    => 'required|array|min:1',
            'answers.*'                  => 'integer|between:0,3',
            'questions'                  => 'required|array|min:1',
            'questions.*.question'       => 'required|string',
            'questions.*.options'        => 'required|array|size:4',
            'questions.*.correct_index'  => 'required|integer|between:0,3',
            'questions.*.explanation'    => 'nullable|string',
        ]);

        $answers   = $validated['answers'];
        $questions = $validated['questions'];

        $correct = 0;
        foreach ($questions as $i => $q) {
            if (isset($answers[$i]) && $answers[$i] === $q['correct_index']) {
                $correct++;
            }
        }

        $total = count($questions);
        $score = $total > 0 ? (int) round(($correct / $total) * 100) : 0;

        // Build per-question feedback
        $feedback = [];
        foreach ($questions as $i => $q) {
            $isCorrect = isset($answers[$i]) && $answers[$i] === $q['correct_index'];
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