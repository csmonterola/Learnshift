<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\SchoolClass;
use Illuminate\Http\Request;

class TeacherClassController extends Controller
{
    /**
     * GET /api/teacher/classes
     * List all classes taught by the authenticated teacher.
     */
    public function index(Request $request)
    {
        $teacher = $request->user();

        $classes = SchoolClass::where('teacher_id', $teacher->id)
            ->where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($classes);
    }

    /**
     * POST /api/teacher/classes
     * Create a new class.
     */
    public function store(Request $request)
    {
        $teacher = $request->user();

        $request->validate([
            'name'        => 'required|string|max:255',
            'grade_level' => 'required|string|max:50',
            'section'     => 'required|string|max:50',
            'school_year' => 'required|string|max:20',
            'subject'     => 'required|string|max:255',
        ]);

        $class = SchoolClass::create([
            'name'        => $request->name,
            'grade_level' => $request->grade_level,
            'section'     => $request->section,
            'school_year' => $request->school_year,
            'subject'     => $request->subject,
            'teacher_id'  => $teacher->id,
            'is_active'   => true,
        ]);

        ActivityLog::create([
            'user_id'     => $teacher->id,
            'action'      => 'class_created',
            'description' => "Teacher {$teacher->name} created class {$class->name}",
        ]);

        return response()->json($class, 201);
    }

    /**
     * DELETE /api/teacher/classes/{classId}
     * Delete a class (must belong to the teacher).
     */
    public function destroy(Request $request, int $classId)
    {
        $teacher = $request->user();

        $class = SchoolClass::where('id', $classId)
            ->where('teacher_id', $teacher->id)
            ->firstOrFail();

        $class->update(['is_active' => false]);
        return response()->json(['message' => 'Class deleted.']);
    }
}