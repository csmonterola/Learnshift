<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quarter;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\StudentTopicProgress;
use Illuminate\Http\Request;

class CurriculumController extends Controller
{
    public function subjects()
    {
        return response()->json(Subject::all());
    }

    /**
     * Get curriculum (quarters + topics) for a subject and grade,
     * enriched with student's progress if the requester is a student.
     */
    public function bySubject(Request $request, Subject $subject)
    {
        $request->validate(['grade_level' => 'required|string']);

        $quarters = Quarter::where('subject_id', $subject->id)
            ->where('grade_level', $request->grade_level)
            ->with(['topics' => fn($q) => $q->orderBy('order')])
            ->orderBy('quarter_number')
            ->get();

        // If student, attach progress status
        if ($request->user()?->isStudent()) {
            $studentId    = $request->user()->id;
            $progressMap  = StudentTopicProgress::where('student_id', $studentId)
                ->pluck('status', 'topic_id');

            $quarters->each(function ($quarter) use ($progressMap) {
                $quarter->topics->each(function ($topic) use ($progressMap) {
                    $topic->progress_status = $progressMap[$topic->id] ?? 'locked';
                });
            });
        }

        return response()->json($quarters);
    }

    public function skillTree(Request $request)
    {
        $request->validate([
            'subject_id'  => 'required|exists:subjects,id',
            'grade_level' => 'required|string',
        ]);

        $quarters = Quarter::where('subject_id', $request->subject_id)
            ->where('grade_level', $request->grade_level)
            ->with('topics')
            ->orderBy('quarter_number')
            ->get();

        $studentId   = $request->user()->id;
        $progressMap = StudentTopicProgress::where('student_id', $studentId)
            ->get()
            ->keyBy('topic_id');

        $tree = $quarters->map(fn($q) => [
            'quarter'   => "Q{$q->quarter_number}",
            'topics'    => $q->topics->map(fn($t) => [
                'id'       => $t->id,
                'title'    => $t->title,
                'status'   => $progressMap[$t->id]?->status ?? 'locked',
                'mastery'  => $progressMap[$t->id]?->mastery_score ?? 0,
                'xp'       => $progressMap[$t->id]?->xp_earned ?? 0,
            ]),
        ]);

        return response()->json($tree);
    }
}
