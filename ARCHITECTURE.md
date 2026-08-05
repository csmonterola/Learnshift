# Learnshift Architecture

## Overview

**Learnshift** is an AI-Powered Personalized Learning Platform with a **React 18 + TypeScript frontend** (Vite-bundled SPA), a **Laravel 12 REST API backend** (PHP 8.2+), and **Supabase** (PostgreSQL) as the database and storage layer, with **Mistral AI** for AI-powered features.

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | ^18.3.1 |
| **Build Tool** | Vite | ^5.3.4 |
| **Styling** | Tailwind CSS 3 | ^3.4.6 |
| **Routing** | React Router DOM v6 | ^6.24.0 |
| **Charts** | Recharts | ^2.12.7 |
| **Animations** | Framer Motion | ^11.3.8 |
| **Icons** | Lucide React | ^0.400.0 |
| **HTTP Client** | Axios | ^1.17.0 |
| **Backend** | Laravel 12 (PHP 8.2+) | ^12.0 |
| **Auth** | Laravel Sanctum | Token-based |
| **Database** | PostgreSQL (Supabase) | — |
| **AI Provider** | Mistral AI (MistralProvider) | — |
| **Storage** | S3-compatible (Supabase Storage) | — |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 18 + TypeScript)              │
│  Vite dev server → http://localhost:5173                         │
│                                                                  │
│  ┌──────────────────────────────────────┐                       │
│  │  src/App.tsx                          │                       │
│  │  - AuthProvider wraps everything      │                       │
│  │  - BrowserRouter with role-based      │                       │
│  │    Routes for student/teacher/admin/  │                       │
│  │    parent layouts + pages             │                       │
│  └──────┬───────────────────────────────┘                       │
│         │                                                       │
│  ┌──────▼───────────────────────────────┐                       │
│  │  src/pages/                           │                       │
│  │  ├── login/Landing.tsx  (public)      │                       │
│  │  ├── student/*.tsx      (14 pages)    │                       │
│  │  ├── teacher/*.tsx      (14 pages)    │                       │
│  │  ├── admin/*.tsx        (7 pages)     │                       │
│  │  └── parent/*.tsx       (11 pages)    │                       │
│  └──────┬───────────────────────────────┘                       │
│         │                                                       │
│  ┌──────▼───────────────────────────────┐                       │
│  │  src/components/                      │                       │
│  │  ├── auth/AuthContext.tsx   (useAuth) │                       │
│  │  ├── auth/ProtectedRoute.tsx          │                       │
│  │  ├── layout/StudentLayout.tsx, ...    │                       │
│  │  ├── lesson/ChatPanel, PracticePanel, │                       │
│  │  │       QuizPanel, SourcePanel       │                       │
│  │  └── AIChat.tsx            (global)   │                       │
│  └──────┬───────────────────────────────┘                       │
│         │                                                       │
│  ┌──────▼───────────────────────────────┐                       │
│  │  src/lib/                             │                       │
│  │  ├── api.ts       ← Axios→Laravel    │◄──── PRIMARY HTTP     │
│  │  ├── supabase.ts  ← Axios→Supabase   │◄──── DIRECT DB ACCESS │
│  │  └── supabaseApi.ts  ← Supabase Auth │◄──── LEGACY AUTH      │
│  └──────────────────────────────────────┘                       │
└──────────────────┬──────────────────────────────────────────────┘
                   │  Axios (http://localhost:8000/api/*)
                   │  CSRF Cookie + Bearer Token
┌──────────────────▼──────────────────────────────────────────────┐
│                    BACKEND (Laravel 12 / PHP 8.2+)               │
│  php artisan serve → http://localhost:8000                       │
│                                                                  │
│  backend/routes/api.php (188 lines, ~50 endpoints)              │
│                                                                  │
│  ┌──────────────────────────────────────┐                       │
│  │  Controllers (Api/)                   │                       │
│  │  ├── AuthController.php               │                       │
│  │  ├── Admin/      (3 controllers)      │                       │
│  │  ├── Teacher/    (9 controllers)      │                       │
│  │  ├── Student/    (12 controllers)     │                       │
│  │  ├── ParentPortal/ (2 controllers)    │                       │
│  │  ├── CurriculumController.php         │                       │
│  │  ├── MessageController.php            │                       │
│  │  └── SettingsController.php           │                       │
│  └──────┬────────────────────────────────┘                      │
│         │                                                       │
│  ┌──────▼────────────────────────────────┐                      │
│  │  Models (23 Eloquent models)           │                      │
│  │  ├── User.php                          │                      │
│  │  ├── SchoolClass, Subject, Topic       │                      │
│  │  ├── StudentProfile, StudentProgress   │                      │
│  │  ├── QuizResult, ChatbotLog            │                      │
│  │  ├── LearningMaterial, LessonEmbedding │                      │
│  │  └── ... (23 total)                    │                      │
│  └──────┬────────────────────────────────┘                      │
│         │                                                       │
│  ┌──────▼────────────────────────────────┐                      │
│  │  Services/                             │                      │
│  │  ├── Ai/ (Mistral + Ollama providers)  │                      │
│  │  ├── Rag/ (Embedding, Chunking, RAG)   │                      │
│  │  ├── Quiz/ (Question generation)       │                      │
│  │  ├── Mastery/ (Score calculations)     │                      │
│  │  └── Storage/ (Config validator)       │                      │
│  └──────┬────────────────────────────────┘                      │
│         │                                                       │
│  ┌──────▼────────────────────────────────┐                      │
│  │  Jobs (Background workers)             │                      │
│  │  ├── IngestLearningMaterialJob         │                      │
│  │  └── CaptionAndEmbedImageJob           │                      │
│  └──────────────────────────────────────┘                       │
└──────────────────┬──────────────────────────────────────────────┘
                   │  PostgreSQL (Supabase)
┌──────────────────▼──────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL + Storage)               │
│                                                                  │
│  ┌──────────────────────────────────────┐                       │
│  │  Database (16+ tables)                │                       │
│  │  profiles, subjects, classes,         │                       │
│  │  class_student, quarters, topics,     │                       │
│  │  lessons, lesson_materials,           │                       │
│  │  lesson_links, student_profiles,      │                       │
│  │  student_subject_mastery,             │                       │
│  │  student_topic_progress,              │                       │
│  │  student_lesson_progress,             │                       │
│  │  messages, chatbot_logs,              │                       │
│  │  practice_submissions, quiz_results,  │                       │
│  │  parent_child                         │                       │
│  └──────────────────────────────────────┘                       │
│                                                                  │
│  Row-Level Security (RLS) on all tables                         │
│  Storage bucket: 'learnshift' for file uploads                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
learnshift/
├── src/                              # REACT FRONTEND
│   ├── index.tsx                     # Entry point
│   ├── App.tsx                       # Main app with routing
│   ├── index.css                     # Tailwind + custom styles
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthContext.tsx       # Auth state + login/logout
│   │   │   └── ProtectedRoute.tsx    # Role-based route guard
│   │   ├── layout/
│   │   │   ├── StudentLayout.tsx
│   │   │   ├── TeacherLayout.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── ParentLayout.tsx
│   │   │   ├── StudentSidebar.tsx
│   │   │   ├── TeacherSidebar.tsx
│   │   │   ├── TeacherTopBar.tsx
│   │   │   └── ParentSidebar.tsx
│   │   ├── lesson/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── PracticePanel.tsx
│   │   │   ├── QuizPanel.tsx
│   │   │   ├── SourcePanel.tsx
│   │   │   └── InlineImageRenderer.tsx
│   │   ├── student/
│   │   │   └── ParentLinkRequests.tsx
│   │   ├── parent/
│   │   │   └── LinkChildModal.tsx
│   │   └── ui/
│   │       └── SubjectCard.tsx
│   ├── pages/
│   │   ├── login/Landing.tsx         # Login + Signup page
│   │   ├── student/ (14 pages)
│   │   ├── teacher/ (14 pages)
│   │   ├── admin/   (7 pages)
│   │   └── parent/  (11 pages)
│   └── lib/
│       ├── api.ts                    # Axios client (Laravel Sanctum)
│       ├── supabase.ts               # Supabase REST direct client
│       ├── supabaseApi.ts            # Higher-level Supabase wrapper
│       └── supabaseTypes.ts          # TypeScript interfaces
│
├── backend/                          # LARAVEL BACKEND
│   ├── routes/api.php                # All API routes (188 lines)
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   │   ├── AuthController.php    # Login, logout, me, signup
│   │   │   ├── CurriculumController.php
│   │   │   ├── MessageController.php
│   │   │   ├── SettingsController.php
│   │   │   ├── Admin/     (3 ctrls)
│   │   │   ├── Teacher/   (9 ctrls)
│   │   │   ├── Student/   (12 ctrls)
│   │   │   └── ParentPortal/ (2 ctrls)
│   │   ├── Models/ (23 files)
│   │   ├── Services/
│   │   │   ├── Ai/ (AiProviderInterface, MistralProvider, OllamaCloudProvider)
│   │   │   ├── Rag/ (EmbeddingService, TextChunker, LessonRetriever, ...)
│   │   │   ├── Quiz/ (QuestionGenerator, QuizPromptBuilder)
│   │   │   ├── Mastery/MasteryCalculator.php
│   │   │   └── Storage/StorageConfigurationValidator.php
│   │   ├── Jobs/
│   │   │   ├── IngestLearningMaterialJob.php
│   │   │   └── CaptionAndEmbedImageJob.php
│   │   ├── Observers/LearningMaterialObserver.php
│   │   └── Exceptions/ (EmbeddingException, TextExtractionException)
│   ├── config/
│   │   ├── auth.php, sanctum.php, cors.php
│   │   ├── database.php, filesystems.php
│   │   └── session.php, services.php, ...
│   ├── database/
│   │   └── migrations/ (34 migration files)
│   └── tests/
│
├── database/                         # SQL SCRIPTS
│   ├── schema.sql                    # Complete schema + RLS
│   ├── full_setup.sql
│   └── fix_*.sql (4 files)
│
├── package.json                      # Frontend dependencies
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── index.html                        # Vite HTML entry
```

---

## Frontend Routing (`src/App.tsx`)

All routes are defined in a single `<Routes>` block under `<BrowserRouter>`.

| Route | Layout | Protection | Page Component |
|-------|--------|-----------|----------------|
| `/` | None (public) | None | `Landing` (login) |
| `/student/*` | `StudentLayout` | `allowedRoles=['student']` | 11 nested routes |
| `/teacher/*` | `TeacherLayout` | `allowedRoles=['teacher']` | 10 nested routes |
| `/admin/*` | `AdminLayout` | `allowedRoles=['admin']` | 7 nested routes |
| `/parent/*` | `ParentLayout` | `allowedRoles=['parent']` | 9 nested routes |

A global `<AIChat />` component floats on all authenticated pages (rendered after `<Routes>` in `App.tsx:134`).

### Student Routes (`App.tsx:74-88`)

| Path | Component |
|------|-----------|
| `/student` | `StudentDashboard` |
| `/student/classes` | `StudentClasses` |
| `/student/class/:classId` | `StudentClassPage` |
| `/student/class/:classId/topic/:topicId` | `StudentTopicPage` |
| `/student/class/:classId/topic/:topicId/lesson/:lessonId` | `StudentLessonView` |
| `/student/class/:classId/topic/:topicId/lesson/:lessonId/notebook` | `StudentNotebook` |
| `/student/messages` | `StudentMessages` |
| `/student/skill-tree` | `StudentSkillTree` |
| `/student/practice` | `StudentPractice` |
| `/student/progress` | `StudentProgress` |
| `/student/settings` | `StudentSettings` |

### Teacher Routes (`App.tsx:91-103`)

| Path | Component |
|------|-----------|
| `/teacher` | `TeacherDashboard` |
| `/teacher/classes` | `TeacherClasses` |
| `/teacher/class/:classId` | `TeacherClassDetail` |
| `/teacher/class/:classId/students` | `TeacherClassStudents` |
| `/teacher/messages` | `TeacherMessages` |
| `/teacher/students` | `TeacherStudentProfiles` |
| `/teacher/content` | `TeacherContentManager` |
| `/teacher/ai-logs` | `TeacherAIMonitoring` |
| `/teacher/settings` | `TeacherSettings` |

### Admin Routes (`App.tsx:106-116`)

| Path | Component |
|------|-----------|
| `/admin` | `AdminDashboard` |
| `/admin/activity-logs` | `ActivityLogPage` |
| `/admin/account-generation` | `AdminAccountGeneration` |
| `/admin/directory` | `AdminUserDirectory` |
| `/admin/classes` | `AdminClassManagement` |
| `/admin/classes/:classId` | `AdminClassDetail` |
| `/admin/settings` | `AdminSettings` |

### Parent Routes (`App.tsx:119-130`)

| Path | Component |
|------|-----------|
| `/parent` | `ParentDashboard` |
| `/parent/course-materials` | `ParentCourseMaterials` |
| `/parent/course-materials/:childId/class/:classId/topic/:topicId/lesson/:lessonId` | `ParentLessonView` |
| `/parent/activity` | `ParentStudentActivity` |
| `/parent/activity/quizzes` | `ParentQuizResults` |
| `/parent/activity/mastery` | `ParentLessonMastery` |
| `/parent/activity/ai-interactions` | `ParentAITutorInteractions` |
| `/parent/settings` | `ParentSettings` |

---

## Backend API Routes (`backend/routes/api.php`)

All 50+ endpoints are defined in this single file.

### Public Routes (line 36-37)

```
POST /api/auth/login     → AuthController@login
POST /api/auth/signup    → AuthController@signup (returns 403)
```

### Authenticated Routes (lines 40-188) — middleware: `auth:sanctum`

**Auth** (lines 42-43):
```
POST /api/auth/logout    → AuthController@logout
GET  /api/auth/me        → AuthController@me
```

**Shared** (lines 46-61): Settings, Messages, Curriculum, Skill Tree

**Admin** (lines 64-74): Dashboard, Activity Logs, Users CRUD, Classes CRUD, Enrollment

**Teacher** (lines 77-120): Dashboard, Students, Classes CRUD, Topics CRUD, Lessons CRUD, Materials/Links, Content Manager, AI Logs, Anonymous Questions, Lesson Chat Logs, Class Progress, Contacts

**Student** (lines 123-169): Dashboard, Classes, Topics, Lessons, Practice (generate/submit/history), Diagnostic, Chatbot, Ask Teacher, Lesson Chat, Lesson Practice (AI-generated), Lesson Quiz (AI-generated), Skill Tree, Progress, Parent Link Requests, Contacts

**Parent** (lines 173-186): Dashboard, Search/Link Children, Child Progress, Guided Sessions, Course Materials, Student Activity, Child Classes/Topics/Lessons, Lesson Chat

---

## Complete Login Flow (UI → Database)

```
USER VISITS http://localhost:5173/
  │
  ▼
src/App.tsx:71
  <Route path="/" element={<Landing />} />
  │
  ▼
src/pages/login/Landing.tsx:34-57
  Landing component renders login form
  │
  ▼
USER CLICKS "Log In"
  │
  ▼
src/pages/login/Landing.tsx:59-75
  handleLogin(e):
    1. Prevents default (L60)
    2. Validates non-empty email/password (L61)
    3. Sets isLoading=true, error=null (L63-64)
    4. Calls await login(email.trim(), password) from useAuth() (L67)
    5. On error: displays err.response.data.message (L69-71)
    6. Finally: sets isLoading=false (L72-73)
  │
  ▼
src/components/auth/AuthContext.tsx:53-64
  login(email, password):
    1. Calls authApi.login(email, password) (L54)
     │
     ▼
  src/lib/api.ts:74-75
    authApi.login = (email, password) => api.post('/auth/login', { email, password })
    │
    ▼
  src/lib/api.ts:35-56 — REQUEST INTERCEPTOR
    1. Attaches Bearer token from localStorage('auth_token') (L36-39)
    2. For POST requests: ensures CSRF cookie via GET /sanctum/csrf-cookie (L46-47)
    3. Sets X-XSRF-TOKEN header from cookie (L49-52)
    │
    ▼
  POST http://localhost:8000/api/auth/login
    Body: { email, password }
    │
    ▼
  backend/routes/api.php:36
    Route::post('/auth/login', [AuthController::class, 'login']);
    │
    ▼
  backend/app/Http/Controllers/Api/AuthController.php:16-46
    login(Request):
      1. Validates email (required|email) + password (required|string) (L18-21)
      2. Queries User::where('email', $request->email)->where('is_active', true) (L23-25)
      3. Hash::check($request->password, $user->password) (L27)
      4. If invalid: throws ValidationException ("credentials incorrect") (L28-30)
      5. $user->createToken('auth_token')->plainTextToken (L33)
      6. Creates ActivityLog: action='login' (L35-40)
      7. Returns { user: $user->load('studentProfile'), token: $token } (L42-45)
    │
    ▼
  backend/app/Models/User.php:10-96
    User model with:
    - HasApiTokens (Sanctum), HasFactory, Notifiable traits
    - $casts: password => 'hashed', is_active => 'boolean'
    - Role helpers: isAdmin(), isTeacher(), isStudent(), isParent()
    - Relationships: studentProfile, taughtClasses, enrolledClasses,
      children, parents, topicProgress, subjectMastery, practiceAttempts,
      chatbotLogs, activityLogs, lessonProgress, quizResults
    │
    ▼
  Response JSON: { user: { id, name, role, email, ... }, token: "sanctum-token..." }
    │
    ▼
  src/components/auth/AuthContext.tsx:55-63
    1. Destructures { user: userData, token } from res.data (L55)
    2. localStorage.setItem('auth_token', token) (L56)
    3. setUser({ id, name, role, email, avatar }) (L57-63)
    │
    ▼
  src/pages/login/Landing.tsx:47-57
    useEffect([user]):
      if (user) {
        navigate(roleRedirects[user.role])  // /student, /teacher, /admin, or /parent
      }
    │
    ▼
  src/components/auth/ProtectedRoute.tsx:9-36
    - loading=false, user=exists → renders <Outlet/> (L35)
    - If wrong role → redirects to role-appropriate dashboard (L24-32)
    │
    ▼
  src/App.tsx:74-76 (for student role example)
    <Route element={<ProtectedRoute allowedRoles={['student']} />}>
      <Route element={<StudentLayout />}>
    │
    ▼
  src/components/layout/StudentLayout.tsx:6-31
    - Renders StudentSidebar + <main><Outlet /></main>
    │
    ▼
  src/pages/student/Dashboard.tsx:43-48
    useEffect:
      studentApi.dashboard()
        .then(res => setData(res.data))
    │
    ▼
  src/lib/api.ts:87
    dashboard: () => api.get('/student/dashboard')
    │
    ▼
  backend/routes/api.php:124
    Route::get('dashboard', [StudentDashboardController::class, 'index']);
    │
    ▼
  backend/app/Http/Controllers/Api/Student/DashboardController.php:15-132
    index(Request):
      1. Gets $student = $request->user() (L17)
      2. Loads studentProfile (L21)
      3. Queries enrolled classes with teacher name (L24-70)
      4. Computes per-class: topic count, lesson count, completed/mastered,
         mastery percentage, quiz attempts (L28-69)
      5. Aggregates totals: lessons completed, topics, quiz attempts (L73-85)
      6. Weekly activity count (L88-94)
      7. Subject mastery from student_subject_mastery table (L97-105)
      8. Recent 5 quiz results (L108-118)
      9. Returns JSON response (L120-131)
    │
    ▼
  PostgreSQL (Supabase) — 16+ tables (profiles, classes, class_student,
    topics, lessons, student_lesson_progress, student_topic_progress,
    student_subject_mastery, quiz_results, practice_attempts, ...)
```

---

## Session Restoration (Page Refresh)

```
PAGE REFRESH
  │
  ▼
src/components/auth/AuthContext.tsx:29-51
  useEffect([]):
    1. Reads 'auth_token' from localStorage (L30)
    2. If token exists: calls authApi.me() (L32-33)
     │
     ▼
    src/lib/api.ts:82
      me: () => api.get('/auth/me')
      │
      ▼
    backend/AuthController@me (AuthController.php:59-63)
      $request->user()->load('studentProfile')
      Returns user JSON
      │
      ▼
    3. On success: setUser({ id, name, role, email, avatar }) (L35-42)
    4. On failure (401): localStorage.removeItem('auth_token') (L44-46)
    5. setLoading(false) (L47)
  │
  ▼
ProtectedRoute: user restored → renders protected content
```

---

## Logout Flow

```
USER CLICKS LOGOUT (sidebar)
  │
  ▼
src/components/auth/AuthContext.tsx:79-87
  logout():
    1. Calls authApi.logout() → POST /api/auth/logout (L81)
     │
     ▼
    backend/AuthController@logout (AuthController.php:53-57)
      $request->user()->currentAccessToken()->delete()
      Returns { message: 'Logged out successfully.' }
     │
    2. localStorage.removeItem('auth_token') (L85)
    3. setUser(null) (L86)
  │
  ▼
ProtectedRoute: user=null → <Navigate to="/" /> → Landing page
```

---

## Dual Authentication System

Learnshift has two parallel auth systems:

| System | File | Status | Token Storage |
|--------|------|--------|---------------|
| **Laravel Sanctum** (Primary) | `src/lib/api.ts` → `AuthContext.tsx` | **Active** / used by all components | `localStorage('auth_token')` |
| **Supabase Auth** (Legacy) | `src/lib/supabase.ts` → `lib/supabaseApi.ts` | Present but not used by main auth flow | `localStorage('supabase_token')` |

The main app uses only the Laravel Sanctum path for authentication. The Supabase client (`supabase.ts`) is used for **direct database operations** (select/insert/update against the Supabase REST API with the anon key), bypassing Laravel controllers for certain data access.

---

## Key API Client Endpoints (`src/lib/api.ts`)

### Auth (lines 73-83)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `authApi.login(email, password)` | `POST /auth/login` | Login |
| `authApi.signup(...)` | `POST /auth/signup` | Signup (disabled on backend) |
| `authApi.logout()` | `POST /auth/logout` | Logout |
| `authApi.me()` | `GET /auth/me` | Get current user |

### Student (lines 86-169)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `studentApi.dashboard()` | `GET /student/dashboard` | Dashboard data |
| `studentApi.classes()` | `GET /student/classes` | Enrolled classes |
| `studentApi.classTopics(classId)` | `GET /student/classes/{classId}/topics` | Topics for a class |
| `studentApi.lesson(classId, topicId, lessonId)` | `GET /student/classes/.../lessons/{lessonId}` | Lesson detail |
| `studentApi.generatePracticeQuestions(lessonId)` | `POST /student/lessons/{lessonId}/practice/generate` | AI-generated practice |
| `studentApi.submitPracticeAnswers(...)` | `POST /student/lessons/{lessonId}/practice/submit` | Submit practice |
| `studentApi.generateQuizQuestions(lessonId)` | `POST /student/lessons/{lessonId}/quiz/generate` | AI-generated quiz |
| `studentApi.submitQuizAnswers(...)` | `POST /student/lessons/{lessonId}/quiz/submit` | Submit quiz |
| `studentApi.askLessonChat(lessonId, question)` | `POST /student/lessons/{lessonId}/chat` | RAG lesson chat |
| `studentApi.askChatbot(question)` | `POST /student/chatbot/ask` | General AI tutor |
| `studentApi.getSkillTree(classId)` | `GET /student/classes/{classId}/skill-tree` | Skill tree data |
| `studentApi.getProgress()` | `GET /student/progress` | Progress data |

### Teacher (lines 172-258)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `teacherApi.dashboard()` | `GET /teacher/dashboard` | Dashboard |
| `teacherApi.getMyClasses()` | `GET /teacher/classes` | Own classes |
| `teacherApi.createClass(data)` | `POST /teacher/classes` | Create class |
| `teacherApi.getTopics(classId)` | `GET /teacher/classes/{classId}/topics` | Topics |
| `teacherApi.createLesson(classId, topicId, data)` | `POST /teacher/classes/.../lessons` | Create lesson |
| `teacherApi.uploadMaterial(...)` | `POST /teacher/classes/.../materials` | Upload file |
| `teacherApi.aiLogs()` | `GET /teacher/ai-logs` | AI monitoring |
| `teacherApi.getClassProgress(classId)` | `GET /teacher/classes/{classId}/progress` | Class progress |

### Admin (lines 289-307)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `adminApi.dashboard()` | `GET /admin/dashboard` | Dashboard |
| `adminApi.users(params)` | `GET /admin/users` | User directory |
| `adminApi.createUser(data)` | `POST /admin/users` | Create user |
| `adminApi.bulkUpload(formData)` | `POST /admin/users/upload` | Bulk CSV upload |
| `adminApi.classes(params)` | `GET /admin/classes` | Class management |
| `adminApi.enrollStudents(classId, studentIds)` | `POST /admin/classes/{classId}/enroll` | Enroll students |

### Parent (lines 261-279)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `parentApi.dashboard()` | `GET /parent/dashboard` | Dashboard |
| `parentApi.searchStudents(query)` | `GET /parent/students/search` | Search children |
| `parentApi.linkChild(studentId)` | `POST /parent/link-child` | Link to child |
| `parentApi.childProgress(childId)` | `GET /parent/children/{childId}/progress` | Child progress |
| `parentApi.childClasses(childId)` | `GET /parent/children/{childId}/classes` | Child's classes |

---

## Database Schema (Core Tables)

```
profiles (extends auth.users)
├── id (PK, UUID FK → auth.users)
├── name
├── role (student | teacher | parent | admin)
├── avatar
├── enrollment_code
├── is_active
└── ... (timezone, language, notifications, theme)

subjects
├── id (PK)
├── name
├── code (Math, Science, English, Filipino, AP, MAPEH, TLE, VE)
└── description

classes
├── id (PK)
├── name
├── grade_level
├── section
├── school_year
├── subject
├── teacher_id (FK → users)
└── is_active

class_student (junction)
├── id (PK)
├── class_id (FK → classes)
├── student_id (FK → users)
└── enrolled_at

quarters
├── id (PK)
├── subject_id (FK → subjects)
├── grade_level
├── quarter_number (1-4)
└── title

topics
├── id (PK)
├── quarter_id (FK → quarters)
├── class_id (FK → classes)
├── title
├── description
├── order_index
└── lesson_count

lessons
├── id (PK)
├── topic_id (FK → topics)
├── title
├── content
└── order_index

lesson_materials
├── id (PK)
├── lesson_id (FK → lessons)
├── file_name
├── file_url
├── file_type
└── file_size

lesson_links
├── id (PK)
├── lesson_id (FK → lessons)
├── title
└── url

student_profiles
├── student_id (PK, FK → users)
├── grade_level
├── section
├── total_xp
├── streak_days
├── last_active_date
├── diagnostic_score
└── diagnostic_completed

student_subject_mastery
├── id (PK)
├── student_id (FK → users)
├── subject_id (FK → subjects)
├── mastery_score
└── target_score

student_topic_progress
├── id (PK)
├── student_id (FK → users)
├── topic_id (FK → topics)
├── status (locked | active | completed)
├── mastery_score
└── xp_earned

student_lesson_progress
├── id (PK)
├── student_id (FK → users)
├── lesson_id (FK → lessons)
├── status (not_started | in_progress | completed)
├── mastery_percentage
├── xp_earned
└── completed_at

quiz_results
├── id (PK)
├── student_id (FK → users)
├── lesson_id (FK → lessons)
├── score
├── total_questions
├── correct_answers
└── submitted_at

practice_submissions
├── id (PK)
├── student_id (FK → users)
├── topic_id (FK → topics)
├── score
├── total_questions
└── correct_answers

chatbot_logs
├── id (PK)
├── student_id (FK → users)
├── subject_id (FK → subjects)
├── question
├── response
├── confidence_score
├── status
├── teacher_note
└── teacher_corrected_response

messages
├── id (PK)
├── sender_id (FK → users)
├── receiver_id (FK → users)
├── subject_id
├── content
└── is_read

parent_child
├── id (PK)
├── parent_id (FK → users)
├── child_id (FK → users)
├── enrollment_code
├── link_status
├── linked_at
└── confirmed_at

Additional Laravel-managed tables:
- personal_access_tokens (Sanctum)
- learning_materials (content ingestion pipeline)
- lesson_embeddings (vector embeddings for RAG)
- lesson_chat_logs
- material_images (captioned images)
- activity_logs
- user_preferences
- sessions, cache, jobs, ...
```

---

## AI Services Architecture

### AI Provider Pattern (`backend/app/Services/Ai/`)

```
AiProviderInterface
├── chat(array $messages, array $options): string
├── embed(string $text): array
└── generate(array $prompt, array $options): string
    │
    ├── MistralProvider    (active, uses mistralai/mistral-php-sdk)
    │   - Chat model: open-mistral-nemo (via config)
    │   - Embedding model: mistral-embed
    │
    └── OllamaCloudProvider (fallback, HTTP to Ollama API)
```

Configured in `.env`:
```
AI_PROVIDER_CHAT=mistral
AI_PROVIDER_EMBEDDING=mistral
MISTRAL_API_KEY=...
```

### RAG Pipeline (`backend/app/Services/Rag/`)

```
MaterialIngestionService
  │
  ├── TextExtractor: extracts text from uploaded files (PDF, DOCX, images)
  │
  ├── ImageExtractor: extracts images from PDFs
  │
  ├── TextChunker: splits text into chunks with overlap
  │
  └── EmbeddingService: generates embeddings via Mistral, stores in lesson_embeddings

LessonRetriever
  │
  ├── Receives student question
  ├── Embeds the question
  ├── Cosine-similarity search against lesson_embeddings
  └── Returns top-k relevant chunks

RagPromptBuilder: constructs context + question → prompt for Mistral
```

### Content Ingestion Flow

```
Teacher uploads a file → POST /api/teacher/content
  │
  ▼
TeacherContentController@store
  │
  ▼
Dispatches IngestLearningMaterialJob
  │
  ▼
MaterialIngestionService::ingest()
  ├── TextExtractor::extract(file) → raw text
  ├── ImageExtractor::extract(file) → images
  ├── TextChunker::chunk(text) → text segments
  ├── For each chunk:
  │   ├── EmbeddingService::embed(chunk) → vector
  │   └── Store in lesson_embeddings table
  └── For each image:
      └── CaptionAndEmbedImageJob dispatched
          ├── AiProvider::caption(image) → caption
          └── Store in material_images table
```

### Quiz/Practice Generation

```
QuestionGenerator
  └── QuizPromptBuilder
      └── Constructs subject/grade/cognitive-level-specific prompt
          → Mistral API → parses structured output
```

### Mastery Calculator

```
MasteryCalculator
  ├── Combines: quiz scores, practice scores, lesson progress
  ├── Weighted formula: quizzes (40%), practices (30%), lesson completion (30%)
  └── Updates student_subject_mastery and student_topic_progress
```

---

## Background Jobs

| Job | Trigger | Purpose |
|-----|---------|---------|
| `IngestLearningMaterialJob` | Content upload | Extract text, chunk, embed, store — RAG pipeline |
| `CaptionAndEmbedImageJob` | From ingestion | Caption extracted images via AI, store for RAG |

---

## Row-Level Security (Supabase)

All database tables have RLS enabled with policies for:

- Users viewing/editing own profile
- Teachers viewing student profiles (general and class-enrolled)
- Admins full access
- Students viewing their enrolled classes
- Teachers managing their own classes, topics, lessons, materials
- Parents viewing linked children's data
- Upload/read/delete on `learnshift` storage bucket

---

## CORS Configuration (`backend/config/cors.php`)

```php
'allowed_origins' => [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3000',
    'http://127.0.0.1:5173',
],
'supports_credentials' => true,
```

---

## Key Frontend Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `src/index.tsx` | 1 | React DOM mount |
| `src/App.tsx` | 138 | Route definitions, AuthProvider, AIChat |
| `src/pages/login/Landing.tsx` | 294 | Login + Signup form UI |
| `src/components/auth/AuthContext.tsx` | 102 | Auth state: login, logout, signUp, session restore |
| `src/components/auth/ProtectedRoute.tsx` | 36 | Role-based route guard |
| `src/lib/api.ts` | 314 | Axios client, all API endpoints, interceptors |
| `src/lib/supabase.ts` | 99 | Supabase REST + Auth + Storage clients |
| `src/lib/supabaseApi.ts` | 566 | High-level Supabase auth/data API (legacy) |
| `src/components/layout/StudentLayout.tsx` | 32 | Student layout shell |
| `src/components/layout/TeacherLayout.tsx` | ~35 | Teacher layout shell |
| `src/components/layout/AdminLayout.tsx` | ~35 | Admin layout shell |
| `src/components/layout/ParentLayout.tsx` | ~35 | Parent layout shell |
| `src/pages/student/Dashboard.tsx` | 227 | Student dashboard with classes, stats, progress |
| `src/pages/student/LessonView.tsx` | — | Lesson with chat, practice, quiz, source panels |

## Key Backend Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `backend/routes/api.php` | 188 | All API route definitions |
| `backend/app/Http/Controllers/Api/AuthController.php` | 64 | Login, logout, me, signup |
| `backend/app/Http/Controllers/Api/Student/DashboardController.php` | 133 | Student dashboard data aggregation |
| `backend/app/Http/Controllers/Api/Student/LessonChatController.php` | — | RAG lesson chat (ask method) |
| `backend/app/Http/Controllers/Api/Student/QuizController.php` | — | AI quiz generation + submission |
| `backend/app/Http/Controllers/Api/Student/LessonPracticeController.php` | — | AI practice generation + submission |
| `backend/app/Models/User.php` | 96 | User model with Sanctum, roles, relationships |
| `backend/app/Services/Ai/MistralProvider.php` | — | Mistral AI chat + embedding |
| `backend/app/Services/Rag/MaterialIngestionService.php` | — | Content ingestion pipeline |
| `backend/app/Services/Rag/LessonRetriever.php` | — | RAG retrieval for lesson chat |
| `backend/app/Services/Rag/EmbeddingService.php` | — | Embedding generation + similarity search |
| `backend/app/Services/Quiz/QuestionGenerator.php` | — | AI question generation |
| `backend/app/Services/Mastery/MasteryCalculator.php` | — | Mastery score calculation |
