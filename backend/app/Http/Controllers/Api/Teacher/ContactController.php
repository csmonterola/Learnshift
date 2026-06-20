<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SchoolClass;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    /**
     * GET /api/teacher/contacts
     * Returns students from teacher's classes + all teachers.
     */
    public function index(Request $request)
    {
        $teacher = $request->user();

        // Students from teacher's classes
        $students = User::where('role', 'student')
            ->whereHas('enrolledClasses', fn($q) => $q->where('classes.teacher_id', $teacher->id))
            ->select('id', 'name', 'email', 'avatar', 'role')
            ->get();

        // All teachers (excluding self)
        $teachers = User::where('role', 'teacher')
            ->where('id', '!=', $teacher->id)
            ->select('id', 'name', 'email', 'avatar', 'role')
            ->get();

        return response()->json([
            'students' => $students,
            'teachers' => $teachers,
        ]);
    }
}