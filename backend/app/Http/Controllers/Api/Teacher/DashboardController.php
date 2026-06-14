<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ChatbotLog;
use App\Models\StudentTopicProgress;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $teacher = $request->user();

        $classes  = $teacher->taughtClasses()->with(['subject', 'students'])->get();
        $studentIds = $classes->flatMap(fn($c) => $c->students->pluck('id'))->unique()->values();

        $atRisk = \App\Models\User::whereIn('id', $studentIds)
            ->with(['studentProfile', 'subjectMastery.subject'])
            ->get()
            ->filter(fn($s) => ($s->studentProfile->diagnostic_score ?? 100) < 70)
            ->values();

        $recentFlags = ChatbotLog::whereIn('student_id', $studentIds)
            ->where('status', 'flagged')
            ->with(['student', 'subject'])
            ->latest()
            ->take(5)
            ->get();

        $topicMastery = StudentTopicProgress::whereIn('student_id', $studentIds)
            ->with('topic.quarter.subject')
            ->get()
            ->groupBy('topic.title')
            ->map(fn($group) => round($group->avg('mastery_score'), 1));

        return response()->json([
            'total_students' => $studentIds->count(),
            'total_classes'  => $classes->count(),
            'at_risk_count'  => $atRisk->count(),
            'at_risk'        => $atRisk->take(5),
            'flagged_logs'   => $recentFlags,
            'topic_mastery'  => $topicMastery,
            'classes'        => $classes,
        ]);
    }
}
