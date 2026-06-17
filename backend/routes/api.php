<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CurriculumController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\ClassController as AdminClassController;
use App\Http\Controllers\Api\Teacher\DashboardController as TeacherDashboardController;
use App\Http\Controllers\Api\Teacher\StudentController as TeacherStudentController;
use App\Http\Controllers\Api\Teacher\ContentController as TeacherContentController;
use App\Http\Controllers\Api\Teacher\AIMonitoringController;
use App\Http\Controllers\Api\Teacher\LessonChatLogController;
use App\Http\Controllers\Api\Teacher\TopicController as TeacherTopicController;
use App\Http\Controllers\Api\Student\DashboardController as StudentDashboardController;
use App\Http\Controllers\Api\Student\ClassController as StudentClassController;
use App\Http\Controllers\Api\Student\PracticeController;
use App\Http\Controllers\Api\Student\DiagnosticController;
use App\Http\Controllers\Api\Student\ChatbotController;
use App\Http\Controllers\Api\Student\LessonChatController;
use App\Http\Controllers\Api\ParentPortal\DashboardController as ParentDashboardController;
use Illuminate\Support\Facades\Route;

// ── Public ────────────────────────────────────────────────────────
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/signup', [AuthController::class, 'signup']);

// ── Authenticated ─────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);

    // ── Curriculum (shared) ──────────────────────────────────────
    Route::get('/subjects',                               [CurriculumController::class, 'subjects']);
    Route::get('/subjects/{subject}/curriculum',          [CurriculumController::class, 'bySubject']);
    Route::get('/skill-tree',                             [CurriculumController::class, 'skillTree']);

    // ── Admin ────────────────────────────────────────────────────
    Route::prefix('admin')->group(function () {
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
        Route::get('classes/{classId}',                   [TeacherStudentController::class, 'classDetail']);
        Route::get('classes/{classId}/students',          [TeacherStudentController::class, 'classStudents']);
        Route::post('classes/{classId}/students',         [TeacherStudentController::class, 'enrollStudent']);
        Route::delete('classes/{classId}/students/{studentId}', [TeacherStudentController::class, 'removeStudent']);
        Route::get('students/{student}',                  [TeacherStudentController::class, 'show']);

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
        Route::get('ai-logs',                             [AIMonitoringController::class, 'index']);
        Route::patch('ai-logs/{log}/status',              [AIMonitoringController::class, 'updateStatus']);
        Route::get('anonymous-questions',                 [AIMonitoringController::class, 'anonymousQuestions']);
        Route::post('anonymous-questions/{question}/answer', [AIMonitoringController::class, 'answerQuestion']);
        Route::get('lessons/{lesson}/chat-logs',          [LessonChatLogController::class, 'index']);
    });

    // ── Student ──────────────────────────────────────────────────
    Route::prefix('student')->group(function () {
        Route::get('dashboard',                           [StudentDashboardController::class, 'index']);

        // Classes & curriculum
        Route::get('classes',                             [StudentClassController::class, 'index']);
        Route::get('classes/{classId}',                   [StudentClassController::class, 'show']);
        Route::get('classes/{classId}/topics',            [StudentClassController::class, 'topics']);
        Route::get('classes/{classId}/topics/{topicId}',  [StudentClassController::class, 'topic']);
        Route::get('classes/{classId}/topics/{topicId}/lessons/{lessonId}', [StudentClassController::class, 'lesson']);

        Route::get('practice/{topic}/questions',          [PracticeController::class, 'getQuestions']);
        Route::post('practice/submit',                    [PracticeController::class, 'submit']);
        Route::get('practice/history',                    [PracticeController::class, 'history']);
        Route::post('diagnostic/start',                   [DiagnosticController::class, 'start']);
        Route::post('diagnostic/submit',                  [DiagnosticController::class, 'submit']);
        Route::post('chatbot/ask',                        [ChatbotController::class, 'ask']);
        Route::get('chatbot/history',                     [ChatbotController::class, 'history']);
        Route::post('ask-teacher',                        [ChatbotController::class, 'askTeacher']);
        Route::get('ask-teacher/answers',                 [ChatbotController::class, 'myAnonymousAnswers']);
        Route::post('lessons/{lesson}/chat',              [LessonChatController::class, 'ask']);
        Route::get('lessons/{lesson}/chat-logs',          [LessonChatController::class, 'logs']);
    });

    // ── Parent ───────────────────────────────────────────────────
    Route::prefix('parent')->group(function () {
        Route::get('dashboard',                               [ParentDashboardController::class, 'index']);
        Route::post('link-child',                             [ParentDashboardController::class, 'linkChild']);
        Route::get('children/{child}/progress',               [ParentDashboardController::class, 'childProgress']);
        Route::get('children/{child}/guided-sessions',        [ParentDashboardController::class, 'guidedSessions']);
        Route::post('sessions/{session}/progress',            [ParentDashboardController::class, 'updateSessionProgress']);
        Route::get('children/{child}/course-materials',       [ParentDashboardController::class, 'courseMaterials']);
    });
});
