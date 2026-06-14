<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use App\Models\GuidedSession;
use App\Models\GuidedSessionView;
use App\Models\User;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $parent   = $request->user();
        $children = $parent->children()->with([
            'studentProfile',
            'subjectMastery.subject',
            'topicProgress.topic.quarter.subject',
        ])->get();

        return response()->json([
            'children' => $children,
        ]);
    }

    public function linkChild(Request $request)
    {
        $request->validate(['enrollment_code' => 'required|string']);

        $student = User::where('enrollment_code', $request->enrollment_code)
                       ->where('role', 'student')
                       ->first();

        if (! $student) {
            return response()->json(['message' => 'Invalid enrollment code.'], 404);
        }

        $parent = $request->user();

        if ($parent->children()->where('student_id', $student->id)->exists()) {
            return response()->json(['message' => 'Child already linked.'], 409);
        }

        $parent->children()->attach($student->id);

        return response()->json(['message' => 'Child linked successfully.', 'child' => $student]);
    }

    public function childProgress(Request $request, User $child)
    {
        $this->ensureParentOwnsChild($request->user(), $child);

        return response()->json($child->load([
            'studentProfile',
            'subjectMastery.subject',
            'topicProgress.topic.quarter.subject',
            'practiceAttempts' => fn($q) => $q->latest()->take(10),
        ]));
    }

    public function guidedSessions(Request $request, User $child)
    {
        $this->ensureParentOwnsChild($request->user(), $child);

        $sessions = GuidedSession::whereIn('subject_id', $child->subjectMastery()->pluck('subject_id'))
            ->with(['teacher', 'subject'])
            ->get()
            ->map(function ($session) use ($request, $child) {
                $view = GuidedSessionView::where([
                    'parent_id'         => $request->user()->id,
                    'student_id'        => $child->id,
                    'guided_session_id' => $session->id,
                ])->first();

                return array_merge($session->toArray(), [
                    'view_progress' => $view?->progress_percent ?? 0,
                    'completed'     => $view?->completed ?? false,
                ]);
            });

        return response()->json($sessions);
    }

    public function updateSessionProgress(Request $request, GuidedSession $session)
    {
        $request->validate([
            'student_id'       => 'required|exists:users,id',
            'progress_percent' => 'required|integer|min:0|max:100',
        ]);

        $this->ensureParentOwnsChild($request->user(), User::find($request->student_id));

        GuidedSessionView::updateOrCreate(
            [
                'parent_id'         => $request->user()->id,
                'student_id'        => $request->student_id,
                'guided_session_id' => $session->id,
            ],
            [
                'progress_percent' => $request->progress_percent,
                'completed'        => $request->progress_percent >= 100,
                'last_watched_at'  => now(),
            ]
        );

        return response()->json(['message' => 'Progress updated.']);
    }

    public function courseMaterials(Request $request, User $child)
    {
        $this->ensureParentOwnsChild($request->user(), $child);

        $subjectIds = $child->subjectMastery()->pluck('subject_id');

        $materials = \App\Models\LearningMaterial::whereIn('subject_id', $subjectIds)
            ->with(['subject', 'teacher'])
            ->latest()
            ->get();

        return response()->json($materials);
    }

    private function ensureParentOwnsChild(User $parent, ?User $child): void
    {
        if (! $child || ! $parent->children()->where('student_id', $child->id)->exists()) {
            abort(403, 'Access denied.');
        }
    }
}
