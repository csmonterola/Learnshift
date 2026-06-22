<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\SchoolClass;
use App\Models\User;
use App\Models\StudentLessonProgress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    /**
     * GET /api/teacher/students
     *
     * Returns all students enrolled in classes taught by the current teacher.
     * Each student includes:
     *  - class info (grade_level, section, class_name) from the class they're enrolled in
     *  - overall_mastery calculated from actual StudentLessonProgress
     *  - status based on mastery score
     */
    public function index(Request $request)
    {
        $teacher = $request->user();

        // Get the teacher's class IDs
        $teacherClassIds = $teacher->taughtClasses()->pluck('id');

        // Get students enrolled in those classes, with class info
        $students = User::where('role', 'student')
            ->whereHas('enrolledClasses', fn($q) => $q->whereIn('classes.id', $teacherClassIds))
            ->when($request->search, fn($q) => $q->where('name', 'like', '%' . $request->search . '%'))
            ->get()
            ->map(function ($student) use ($teacherClassIds) {
                // Get the classes this student is enrolled in that belong to this teacher
                $studentClasses = $student->enrolledClasses()
                    ->whereIn('classes.id', $teacherClassIds)
                    ->get();

                // Extract grade_level and section from the first matching class
                $gradeLevel = null;
                $section = null;
                $className = null;
                $studentClassId = null;

                if ($studentClasses->isNotEmpty()) {
                    $firstClass = $studentClasses->first();
                    $gradeLevel = $firstClass->grade_level;
                    $section = $firstClass->section;
                    $className = $firstClass->name;
                    $studentClassId = $firstClass->id;
                }

                // If no class found, fall back to student profile
                if (!$gradeLevel) {
                    $profile = $student->studentProfile;
                    $gradeLevel = $profile?->grade_level;
                    $section = $profile?->section;
                }

                // Calculate overall mastery from actual lesson progress
                // across all lessons in the teacher's classes this student is enrolled in
                $overallMastery = 0;
                if ($studentClassId) {
                    $lessonIds = DB::table('lessons')
                        ->join('topics', 'lessons.topic_id', '=', 'topics.id')
                        ->where('topics.class_id', $studentClassId)
                        ->pluck('lessons.id');

                    $totalLessons = $lessonIds->count();

                    if ($totalLessons > 0) {
                        $masterySum = StudentLessonProgress::where('student_id', $student->id)
                            ->whereIn('lesson_id', $lessonIds)
                            ->sum('mastery_percentage');

                        $overallMastery = (int) round($masterySum / $totalLessons);
                    }
                }

                $score = $overallMastery;

                return [
                    'id'                 => $student->id,
                    'name'               => $student->name,
                    'email'              => $student->email,
                    'avatar'             => $student->avatar,
                    'enrollment_code'    => $student->enrollment_code,
                    'is_active'          => $student->is_active,
                    'grade_level'        => $gradeLevel,
                    'section'            => $section,
                    'class_name'         => $className,
                    'overall_mastery'    => $overallMastery,
                    'status'             => $score >= 80 ? 'Excelling' : ($score >= 70 ? 'On Track' : ($score > 0 ? 'Developing' : 'Not Started')),
                ];
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

        DB::table('class_student')->insertOrIgnore([
            'class_id' => $classId,
            'student_id' => $request->student_id,
            'enrolled_at' => now(),
        ]);

        $student = User::find($request->student_id);
        if ($student) {
            ActivityLog::create([
                'user_id'     => $teacher->id,
                'action'      => 'student_enrolled',
                'description' => "Student {$student->name} enrolled in class {$class->name}",
            ]);
        }

        return response()->json(['message' => 'Student enrolled successfully']);
    }

    public function removeStudent(Request $request, $classId, $studentId)
    {
        $teacher = $request->user();

        $class = SchoolClass::where('id', $classId)
            ->where('teacher_id', $teacher->id)
            ->firstOrFail();

        DB::table('class_student')
            ->where('class_id', $classId)
            ->where('student_id', $studentId)
            ->delete();

        return response()->json(['message' => 'Student removed successfully']);
    }

    public function show(Request $request, User $student)
    {
        return response()->json(
            $student->load([
                'subjectMastery.subject',
                'topicProgress.topic.quarter',
                'practiceAttempts' => fn($q) => $q->latest()->take(10),
                'chatbotLogs'      => fn($q) => $q->latest()->take(5),
            ])
        );
    }
}