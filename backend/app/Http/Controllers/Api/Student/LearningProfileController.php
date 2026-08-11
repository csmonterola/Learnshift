<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Services\Learning\LearningProfileService;
use Illuminate\Http\Request;

class LearningProfileController extends Controller
{
    public function __construct(private LearningProfileService $service)
    {
    }

    /**
     * GET /api/student/learning-profile
     *
     * Returns the student's live learning profile. Traits are derived from
     * behavior on demand and merged with the stored self-report seed, so this
     * is always current.
     */
    public function show(Request $request)
    {
        $profile = $this->service->analyze($request->user());

        return response()->json([
            'profile'              => $profile,
            'needs_quiz'           => $this->needsQuiz($profile),
            'self_report_options'  => $this->service->selfReportOptionCounts(),
            'trait_meta'           => $this->service->traitMeta(),
        ]);
    }

    /**
     * POST /api/student/learning-profile/self-report
     *
     * Persist the student's answers to the onboarding self-report quiz.
     * Expected payload: { answers: { pacing: 0, mastery_habit: 2, ... } } where
     * each value is the option index (0-based) for that trait.
     */
    public function selfReport(Request $request)
    {
        $request->validate(['answers' => 'required|array']);

        $seed = $this->service->saveSelfReport($request->user()->id, $request->answers);

        return response()->json([
            'message'   => 'Learning profile saved',
            'self_report' => $seed,
        ]);
    }

    /**
     * A student needs the onboarding quiz until ALL five traits have a source
     * (behavioral data or a self-report answer). A single populated signal
     * (e.g. only chat count) still leaves the rest unseeded, so the quiz
     * stays on offer to fill the gaps.
     */
    private function needsQuiz(array $profile): bool
    {
        foreach ($profile['traits'] as $trait) {
            if ($trait['source'] === null) {
                return true;
            }
        }

        return false;
    }
}
