<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Http\Request;

class ClassController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            SchoolClass::with(['teacher', 'subject'])
                ->when($request->search, fn($q) => $q->where('name', 'like', '%' . $request->search . '%'))
                ->paginate(20)
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'        => 'required|string',
            'grade_level' => 'required|string',
            'section'     => 'required|string',
            'teacher_id'  => 'required|exists:users,id',
            'subject_id'  => 'required|exists:subjects,id',
        ]);

        $class = SchoolClass::create($request->validated());
        return response()->json($class->load(['teacher', 'subject']), 201);
    }

    public function show(SchoolClass $class)
    {
        return response()->json($class->load(['teacher', 'subject', 'students']));
    }

    public function update(Request $request, SchoolClass $class)
    {
        $class->update($request->only(['name', 'grade_level', 'section', 'is_active']));
        return response()->json($class->load(['teacher', 'subject']));
    }

    public function destroy(SchoolClass $class)
    {
        $class->delete();
        return response()->json(['message' => 'Class deleted.']);
    }

    public function enrollStudents(Request $request, SchoolClass $class)
    {
        $request->validate([
            'student_ids'   => 'required|array',
            'student_ids.*' => 'exists:users,id',
        ]);

        $class->students()->syncWithoutDetaching($request->student_ids);

        // Log enrollment for each student
        foreach ($request->student_ids as $studentId) {
            $student = User::find($studentId);
            if ($student) {
                ActivityLog::create([
                    'user_id'     => $request->user()->id,
                    'action'      => 'student_enrolled',
                    'description' => "Student {$student->name} enrolled in class {$class->name}",
                ]);
            }
        }

        return response()->json(['message' => 'Students enrolled.']);
    }

    public function removeStudent(SchoolClass $class, $studentId)
    {
        $class->students()->detach($studentId);
        return response()->json(['message' => 'Student removed.']);
    }
}