<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SchoolClass;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    /**
     * GET /api/student/contacts
     * Returns teachers from classes the student is enrolled in.
     */
    public function teachers(Request $request)
    {
        $student = $request->user();

        $teachers = User::where('role', 'teacher')
            ->whereHas('taughtClasses.students', fn($q) => $q->where('users.id', $student->id))
            ->select('id', 'name', 'email', 'avatar', 'role')
            ->get();

        return response()->json($teachers);
    }
}