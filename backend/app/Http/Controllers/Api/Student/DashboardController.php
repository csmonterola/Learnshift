<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\PracticeAttempt;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $student = $request->user()->load([
            'studentProfile',
            'subjectMastery.subject',
            'topicProgress' => fn($q) => $q->where('status', 'active')->with('topic'),
        ]);

        $recentPractice = PracticeAttempt::where('student_id', $student->id)
            ->with('topic.quarter.subject')
            ->latest()
            ->take(5)
            ->get();

        $profile = $student->studentProfile;

        return response()->json([
            'student'         => $student,
            'xp'              => $profile?->total_xp ?? 0,
            'streak'          => $profile?->streak_days ?? 0,
            'mastery_level'   => $profile?->masteryLevel() ?? 'Beginning',
            'active_topics'   => $student->topicProgress,
            'subject_mastery' => $student->subjectMastery,
            'recent_practice' => $recentPractice,
        ]);
    }
}
