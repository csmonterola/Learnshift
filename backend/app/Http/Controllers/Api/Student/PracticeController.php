<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\PracticeAttempt;
use App\Models\Question;
use App\Models\StudentTopicProgress;
use App\Models\StudentProfile;
use App\Models\Topic;
use Illuminate\Http\Request;

class PracticeController extends Controller
{
    /**
     * Get questions for a topic practice session.
     */
    public function getQuestions(Request $request, Topic $topic)
    {
        $questions = $topic->questions()
            ->inRandomOrder()
            ->take(10)
            ->get(['id', 'question_text', 'options', 'difficulty']);

        return response()->json($questions);
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
        $answers   = $request->answers; // [question_id => submitted_answer]
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
            ['status' => 'active', 'mastery_score' => 0, 'xp_earned' => 0]
        );

        $xpGained = (int) ($score * 0.5); // 50 XP for 100%
        $progress->update([
            'mastery_score' => max($progress->mastery_score, $score),
            'status'        => $score >= 80 ? 'completed' : 'active',
            'xp_earned'     => $progress->xp_earned + $xpGained,
        ]);

        // Update student total XP and streak
        $profile = StudentProfile::firstOrCreate(['student_id' => $student->id]);
        $today   = now()->toDateString();
        $newStreak = ($profile->last_active_date?->toDateString() === now()->subDay()->toDateString())
            ? $profile->streak_days + 1
            : ($profile->last_active_date?->toDateString() === $today ? $profile->streak_days : 1);

        $profile->update([
            'total_xp'         => $profile->total_xp + $xpGained,
            'streak_days'      => $newStreak,
            'last_active_date' => $today,
        ]);

        return response()->json([
            'attempt'    => $attempt,
            'score'      => $score,
            'xp_gained'  => $xpGained,
            'progress'   => $progress->fresh(),
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
