<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CurriculumController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\ClassController as AdminClassController;
use App\Http\Controllers\Api\Teacher\DashboardController as TeacherDashboardController;
use App\Http\Controllers\Api\Teacher\StudentController as TeacherStudentController;
use App\Http\Controllers\Api\Teacher\ContentController as TeacherContentController;
use App\Http\Controllers\Api\Teacher\AIMonitoringController;
use App\Http\Controllers\Api\Teacher\LessonChatLogController;
use App\Http\Controllers\Api\Teacher\TopicController as TeacherTopicController;
use App\Http\Controllers\Api\Teacher\TeacherClassController;
use App\Http\Controllers\Api\Student\DashboardController as StudentDashboardController;
use App\Http\Controllers\Api\Student\ClassController as StudentClassController;
use App\Http\Controllers\Api\Student\PracticeController;
use App\Http\Controllers\Api\Student\DiagnosticController;
use App\Http\Controllers\Api\Student\ChatbotController;
use App\Http\Controllers\Api\Student\LessonChatController;
use App\Http\Controllers\Api\Student\QuizController;
use App\Http\Controllers\Api\Student\LessonPracticeController;
use App\Http\Controllers\Api\Student\ProgressController as StudentProgressController;
use App\Http\Controllers\Api\Student\SkillTreeController as StudentSkillTreeController;
use App\Http\Controllers\Api\Student\ContactController as StudentContactController;
use App\Http\Controllers\Api\Student\ParentLinkController;
use App\Http\Controllers\Api\Teacher\ContactController as TeacherContactController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\Teacher\ClassProgressController;
use App\Http\Controllers\Api\ParentPortal\DashboardController as ParentDashboardController;
use Illuminate\Support\Facades\Route;

// ── Public ────────────────────────────────────────────────────────
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/signup', [AuthController::class, 'signup']);

// ── Authenticated ─────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);

    // ── Settings (shared) ─────────────────────────────────────────
    Route::get('settings',              [SettingsController::class, 'show']);
    Route::put('settings/profile',      [SettingsController::class, 'updateProfile']);
    Route::put('settings/password',     [SettingsController::class, 'updatePassword']);
    Route::put('settings/preferences',  [SettingsController::class, 'updatePreferences']);
    Route::delete('settings/account',   [SettingsController::class, 'destroy']);

    // ── Messages (shared) ────────────────────────────────────────
    Route::get('messages/conversations',              [MessageController::class, 'conversations']);
    Route::get('messages/{userId}',                   [MessageController::class, 'getMessages']);
    Route::post('messages',                           [MessageController::class, 'send']);
    Route::get('messages/unread-count',               [MessageController::class, 'unreadCount']);

    // ── Curriculum (shared) ──────────────────────────────────────
    Route::get('/subjects',                               [CurriculumController::class, 'subjects']);
    Route::get('/subjects/{subject}/curriculum',          [CurriculumController::class, 'bySubject']);
    Route::get('/skill-tree',                             [CurriculumController::class, 'skillTree']);

    // ── Admin ────────────────────────────────────────────────────
    Route::prefix('admin')->group(function () {
        Route::get('dashboard',       [AdminDashboardController::class, 'index']);
        Route::get('activity-logs',   [AdminDashboardController::class, 'activityLogs']);
        Route::apiResource('users',   AdminUserController::class);
        Route::post('users/bulk',     [AdminUserController::class, 'bulkCreate']);
        Route::apiResource('classes', AdminClassController::class);
        Route::post('classes/{class}/enroll',           [AdminClassController::class, 'enrollStudents']);
        Route::delete('classes/{class}/students/{studentId}', [AdminClassController::class, 'removeStudent']);
    });

    // ── Teacher ──────────────────────────────────────────────────
    Route::prefix('teacher')->group(function () {
        Route::get('dashboard',                           [TeacherDashboardController::class, 'index']);
        Route::get('students/search',                     [TeacherStudentController::class, 'searchStudents']);
        Route::get('students',                            [TeacherStudentController::class, 'index']);
        Route::get('students/{student}',                  [TeacherStudentController::class, 'show']);

        // Teacher Class Management (exact matches before parameterized)
        Route::get('classes',                             [TeacherClassController::class, 'index']);
        Route::post('classes',                            [TeacherClassController::class, 'store']);
        Route::get('classes/{classId}',                   [TeacherStudentController::class, 'classDetail']);
        Route::get('classes/{classId}/students',          [TeacherStudentController::class, 'classStudents']);
        Route::post('classes/{classId}/students',         [TeacherStudentController::class, 'enrollStudent']);
        Route::delete('classes/{classId}/students/{studentId}', [TeacherStudentController::class, 'removeStudent']);
        Route::delete('classes/{classId}',                [TeacherClassController::class, 'destroy']);

        // Topics & Lessons
        Route::get('classes/{classId}/topics',                                                    [TeacherTopicController::class, 'indexTopics']);
        Route::post('classes/{classId}/topics',                                                   [TeacherTopicController::class, 'storeTopic']);
        Route::patch('classes/{classId}/topics/{topicId}',                                        [TeacherTopicController::class, 'updateTopic']);
        Route::delete('classes/{classId}/topics/{topicId}',                                       [TeacherTopicController::class, 'destroyTopic']);
        Route::post('classes/{classId}/topics/{topicId}/lessons',                                 [TeacherTopicController::class, 'storeLessonForTopic']);
        Route::delete('classes/{classId}/topics/{topicId}/lessons/{lessonId}',                    [TeacherTopicController::class, 'destroyLesson']);
        Route::get('classes/{classId}/topics/{topicId}/lessons/{lessonId}/materials',             [TeacherTopicController::class, 'lessonMaterials']);
        Route::post('classes/{classId}/topics/{topicId}/lessons/{lessonId}/materials',            [TeacherTopicController::class, 'storeMaterial']);
        Route::delete('classes/{classId}/topics/{topicId}/lessons/{lessonId}/materials/{materialId}', [TeacherTopicController::class, 'destroyMaterial']);
        Route::post('classes/{classId}/topics/{topicId}/lessons/{lessonId}/links',                [TeacherTopicController::class, 'storeLink']);
        Route::apiResource('content', TeacherContentController::class)->except(['show']);
        Route::post('content/{material}/reprocess', [TeacherContentController::class, 'reprocess']);
        Route::get('content/lessons', [TeacherContentController::class, 'lessons']);
        Route::get('ai-logs',                             [AIMonitoringController::class, 'index']);
        Route::get('ai-logs/stats',                       [AIMonitoringController::class, 'stats']);
        Route::patch('ai-logs/{log}/status',              [AIMonitoringController::class, 'updateStatus']);
        Route::get('anonymous-questions',                 [AIMonitoringController::class, 'anonymousQuestions']);
        Route::post('anonymous-questions/{question}/answer', [AIMonitoringController::class, 'answerQuestion']);
        Route::get('lessons/{lesson}/chat-logs',          [LessonChatLogController::class, 'index']);

        // Class Progress Monitoring
        Route::get('classes/{classId}/progress',          [ClassProgressController::class, 'index']);
        Route::get('classes/{classId}/progress/topics/{topicId}', [ClassProgressController::class, 'topicDetail']);

        // Contacts
        Route::get('contacts',                            [TeacherContactController::class, 'index']);
    });

    // ── Student ──────────────────────────────────────────────────
    Route::prefix('student')->group(function () {
        Route::get('dashboard',                           [StudentDashboardController::class, 'index']);

        // Parent link requests
        Route::get('parent-requests',                     [ParentLinkController::class, 'pendingRequests']);
        Route::post('parent-requests/{parent}/approve',   [ParentLinkController::class, 'approveLink']);
        Route::post('parent-requests/{parent}/reject',    [ParentLinkController::class, 'rejectLink']);

        // Contacts
        Route::get('contacts/teachers',                   [StudentContactController::class, 'teachers']);

        // Classes & curriculum
        Route::get('classes',                             [StudentClassController::class, 'index']);
        Route::get('classes/{classId}',                   [StudentClassController::class, 'show']);
        Route::get('classes/{classId}/topics',            [StudentClassController::class, 'topics']);
        Route::get('classes/{classId}/topics/{topicId}',  [StudentClassController::class, 'topic']);
        Route::get('classes/{classId}/topics/{topicId}/lessons/{lessonId}', [StudentClassController::class, 'lesson']);

        Route::get('practice/classes',                    [PracticeController::class, 'classes']);
        Route::post('practice/generate',                  [PracticeController::class, 'generate']);
        Route::post('practice/submit',                    [PracticeController::class, 'submit']);
        Route::get('practice/history',                    [PracticeController::class, 'history']);
        Route::get('practice/{topic}/questions',          [PracticeController::class, 'getQuestions']);
        Route::post('diagnostic/start',                   [DiagnosticController::class, 'start']);
        Route::post('diagnostic/submit',                  [DiagnosticController::class, 'submit']);
        Route::post('chatbot/ask',                        [ChatbotController::class, 'ask']);
        Route::get('chatbot/history',                     [ChatbotController::class, 'history']);
        Route::post('ask-teacher',                        [ChatbotController::class, 'askTeacher']);
        Route::get('ask-teacher/answers',                 [ChatbotController::class, 'myAnonymousAnswers']);
        Route::post('lessons/{lesson}/chat',              [LessonChatController::class, 'ask']);
        Route::get('lessons/{lesson}/chat-logs',          [LessonChatController::class, 'logs']);

        // Lesson Practice (AI-generated, NOT saved)
        Route::post('lessons/{lesson}/practice/generate', [LessonPracticeController::class, 'generate']);
        Route::post('lessons/{lesson}/practice/submit',   [LessonPracticeController::class, 'submit']);

        // Lesson Quiz (AI-generated, saved, max 3 attempts)
        Route::post('lessons/{lesson}/quiz/generate',     [QuizController::class, 'generate']);
        Route::post('lessons/{lesson}/quiz/submit',       [QuizController::class, 'submit']);
        Route::get('lessons/{lesson}/quiz/history',       [QuizController::class, 'history']);

        // Skill Tree
        Route::get('classes/{classId}/skill-tree',        [StudentSkillTreeController::class, 'index']);

        // Progress
        Route::get('progress',                            [StudentProgressController::class, 'index']);
    });

    // ── Parent ───────────────────────────────────────────────────
    Route::prefix('parent')->group(function () {
        Route::get('dashboard',                               [ParentDashboardController::class, 'index']);
        Route::get('students/search',                         [ParentDashboardController::class, 'searchStudents']);
        Route::post('link-child',                             [ParentDashboardController::class, 'linkChild']);
        Route::get('children/{child}/progress',               [ParentDashboardController::class, 'childProgress']);
        Route::get('children/{child}/guided-sessions',        [ParentDashboardController::class, 'guidedSessions']);
        Route::post('sessions/{session}/progress',            [ParentDashboardController::class, 'updateSessionProgress']);
        Route::get('children/{child}/course-materials',       [ParentDashboardController::class, 'courseMaterials']);
    });
});
