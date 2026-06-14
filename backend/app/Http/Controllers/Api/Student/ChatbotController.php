<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\AnonymousQuestion;
use App\Models\ChatbotLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatbotController extends Controller
{
    /**
     * Send a question to Mistral AI.
     */
    public function ask(Request $request)
    {
        $request->validate([
            'question'   => 'required|string|max:2000',
            'subject_id' => 'nullable|exists:subjects,id',
        ]);

        $question = $request->question;
        $apiKey   = config('services.mistral.api_key');
        $model    = config('services.mistral.model', 'mistral-small-latest');

        if (!$apiKey) {
            return response()->json(['error' => 'AI service not configured.'], 503);
        }

        // Build the conversation history for context (last 10 logs for this student)
        $history = ChatbotLog::where('student_id', $request->user()->id)
            ->latest()
            ->take(5)
            ->get()
            ->reverse()
            ->flatMap(fn($log) => [
                ['role' => 'user',      'content' => $log->question],
                ['role' => 'assistant', 'content' => $log->response],
            ])
            ->values()
            ->toArray();

        $messages = array_merge(
            [
                [
                    'role'    => 'system',
                    'content' => "You are a helpful educational AI assistant for LearnShift, a learning platform for Filipino students. " .
                                 "Help students understand their lessons, answer subject-related questions, and provide clear explanations. " .
                                 "Be friendly, encouraging, and educational. Keep responses concise and easy to understand.",
                ],
            ],
            $history,
            [
                ['role' => 'user', 'content' => $question],
            ]
        );

        $mistralResponse = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type'  => 'application/json',
        ])->timeout(30)
          ->withoutVerifying()  // disable SSL verify on local dev (Windows cURL limitation)
          ->post('https://api.mistral.ai/v1/chat/completions', [
            'model'       => $model,
            'messages'    => $messages,
            'max_tokens'  => 600,
            'temperature' => 0.7,
        ]);

        if ($mistralResponse->failed()) {
            \Log::error('Mistral API error', [
                'status' => $mistralResponse->status(),
                'body'   => $mistralResponse->body(),
            ]);
            return response()->json(['error' => 'AI service temporarily unavailable. Please try again.'], 502);
        }

        $responseText = $mistralResponse->json('choices.0.message.content')
            ?? 'Sorry, I could not generate a response. Please try again.';

        $confidence = 90; // Mistral doesn't return confidence; use fixed high value

        $log = ChatbotLog::create([
            'student_id'       => $request->user()->id,
            'subject_id'       => $request->subject_id,
            'question'         => $question,
            'response'         => $responseText,
            'confidence_score' => $confidence,
            'status'           => 'ok',
        ]);

        return response()->json([
            'response'         => $responseText,
            'confidence_score' => $confidence,
            'log_id'           => $log->id,
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
            'question'   => 'required|string|max:1000',
        ]);

        $q = AnonymousQuestion::create([
            'student_id' => $request->user()->id,
            'teacher_id' => $request->teacher_id,
            'subject_id' => $request->subject_id,
            'question'   => $request->question,
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
