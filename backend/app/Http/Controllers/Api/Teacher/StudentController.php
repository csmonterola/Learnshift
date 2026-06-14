<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function searchStudents(Request $request)
    {
        $request->validate(['search' => 'required|string|min:2']);

        $students = User::where('role', 'student')
            ->where('name', 'like', '%' . $request->search . '%')
            ->select('id', 'name', 'email', 'role', 'avatar', 'enrollment_code', 'is_active')
            ->limit(20)
            ->get();

        return response()->json($students);
    }

    public function index(Request $request)
    {
        $teacher = $request->user();

        $classIds = $teacher->taughtClasses()->pluck('id');

        $students = User::whereHas('enrolledClasses', fn($q) => $q->whereIn('classes.id', $classIds))
            ->with(['studentProfile', 'subjectMastery.subject', 'topicProgress.topic'])
            ->when($request->search, fn($q) => $q->where('name', 'like', '%' . $request->search . '%'))
            ->get()
            ->map(function ($student) {
                $profile  = $student->studentProfile;
                $mastery  = $student->subjectMastery->avg('mastery_score') ?? 0;
                $score    = $profile?->diagnostic_score ?? $mastery;

                return array_merge($student->toArray(), [
                    'overall_mastery' => round($mastery, 1),
                    'status'          => $score >= 80 ? 'Excelling' : ($score >= 70 ? 'On Track' : 'At Risk'),
                ]);
            });

        return response()->json($students);
    }

    public function classStudents(Request $request, $classId)
    {
        $teacher = $request->user();

        $class = SchoolClass::where('id', $classId)
            ->where('teacher_id', $teacher->id)
            ->firstOrFail();

        $students = $class->students()
            ->select('users.id', 'users.name', 'users.email', 'users.role', 'users.avatar', 'users.enrollment_code', 'users.is_active')
            ->get();

        return response()->json($students);
    }

    public function classDetail(Request $request, $classId)
    {
        $teacher = $request->user();

        $class = SchoolClass::where('id', $classId)
            ->where('teacher_id', $teacher->id)
            ->firstOrFail();

        return response()->json($class);
    }

    public function enrollStudent(Request $request, $classId)
    {
        $teacher = $request->user();

        $class = SchoolClass::where('id', $classId)
            ->where('teacher_id', $teacher->id)
            ->firstOrFail();

        $request->validate(['student_id' => 'required|integer|exists:users,id']);

        // Use DB query directly for consistency with classStudents
        \DB::table('class_student')->insertOrIgnore([
            'class_id' => $classId,
            'student_id' => $request->student_id,
            'enrolled_at' => now(),
        ]);

        return response()->json(['message' => 'Student enrolled successfully']);
    }

    public function removeStudent(Request $request, $classId, $studentId)
    {
        $teacher = $request->user();

        $class = SchoolClass::where('id', $classId)
            ->where('teacher_id', $teacher->id)
            ->firstOrFail();

        \DB::table('class_student')
            ->where('class_id', $classId)
            ->where('student_id', $studentId)
            ->delete();

        return response()->json(['message' => 'Student removed successfully']);
    }

    public function show(Request $request, User $student)
    {
        return response()->json(
            $student->load([
                'studentProfile',
                'subjectMastery.subject',
                'topicProgress.topic.quarter',
                'practiceAttempts' => fn($q) => $q->latest()->take(10),
                'chatbotLogs'      => fn($q) => $q->latest()->take(5),
            ])
        );
    }
}
