<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\DiagnosticResult;
use App\Models\Question;
use App\Models\StudentProfile;
use App\Models\StudentTopicProgress;
use App\Models\Topic;
use Illuminate\Http\Request;

class DiagnosticController extends Controller
{
    /**
     * Get a set of diagnostic questions across topics for a subject.
     */
    public function start(Request $request)
    {
        $request->validate(['subject_id' => 'required|exists:subjects,id']);

        $questions = Question::whereHas('topic.quarter', fn($q) => $q->where('subject_id', $request->subject_id))
            ->inRandomOrder()
            ->take(20)
            ->get(['id', 'question_text', 'options', 'difficulty', 'topic_id']);

        return response()->json($questions);
    }

    /**
     * Submit diagnostic and generate study plan.
     */
    public function submit(Request $request)
    {
        $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'answers'    => 'required|array',
        ]);

        $student = $request->user();
        $answers = $request->answers;

        // Score per topic
        $questions   = Question::whereIn('id', array_keys($answers))->get();
        $topicScores = [];

        foreach ($questions as $question) {
            $topicId = $question->topic_id;
            if (!isset($topicScores[$topicId])) {
                $topicScores[$topicId] = ['correct' => 0, 'total' => 0];
            }
            $topicScores[$topicId]['total']++;
            if (($answers[$question->id] ?? '') === $question->correct_answer) {
                $topicScores[$topicId]['correct']++;
            }
        }

        $topicPercents = [];
        foreach ($topicScores as $topicId => $data) {
            $topicPercents[$topicId] = $data['total'] > 0
                ? round(($data['correct'] / $data['total']) * 100)
                : 0;
        }

        $overallScore = count($topicPercents) > 0
            ? round(array_sum($topicPercents) / count($topicPercents))
            : 0;

        // Study plan: topics where student scored below 80%
        $studyPlan = Topic::whereIn('id', array_keys($topicPercents))
            ->get()
            ->filter(fn($t) => ($topicPercents[$t->id] ?? 100) < 80)
            ->values()
            ->toArray();

        $result = DiagnosticResult::create([
            'student_id'  => $student->id,
            'subject_id'  => $request->subject_id,
            'score'       => $overallScore,
            'topic_scores'=> $topicPercents,
            'study_plan'  => $studyPlan,
        ]);

        // Unlock active topics based on diagnostic
        foreach ($topicPercents as $topicId => $score) {
            StudentTopicProgress::updateOrCreate(
                ['student_id' => $student->id, 'topic_id' => $topicId],
                [
                    'status'       => $score >= 80 ? 'completed' : 'active',
                    'mastery_score'=> $score,
                ]
            );
        }

        // Update profile
        $profile = StudentProfile::firstOrCreate(['student_id' => $student->id]);
        $profile->update([
            'diagnostic_score'     => $overallScore,
            'diagnostic_completed' => true,
        ]);

        return response()->json([
            'score'       => $overallScore,
            'topic_scores'=> $topicPercents,
            'study_plan'  => $studyPlan,
            'result'      => $result,
        ]);
    }
}
