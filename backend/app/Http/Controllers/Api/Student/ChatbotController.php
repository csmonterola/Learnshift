<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\AnonymousQuestion;
use App\Models\ChatbotLog;
use App\Services\Ai\AiProviderFactory;
use App\Services\Learning\LearningProfileService;
use App\Services\Rag\RagPromptBuilder;
use Illuminate\Http\Request;

class ChatbotController extends Controller
{
    /**
     * Send a question to Mistral AI.
     */
    public function ask(Request $request)
    {
        $request->validate([
            'question' => 'required|string|max:2000',
            'subject_id' => 'nullable|exists:subjects,id',
        ]);

        $question = $request->question;

        // Build the conversation history for context (last 10 logs for this student)
        $history = ChatbotLog::where('student_id', $request->user()->id)
            ->latest()
            ->take(5)
            ->get()
            ->reverse()
            ->flatMap(fn ($log) => [
                ['role' => 'user',      'content' => $log->question],
                ['role' => 'assistant', 'content' => $log->response],
            ])
            ->values()
            ->toArray();

        // Resolve the learner profile so the tutor adapts explanation depth,
        // pacing, help stance, and tone to this student's demonstrated traits.
        $profile = app(LearningProfileService::class)->analyze($request->user());
        $profileBlock = RagPromptBuilder::profileBlock($profile);

        $systemContent = 'You are a helpful educational AI assistant for LearnShift, a learning platform for Filipino students. '.
                         'Help students understand their lessons, answer subject-related questions, and provide clear explanations. '.
                         'Be friendly, encouraging, and educational. Keep responses concise and easy to understand.';

        // Additive only — never strips the existing prompt.
        if ($profileBlock !== '') {
            $systemContent .= "\n\n" . $profileBlock;
        }

        $messages = array_merge(
            [
                [
                    'role' => 'system',
                    'content' => $systemContent,
                ],
            ],
            $history,
            [
                ['role' => 'user', 'content' => $question],
            ]
        );

        try {
            $provider = AiProviderFactory::make('chat');
            $result = $provider->chat($messages, [
                'max_tokens' => 600,
                'temperature' => 0.7,
            ]);
            $responseText = $result['content'];
        } catch (\RuntimeException $e) {
            \Log::error('Chatbot AI provider error', [
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'AI service temporarily unavailable. Please try again.'], 502);
        }

        $confidence = 90; // Mistral doesn't return confidence; use fixed high value

        $log = ChatbotLog::create([
            'student_id' => $request->user()->id,
            'subject_id' => $request->subject_id,
            'question' => $question,
            'response' => $responseText,
            'confidence_score' => $confidence,
            'status' => 'ok',
        ]);

        return response()->json([
            'response' => $responseText,
            'confidence_score' => $confidence,
            'log_id' => $log->id,
        ]);
    }

    public function history(Request $request)
    {
        $logs = ChatbotLog::where('student_id', $request->user()->id)
            ->with('subject')
            ->latest()
            ->paginate(20);

        return response()->json($logs);
    }

    /**
     * Submit an anonymous question to the teacher.
     */
    public function askTeacher(Request $request)
    {
        $request->validate([
            'teacher_id' => 'required|exists:users,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'question' => 'required|string|max:1000',
        ]);

        $q = AnonymousQuestion::create([
            'student_id' => $request->user()->id,
            'teacher_id' => $request->teacher_id,
            'subject_id' => $request->subject_id,
            'question' => $request->question,
        ]);

        return response()->json(['message' => 'Question submitted anonymously.', 'id' => $q->id], 201);
    }

    /**
     * Get answers to the student's anonymous questions.
     */
    public function myAnonymousAnswers(Request $request)
    {
        $questions = AnonymousQuestion::where('student_id', $request->user()->id)
            ->where('is_answered', true)
            ->with('subject')
            ->get(['id', 'subject_id', 'question', 'answer', 'answered_at', 'created_at']);

        return response()->json($questions);
    }
}
