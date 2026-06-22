<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ParentLinkController extends Controller
{
    /**
     * Get all pending parent link requests for the authenticated student.
     */
    public function pendingRequests(Request $request)
    {
        $student = $request->user();

        $pendingParents = $student->parents()
            ->wherePivot('link_status', 'pending')
            ->get(['users.id', 'users.name', 'users.email']);

        return response()->json($pendingParents);
    }

    /**
     * Student approves a parent link request.
     */
    public function approveLink(Request $request, User $parent)
    {
        $student = $request->user();

        $pivot = $student->parents()
            ->wherePivot('link_status', 'pending')
            ->where('users.id', $parent->id)
            ->first();

        if (! $pivot) {
            return response()->json(['message' => 'No pending link request from this parent.'], 404);
        }

        $student->parents()->updateExistingPivot($parent->id, [
            'link_status'  => 'confirmed',
            'confirmed_at' => now(),
        ]);

        return response()->json(['message' => 'Parent link confirmed successfully.']);
    }

    /**
     * Student rejects a parent link request.
     */
    public function rejectLink(Request $request, User $parent)
    {
        $student = $request->user();

        $pivot = $student->parents()
            ->wherePivot('link_status', 'pending')
            ->where('users.id', $parent->id)
            ->first();

        if (! $pivot) {
            return response()->json(['message' => 'No pending link request from this parent.'], 404);
        }

        $student->parents()->updateExistingPivot($parent->id, [
            'link_status'  => 'rejected',
            'confirmed_at' => null,
        ]);

        return response()->json(['message' => 'Parent link rejected.']);
    }
}