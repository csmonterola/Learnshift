<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\LessonChatLog;
use App\Models\PracticeAttempt;
use App\Models\QuizResult;
use App\Models\SchoolClass;
use App\Models\StudentLessonProgress;
use App\Models\User;
use App\Services\Learning\LearningProfileService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StudentController extends Controller
{
    public function searchStudents(Request $request)
    {
        $request->validate(['search' => 'required|string|min:1']);

        $search = trim($request->search);

        $students = User::where('role', 'student')
            ->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($search) . '%'])
                  ->orWhereRaw('LOWER(email) LIKE ?', ['%' . strtolower($search) . '%']);
            })
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
            ->when($request->search, function ($q) use ($request) {
                $search = trim($request->search);
                $q->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($search) . '%']);
            })
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

    /**
     * GET /api/teacher/students/{student}/learning-profile
     *
     * Read-only learning profile for a single student. Guarded by
     * authorizeStudentOwnership so teachers can only inspect their own
     * students. has_data is always present (false => no traits yet).
     */
    public function learningProfile(Request $request, User $student)
    {
        $this->authorizeStudentOwnership($request, $student);

        $profile = app(LearningProfileService::class)->analyze($student);

        return response()->json($this->teacherPayload($student, $profile, app(LearningProfileService::class)->traitMeta()));
    }

    /**
     * GET /api/teacher/students/learning-profiles?ids=1,2,3
     *
     * Batch learning profiles for the roster. The supplied ids are filtered
     * SERVER-SIDE to the teacher's own students; any id that does not belong
     * to the teacher is silently dropped (never errors the whole batch).
     */
    public function learningProfiles(Request $request)
    {
        $request->validate(['ids' => 'required|string']);

        $ids = collect(explode(',', $request->ids))
            ->map(fn ($id) => trim($id))
            ->filter(fn ($id) => ctype_digit($id))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if (empty($ids)) {
            return response()->json([]);
        }

        $teacher = $request->user();
        $teacherClassIds = $teacher->taughtClasses()->pluck('id');

        // Ownership filter: only students enrolled in this teacher's classes.
        $owned = User::whereIn('id', $ids)
            ->where('role', 'student')
            ->whereHas('enrolledClasses', fn ($q) => $q->whereIn('classes.id', $teacherClassIds))
            ->get();

        $profiles = app(LearningProfileService::class)->analyzeMany($owned);

        // Resolve trait metadata ONCE — it's identical for every student, so
        // hoisting it out of the per-student loop avoids N identical lookups.
        $traitMeta = app(LearningProfileService::class)->traitMeta();

        $out = [];
        foreach ($owned as $student) {
            $out[] = $this->teacherPayload($student, $profiles[(int) $student->id], $traitMeta);
        }

        return response()->json($out);
    }

    /**
     * Shape a profile for teacher-facing responses. has_data is mandatory:
     * false => traits {} and recommended_difficulty null.
     *
     * @param array<string,mixed> $profile
     * @param array<string,mixed> $traitMeta Resolved once by the caller
     */
    private function teacherPayload(User $student, array $profile, array $traitMeta): array
    {
        $hasData = collect($profile['traits'])->contains(fn ($trait) => $trait['source'] !== null);

        return [
            'student_id'            => $student->id,
            'name'                  => $student->name,
            'has_data'              => $hasData,
            'profile'               => $hasData
                ? $profile
                : [
                    'traits'                 => [],
                    'recommended_difficulty' => null,
                    'schema_version'         => $profile['schema_version'],
                    'updated_at'             => $profile['updated_at'],
                ],
            'trait_meta'            => $traitMeta,
        ];
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
        $this->authorizeStudentOwnership($request, $student);

        $student->load([
            'subjectMastery.subject',
            'topicProgress.topic.quarter',
            'lessonProgress.lesson',
            'practiceAttempts' => fn($q) => $q->latest()->take(10),
            'chatbotLogs'      => fn($q) => $q->latest()->take(5),
        ]);

        // The list endpoint computes overall_mastery from student_lesson_progress,
        // but the raw User model doesn't carry that computed value. Recompute it
        // here so the detail page's header and body read the SAME source,
        // and expose lesson progress so the page has real data to show.
        $lessonProgress = $student->lessonProgress ?? collect();
        $totalLessons = $lessonProgress->count();
        $overallMastery = $totalLessons > 0
            ? (int) round($lessonProgress->sum('mastery_percentage') / $totalLessons)
            : 0;

        $data = $student->toArray();
        $data['overall_mastery'] = $overallMastery;
        $data['status'] = $overallMastery >= 80 ? 'Excelling'
            : ($overallMastery >= 70 ? 'On Track' : ($overallMastery > 0 ? 'Developing' : 'Not Started'));
        // Normalize the loaded lesson progress into a camelCase-friendly list
        // that the frontend detail page can render directly.
        $data['lesson_progress'] = $lessonProgress->map(fn ($lp) => [
            'id' => $lp->id,
            'lesson_id' => $lp->lesson_id,
            'lesson_title' => $lp->lesson?->title ?? "Lesson #{$lp->lesson_id}",
            'mastery_percentage' => (int) $lp->mastery_percentage,
            'status' => $lp->status,
        ])->values()->all();

        $data['recent_activity'] = $this->buildActivityFeed($student, [], 20);

        return response()->json($data);
    }

    /**
     * GET /api/teacher/students/{student}/activities
     *
     * Returns the student's full activity feed scoped to the teacher's own
     * classes, with optional type / class / date-range filters.
     */
    public function activities(Request $request, User $student)
    {
        $this->authorizeStudentOwnership($request, $student);

        $validated = $request->validate([
            'type'      => 'sometimes|in:quiz,practice,lesson,chat',
            'class_id'  => 'sometimes|integer',
            'date_from' => 'sometimes|date',
            'date_to'   => 'sometimes|date',
        ]);

        // Restrict the class filter to classes the teacher actually teaches.
        if (isset($validated['class_id'])) {
            $owned = $request->user()->taughtClasses()->whereKey($validated['class_id'])->exists();
            abort_unless($owned, 403, 'You can only filter by your own classes.');
        }

        $activities = $this->buildActivityFeed($student, $validated);

        return response()->json($activities);
    }

    /**
     * Verify the student is enrolled in at least one class taught by the
     * authenticated teacher, so teachers can never inspect other teachers'
     * (or unenrolled) students.
     */
    private function authorizeStudentOwnership(Request $request, User $student): void
    {
        $teacherClassIds = $request->user()->taughtClasses()->pluck('id');

        $belongsToTeacher = $student->enrolledClasses()
            ->whereIn('classes.id', $teacherClassIds)
            ->exists();

        abort_unless($belongsToTeacher, 403, 'You can only view your own students.');
    }

    /**
     * Build a unified activity feed for a student by merging quiz results,
     * practice attempts, lesson progress, and AI chat logs into one
     * time-sorted list, scoped to the teacher's own classes.
     *
     * @param array{type?: string, class_id?: int, date_from?: string, date_to?: string} $filters
     */
    private function buildActivityFeed(User $student, array $filters = [], ?int $limit = null): array
    {
        $activities = [];

        $typeFilter = $filters['type'] ?? null;
        $classId = $filters['class_id'] ?? null;
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;

        // Quizzes — score + correct/total from the quiz result
        if (!$typeFilter || $typeFilter === 'quiz') {
            $query = QuizResult::where('student_id', $student->id)
                ->with('lesson.topic.quarter.subject', 'lesson.topic.schoolClass');
            if ($classId) $query->whereHas('lesson.topic', fn ($q) => $q->where('class_id', $classId));
            if ($dateFrom) $query->whereDate('submitted_at', '>=', $dateFrom);
            if ($dateTo) $query->whereDate('submitted_at', '<=', $dateTo);
            foreach ($query->orderByDesc('submitted_at')->limit(200)->get() as $quiz) {
                $activities[] = [
                    'type'       => 'quiz',
                    'title'      => $quiz->lesson?->title ?? "Lesson #{$quiz->lesson_id}",
                    'subject'    => data_get($quiz->lesson, 'topic.quarter.subject.name') ?? 'Unknown Subject',
                    'class_id'   => data_get($quiz->lesson, 'topic.schoolClass.id'),
                    'class_name' => data_get($quiz->lesson, 'topic.schoolClass.name'),
                    'score'      => (int) $quiz->score,
                    'detail'     => "{$quiz->correct_answers}/{$quiz->total_questions} correct",
                    'timestamp'  => $quiz->submitted_at,
                ];
            }
        }

        // Practice attempts — score + correct/total
        if (!$typeFilter || $typeFilter === 'practice') {
            $query = PracticeAttempt::where('student_id', $student->id)
                ->with('topic.quarter.subject', 'topic.schoolClass');
            if ($classId) $query->whereHas('topic', fn ($q) => $q->where('class_id', $classId));
            if ($dateFrom) $query->whereDate('created_at', '>=', $dateFrom);
            if ($dateTo) $query->whereDate('created_at', '<=', $dateTo);
            foreach ($query->orderByDesc('created_at')->limit(200)->get() as $attempt) {
                $activities[] = [
                    'type'       => 'practice',
                    'title'      => $attempt->topic?->title ?? "Topic #{$attempt->topic_id}",
                    'subject'    => data_get($attempt, 'topic.quarter.subject.name') ?? 'Unknown Subject',
                    'class_id'   => data_get($attempt, 'topic.schoolClass.id'),
                    'class_name' => data_get($attempt, 'topic.schoolClass.name'),
                    'score'      => (int) $attempt->score,
                    'detail'     => "{$attempt->correct_answers}/{$attempt->total_questions} correct",
                    'timestamp'  => $attempt->created_at,
                ];
            }
        }

        // Lesson progress — mastery percentage + status
        if (!$typeFilter || $typeFilter === 'lesson') {
            $query = StudentLessonProgress::where('student_id', $student->id)
                ->with('lesson.topic.quarter.subject', 'lesson.topic.schoolClass');
            if ($classId) $query->whereHas('lesson.topic', fn ($q) => $q->where('class_id', $classId));
            if ($dateFrom) $query->whereDate('updated_at', '>=', $dateFrom);
            if ($dateTo) $query->whereDate('updated_at', '<=', $dateTo);
            foreach ($query->orderByDesc('updated_at')->limit(200)->get() as $lp) {
                $activities[] = [
                    'type'       => 'lesson',
                    'title'      => $lp->lesson?->title ?? "Lesson #{$lp->lesson_id}",
                    'subject'    => data_get($lp->lesson, 'topic.quarter.subject.name') ?? 'Unknown Subject',
                    'class_id'   => data_get($lp->lesson, 'topic.schoolClass.id'),
                    'class_name' => data_get($lp->lesson, 'topic.schoolClass.name'),
                    'score'      => (int) $lp->mastery_percentage,
                    'detail'     => $lp->status === 'completed' ? 'Lesson completed' : 'Lesson in progress',
                    'timestamp'  => $lp->updated_at,
                ];
            }
        }

        // AI chat logs — confidence score + question snippet
        if (!$typeFilter || $typeFilter === 'chat') {
            $query = LessonChatLog::where('student_id', $student->id)
                ->with('lesson.topic.quarter.subject', 'lesson.topic.schoolClass');
            if ($classId) $query->whereHas('lesson.topic', fn ($q) => $q->where('class_id', $classId));
            if ($dateFrom) $query->whereDate('created_at', '>=', $dateFrom);
            if ($dateTo) $query->whereDate('created_at', '<=', $dateTo);
            foreach ($query->orderByDesc('created_at')->limit(200)->get() as $log) {
                $activities[] = [
                    'type'       => 'chat',
                    'title'      => $log->lesson?->title ?? "Lesson #{$log->lesson_id}",
                    'subject'    => data_get($log->lesson, 'topic.quarter.subject.name') ?? 'Unknown Subject',
                    'class_id'   => data_get($log->lesson, 'topic.schoolClass.id'),
                    'class_name' => data_get($log->lesson, 'topic.schoolClass.name'),
                    'score'      => $log->confidence_score,
                    'detail'     => 'AI Tutor · ' . Str::limit($log->question, 60),
                    'timestamp'  => $log->created_at,
                ];
            }
        }

        // Sort by recency (newest first)
        usort($activities, function ($a, $b) {
            $ta = $a['timestamp'] instanceof \DateTimeInterface ? $a['timestamp']->getTimestamp() : strtotime((string) $a['timestamp']);
            $tb = $b['timestamp'] instanceof \DateTimeInterface ? $b['timestamp']->getTimestamp() : strtotime((string) $b['timestamp']);

            return $tb <=> $ta;
        });

        $activities = array_map(fn ($a) => [
            ...$a,
            'timestamp' => $a['timestamp'] instanceof \DateTimeInterface ? $a['timestamp']->toISOString() : (string) $a['timestamp'],
        ], $activities);

        return $limit ? array_slice($activities, 0, $limit) : $activities;
    }
}