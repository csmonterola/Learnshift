# Requirements Document

## Introduction

This document captures the full system-hardening and cleanup requirements for LearnShift arising from a comprehensive codebase audit. The audit identified 22 issues across three priority tiers: Critical (security vulnerabilities that can lead to credential exposure, privilege escalation, or data breach), High (correctness defects causing broken functionality or data integrity drift), and Medium (quality debt that reduces maintainability and deployability). Every requirement must be addressed before the system is considered production-ready.

## Glossary

- **LearnShift**: The full-stack educational platform comprising a Laravel/PHP REST API backend and a React/TypeScript frontend.
- **API**: The Laravel backend REST API, served at `/api/*`.
- **Frontend**: The React/TypeScript single-page application.
- **Admin**: A user with `role = admin`. There is exactly one admin account at any time.
- **Teacher**: A user with `role = teacher`.
- **Student**: A user with `role = student`.
- **Parent**: A user with `role = parent`.
- **Sanctum**: Laravel Sanctum, the token-based authentication system used by the API.
- **RLS**: Row-Level Security — Supabase's database-level access control policy layer.
- **Service_Role_Key**: The Supabase service role JWT that bypasses all RLS policies and has unrestricted database access.
- **Anon_Key**: The Supabase anonymous JWT for client-side, RLS-filtered access.
- **EmbeddingService**: The `App\Services\Rag\EmbeddingService` class that calls the Mistral AI embeddings API.
- **ContentController**: `App\Http\Controllers\Api\Teacher\ContentController`, which handles legacy content upload and reprocessing.
- **TopicController**: `App\Http\Controllers\Api\Teacher\TopicController`, which handles topic, lesson, and material management.
- **IngestLearningMaterialJob**: The queued job `App\Jobs\IngestLearningMaterialJob` that runs the RAG ingestion pipeline.
- **MasteryCalculator**: The `App\Services\Mastery\MasteryCalculator` service responsible for computing lesson and topic mastery.
- **QuizController**: `App\Http\Controllers\Api\Student\QuizController`, which handles quiz generation, submission, and history.
- **EnrollmentGuard**: A shared, reusable PHP trait or helper that verifies a student is enrolled in the class that owns a given lesson.
- **Role_Middleware**: A Laravel middleware that enforces role membership on protected route groups.
- **Config_Service**: Any PHP class or configuration file that reads runtime values from environment variables rather than hardcoding them.
- **Credential_Store**: The `.env` file (backend) and `.env` / environment injection mechanism (frontend) used to hold secrets at runtime.
- **Dead_Code**: Source files or modules that are never imported, routed to, or executed in any active code path.
- **CORS**: Cross-Origin Resource Sharing HTTP headers that control which origins may call the API.

---

## Requirements

---

### Requirement 1: Rotate and Purge Exposed Credentials

**User Story:** As a system administrator, I want all leaked credentials removed from the repository and rotated at their respective services, so that no attacker who has ever cloned the repository can use those credentials to access production systems.

#### Acceptance Criteria

1. THE Admin SHALL rotate the Supabase database password, Supabase anon key, Supabase service role key, Mistral AI API key, AWS Access Key, and AWS Secret Access Key before any other hardening work proceeds.
2. WHEN the repository history is rewritten, THE Admin SHALL use an interactive history-rewriting tool (e.g., `git filter-repo`) to remove `passwords.txt` from every commit in the git history.
3. THE Credential_Store SHALL be the sole location where all service credentials are stored; no credential value SHALL appear as a string literal anywhere in committed source code.
4. WHEN `passwords.txt` is deleted, THE Admin SHALL also remove the junk files `cnt}`, `test`, and `backend/process_material5.php` from the repository root and commit history in the same rewrite pass.
5. THE `.gitignore` file at the repository root SHALL include `passwords.txt`, `.env`, and `*.env` patterns so that credential files cannot be accidentally committed in the future.
6. WHEN the history rewrite is complete, THE Admin SHALL force-push the cleaned history to all remote branches and notify all collaborators to re-clone.

---

### Requirement 2: Remove Hardcoded Supabase Secrets from Frontend Source

**User Story:** As a security engineer, I want Supabase keys removed from `src/lib/supabase.ts` and the entire dead Supabase API layer deleted, so that the Service_Role_Key and Anon_Key are never shipped to browsers.

#### Acceptance Criteria

1. THE Frontend SHALL NOT contain the `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE` as string literals in any committed source file.
2. WHEN the dead Supabase API layer is removed, THE Frontend SHALL delete `src/lib/supabase.ts` and `src/lib/supabaseApi.ts` from the codebase entirely, as confirmed by Requirement 9.
3. WHERE Supabase client configuration is required in the future, THE Frontend SHALL read keys exclusively from Vite environment variables (`import.meta.env.VITE_*`) injected at build time, and those variable files SHALL be listed in `.gitignore`.
4. THE Service_Role_Key SHALL only be used server-side, never exposed to the browser under any circumstances.

---

### Requirement 3: Implement Role-Enforcement Middleware on Protected Routes

**User Story:** As a security engineer, I want every `/admin/*`, `/teacher/*`, `/student/*`, and `/parent/*` route group protected by a role-checking middleware in addition to the existing `auth:sanctum` check, so that a logged-in student cannot call admin or teacher endpoints.

#### Acceptance Criteria

1. THE API SHALL reject requests to `/api/admin/*` routes with HTTP 403 if the authenticated user does not have `role = admin`.
2. THE API SHALL reject requests to `/api/teacher/*` routes with HTTP 403 if the authenticated user does not have `role = teacher`.
3. THE API SHALL reject requests to `/api/student/*` routes with HTTP 403 if the authenticated user does not have `role = student`.
4. THE API SHALL reject requests to `/api/parent/*` routes with HTTP 403 if the authenticated user does not have `role = parent`.
5. THE Role_Middleware SHALL be applied as a named middleware inside `routes/api.php` on each role-prefixed group, and SHALL NOT rely on per-controller manual checks.
6. WHEN a valid Sanctum token is present but the role does not match, THE API SHALL return HTTP 403 with a JSON body of `{"message": "Forbidden."}` and SHALL NOT return HTTP 401.
7. THE Role_Middleware SHALL be covered by automated feature tests that assert each role boundary (admin, teacher, student, parent) is enforced correctly for at least one representative route per group.

---

### Requirement 4: Migrate Auth Token Storage from localStorage to HttpOnly Cookies

**User Story:** As a security engineer, I want Sanctum authentication tokens stored in HttpOnly cookies instead of localStorage, so that XSS attacks cannot steal tokens and the `withCredentials: true` flag on the Axios client is actually functional.

#### Acceptance Criteria

1. THE API SHALL issue Sanctum tokens via an HttpOnly `Set-Cookie` header on successful login instead of returning the token in the JSON response body.
2. WHEN a request is received from the Frontend, THE API SHALL authenticate it using the HttpOnly cookie value, not a `Bearer` token from `localStorage`.
3. THE Frontend SHALL remove all `localStorage.getItem('auth_token')` and `localStorage.setItem('auth_token', ...)` calls from `src/lib/api.ts` and any other files.
4. THE Frontend SHALL rely solely on `withCredentials: true` in the Axios instance, which is already set, to transmit the authentication cookie.
5. WHEN a user logs out, THE API SHALL clear the authentication cookie with an explicit `Set-Cookie` header that expires the cookie immediately.
6. THE API `config/cors.php` SHALL set `supports_credentials` to `true` (it already does), confirming cookie-based cross-origin requests are supported.

---

### Requirement 5: Enable TLS Verification on Outbound Mistral AI API Calls

**User Story:** As a security engineer, I want all outbound HTTP calls to the Mistral AI API to use full TLS certificate verification, so that the system is not vulnerable to man-in-the-middle attacks that could intercept or tamper with AI content.

#### Acceptance Criteria

1. THE EmbeddingService SHALL remove the `->withoutVerifying()` call from its `embedBatch` method and all other methods.
2. WHEN `EmbeddingService::embedBatch` is called, THE EmbeddingService SHALL make the outbound HTTP POST to the Mistral API endpoint with TLS verification enabled (the default Laravel HTTP client behavior).
3. THE API SHALL search all AI-related controllers for any `->withoutVerifying()` calls and remove each occurrence.
4. WHEN TLS verification fails due to an expired or invalid certificate, THE EmbeddingService SHALL throw an `EmbeddingException` with a descriptive message rather than silently proceeding.

---

### Requirement 6: Implement Functional Password Reset Flow

**User Story:** As a registered user, I want to receive a password reset email when I request one, so that I can regain access to my account if I forget my password.

#### Acceptance Criteria

1. WHEN a user submits a valid email to `POST /api/auth/forgot-password`, THE API SHALL generate a time-limited, single-use password reset token and send a reset email to that address.
2. WHEN a user submits an email that does not exist in the system to `POST /api/auth/forgot-password`, THE API SHALL return HTTP 200 with the same generic message to avoid leaking whether the email is registered.
3. THE API SHALL expose a `POST /api/auth/reset-password` endpoint that accepts a valid token, email, new password, and confirmation, and updates the user's password if the token is valid and unexpired.
4. WHEN a password reset token is used successfully, THE API SHALL invalidate the token so it cannot be used again.
5. WHEN a password reset token has expired (after a configurable TTL, defaulting to 60 minutes), THE API SHALL return HTTP 422 with a descriptive error message.
6. THE API SHALL use Laravel's built-in `Password::sendResetLink` and `Password::reset` facilities, backed by the `password_reset_tokens` database table, to implement the flow.

---

### Requirement 7: Remove Plaintext Passwords from Bulk User Creation Responses

**User Story:** As a security engineer, I want plaintext passwords removed from API responses for bulk user creation, so that generated passwords are never transmitted over the network in cleartext after the initial creation.

#### Acceptance Criteria

1. WHEN `POST /api/admin/users/bulk` creates user accounts, THE API SHALL NOT include `plain_password` in the JSON response body.
2. WHEN `POST /api/admin/users/upload` creates user accounts from a file, THE API SHALL NOT include `plain_password` in the JSON response body.
3. WHEN user accounts are bulk-created, THE API SHALL deliver generated passwords to the admin by sending a one-time credentials email to each newly created user's email address.
4. IF the email delivery service is unavailable during bulk creation, THEN THE API SHALL mark the created users as requiring a password reset on first login and return HTTP 201 with a warning indicating email delivery failed.
5. THE API response body for bulk creation SHALL contain only non-sensitive fields: user `id`, `name`, `email`, `role`, `created_at`, and `enrollment_code`.

---

### Requirement 8: Replace Default Seeder Credentials with Secure Placeholders

**User Story:** As a system administrator, I want the database seeder to use non-default, randomized credentials so that any database seeded for development or staging does not ship with well-known passwords.

#### Acceptance Criteria

1. THE `DatabaseSeeder` SHALL generate a random password using `Str::random(16)` (or equivalent) for each seeded user rather than hardcoding the literal string `'password'`.
2. WHEN the seeder runs, THE `DatabaseSeeder` SHALL output generated credentials to the console using `$this->command->info(...)` only during local development (i.e., when `APP_ENV=local`).
3. WHEN `APP_ENV` is not `local`, THE `DatabaseSeeder` SHALL not output any credential values to the console.
4. THE seeder email for the admin account SHALL use the `APP_DOMAIN` environment variable (e.g., `admin@{APP_DOMAIN}`) rather than a hardcoded `@gmail.com` or `@learnshift.com` address.

---

### Requirement 9: Delete the Dead Supabase API Layer and mockData Dead Code

**User Story:** As a developer, I want dead code removed from the codebase so that no unused file with hardcoded secrets or stale mock data confuses future developers or introduces maintenance burden.

#### Acceptance Criteria

1. THE Frontend SHALL delete `src/lib/supabase.ts`, `src/lib/supabaseApi.ts`, and all exports within them from the codebase.
2. THE Frontend SHALL delete `src/lib/mockData.ts` from the codebase.
3. WHEN `src/lib/mockData.ts` is deleted, THE Frontend SHALL replace all remaining mock-data imports in active pages (`TeacherChatbotLogs`, `ParentCurriculum`, `TeacherContent`, `ParentMastery`, `TeacherRoster`, `TeacherStudentProfile`) with real API calls to the appropriate backend endpoints.
4. WHEN the deletion is complete, THE Frontend build (`npm run build`) SHALL complete without TypeScript errors or unresolved imports referencing the deleted files.

---

### Requirement 10: Consolidate Duplicate File Upload Logic into a Shared Service

**User Story:** As a developer, I want file upload and RAG ingestion logic to exist in exactly one place, so that bug fixes and behavior changes do not need to be applied to multiple copies of the same code.

#### Acceptance Criteria

1. THE API SHALL extract the file upload, storage, and verification logic that is currently duplicated between `ContentController::store()` and `TopicController::storeMaterial()` into a single injectable `MaterialUploadService`.
2. THE `MaterialUploadService` SHALL handle storage upload, post-upload existence verification, and URL generation.
3. WHEN `ContentController::store()` or `TopicController::storeMaterial()` is called, EACH SHALL delegate to `MaterialUploadService` rather than containing its own copy of the upload logic.
4. THE API SHALL consolidate the RAG reprocessing pipeline (text extraction → delete old embeddings → chunk → embed → bulk insert) that is duplicated between `ContentController::reprocess()` and `IngestLearningMaterialJob::handle()` into a single `MaterialIngestionService`.
5. WHEN `ContentController::reprocess()` is called, THE ContentController SHALL invoke `MaterialIngestionService` rather than executing the ingestion pipeline inline.
6. WHEN `IngestLearningMaterialJob::handle()` runs, THE IngestLearningMaterialJob SHALL invoke `MaterialIngestionService` rather than executing the ingestion pipeline inline.

---

### Requirement 11: Extract Enrollment Check into a Shared EnrollmentGuard

**User Story:** As a developer, I want the student enrollment verification logic to live in one place, so that enrollment rules are applied consistently and cannot be bypassed by forgetting to add the check in a new controller.

#### Acceptance Criteria

1. THE API SHALL create a reusable `EnrollmentGuard` (PHP trait or service class) that accepts a `$student` user and a `$lesson` model and returns a boolean indicating enrollment status.
2. WHEN the EnrollmentGuard is queried, THE EnrollmentGuard SHALL traverse `lesson → topic → schoolClass → students` and check whether the given student is in the enrollments.
3. THE API SHALL replace the inline enrollment check in all six locations — `LessonChatController` (student, ×2), `QuizController` (×3), and `LessonPracticeController` — with a single call to `EnrollmentGuard`.
4. IF a student is not enrolled according to the EnrollmentGuard, THEN THE API SHALL return HTTP 403 with `{"error": "You are not enrolled in this class."}` from a single centralized response path.
5. THE EnrollmentGuard SHALL be covered by at least one unit test verifying correct behavior for enrolled students, unenrolled students, and lessons belonging to non-existent classes.

---

### Requirement 12: Consolidate Mastery Calculation into MasteryCalculator

**User Story:** As a developer, I want the 0/50/100% mastery calculation logic to exist only in `MasteryCalculator`, so that changing the mastery thresholds does not require editing multiple files.

#### Acceptance Criteria

1. THE API SHALL remove the private `calculateMastery(?int $bestScore): int` method from `QuizController`.
2. WHEN `QuizController::submit()` needs to compute mastery, THE QuizController SHALL call `MasteryCalculator` (or a dedicated method thereon) rather than containing its own calculation logic.
3. THE `MasteryCalculator` SHALL expose a `calculateLessonMastery(?int $bestScore): int` public method with the same 0/50/100% thresholds currently duplicated in both classes.
4. THE mastery thresholds (0% for no attempt, 50% for score < 70%, 100% for score ≥ 70%) SHALL be defined as named constants in `MasteryCalculator` so they are self-documenting and can be changed in one place.

---

### Requirement 13: Fix the topics.quarter_id NOT NULL Constraint

**User Story:** As a teacher, I want to create topics for my classes without encountering a database constraint violation, so that I can build my curriculum without unexpected errors.

#### Acceptance Criteria

1. THE database migration `2026_06_14_141222_add_class_id_to_topics_table.php` already sets `quarter_id` as nullable; THE API SHALL verify that this migration has been applied to all environments.
2. WHEN `TopicController::storeTopic()` creates a teacher-scoped topic, THE API SHALL set `quarter_id` to `null` and `class_id` to the teacher's class ID.
3. WHEN curriculum-scoped topics are seeded via `DatabaseSeeder`, THE DatabaseSeeder SHALL set `quarter_id` to the appropriate Quarter ID and leave `class_id` as `null`.
4. THE `topics` table model (`App\Models\Topic`) SHALL list `quarter_id` in `$fillable` with a nullable type annotation and SHALL NOT enforce a non-null constraint at the application layer.
5. IF a topic is created without either `quarter_id` or `class_id`, THEN THE API SHALL return HTTP 422 with a validation error requiring at least one of the two fields.

---

### Requirement 14: Replace the Drifting topics.lesson_count Denormalized Counter

**User Story:** As a developer, I want `topics.lesson_count` to always reflect the actual number of lessons in a topic, so that dashboards and skill-tree displays show correct counts without data drift.

#### Acceptance Criteria

1. THE API SHALL remove the `lesson_count` column from the `topics` table via a new database migration.
2. WHEN any code queries the count of lessons for a topic, THE API SHALL compute the count from a live `lessons` table query (e.g., `$topic->lessons()->count()`) rather than reading `lesson_count`.
3. THE `TopicController::storeLessonForTopic()` SHALL remove the `$topic->increment('lesson_count')` call.
4. THE `TopicController::destroyLesson()` SHALL remove the `$topic->decrement('lesson_count')` call.
5. WHERE `lesson_count` is returned in API responses, THE API SHALL replace the static column value with a computed count using an Eloquent `withCount('lessons')` eager load or equivalent.

---

### Requirement 15: Link classes.subject to the subjects Foreign Key Table

**User Story:** As a system administrator, I want class subject to be a foreign key reference to the `subjects` table, so that the curriculum system and class records are properly linked and subject data is consistent.

#### Acceptance Criteria

1. THE database SHALL add a `subject_id` nullable foreign key column to the `classes` table referencing `subjects.id` via a new migration.
2. THE database migration SHALL back-fill `subject_id` for existing class rows by matching the free-text `subject` string against `subjects.name` where possible.
3. WHEN a teacher or admin creates a class, THE API SHALL accept a `subject_id` field and store it in `classes.subject_id`.
4. WHEN a class has both `subject` (free-text) and `subject_id` (FK), THE API SHALL treat `subject_id` as the authoritative source for curriculum linkage.
5. THE `DatabaseSeeder` already sets `subject_id` on `SchoolClass` creation; THE API SHALL ensure the `SchoolClass` model's `$fillable` array includes `subject_id`.
6. THE `MasteryCalculator::getStudentProgressSummary()` SHALL use `classes.subject_id` (via the `subject` relationship) rather than the free-text `classes.subject` column for subject display.

---

### Requirement 16: Remove Redundant topics.order Column

**User Story:** As a developer, I want the `topics` table to have a single ordering column, so that there is no ambiguity about which column controls topic display order.

#### Acceptance Criteria

1. THE API SHALL audit all queries and model references to determine whether `topics.order` or `topics.order_index` is actively used for ordering.
2. WHEN the audit confirms `order_index` is the actively used column (as seen in `TopicController::indexTopics()`), THE API SHALL create a migration to drop the `order` column from the `topics` table.
3. WHEN the redundant column is removed, THE API SHALL update `TopicController::storeTopic()` to stop writing to the removed column.
4. THE `Topic` model's `$fillable` array SHALL be updated to remove the dropped column.
5. THE `DatabaseSeeder` SHALL be updated to stop setting the dropped column when creating topics.

---

### Requirement 17: Move All Magic Constants to Environment-Driven Configuration

**User Story:** As a DevOps engineer, I want all hardcoded runtime values replaced with environment-variable-backed configuration, so that the application can be deployed to different environments without code changes.

#### Acceptance Criteria

1. THE API SHALL move the Mistral API base URL (`https://api.mistral.ai/v1/embeddings`) from `EmbeddingService` private constants into `config/services.php` under the `mistral` key, read from `MISTRAL_API_URL` in `.env`.
2. THE API SHALL move the Mistral embedding model name (`mistral-embed`) from `EmbeddingService` into `config/services.php` under `mistral.embedding_model`, read from `MISTRAL_EMBEDDING_MODEL` in `.env`.
3. THE Frontend SHALL replace the hardcoded `baseURL: 'http://localhost:8000/api'` in `src/lib/api.ts` with `import.meta.env.VITE_API_BASE_URL`, with a default documented in `.env.example`.
4. THE API SHALL move the quiz maximum attempts constant (`MAX_ATTEMPTS = 3`) from `QuizController` into `config/quiz.php` (or equivalent) read from `QUIZ_MAX_ATTEMPTS` in `.env`.
5. THE API SHALL move the RAG top-K value (5), similarity threshold (0.5), and chunking parameters (chunk size 500, overlap 50) from any inline constants into `config/rag.php`, each read from a corresponding environment variable with the current values as defaults.
6. THE API `config/cors.php` `allowed_origins` array SHALL be populated from a `CORS_ALLOWED_ORIGINS` environment variable (comma-separated list) rather than hardcoded localhost values.
7. WHEN `CORS_ALLOWED_ORIGINS` is not set, THE API SHALL default to no allowed origins (empty array) in production environments (`APP_ENV=production`).
8. THE `.env.example` files (both backend and frontend) SHALL document every new environment variable introduced by this requirement.

---

### Requirement 18: Standardize Frontend Loading and Error State Handling

**User Story:** As a frontend developer, I want a consistent, reusable pattern for loading and error states across all pages, so that users see predictable UI feedback and developers do not write ad-hoc `useState`/`useEffect` patterns with silent `console.error` calls.

#### Acceptance Criteria

1. THE Frontend SHALL provide a shared `useApiRequest` hook (or equivalent abstraction) that encapsulates the `loading`, `error`, and `data` state pattern used across pages.
2. WHEN an API call fails, THE Frontend SHALL display a visible, user-facing error message rather than only calling `console.error`.
3. THE Frontend SHALL provide a reusable `<LoadingSpinner>` (or equivalent) component used consistently across all pages while data is being fetched.
4. THE Frontend SHALL provide a reusable `<ErrorMessage>` (or equivalent) component used consistently across all pages when an API call returns an error.
5. WHERE active pages currently contain ad-hoc inline loading/error state logic (including `console.error`-only error handling), THE Frontend SHALL replace that logic with calls to the shared hook and shared components.

---

### Requirement 19: Remove Misplaced Files from Repository Root

**User Story:** As a developer, I want junk and misplaced files removed from the repository root so that the project structure is clean and navigable.

#### Acceptance Criteria

1. THE repository root SHALL not contain `passwords.txt` (addressed in Requirement 1), `cnt}`, `test`, or `backend/process_material5.php`.
2. THE file `2026_06_19_000001_create_messages_table.php` at the repository root SHALL be deleted, as the correct copy already exists at `backend/database/migrations/2026_06_19_000001_create_messages_table.php`.
3. THE file `MessageController.php` at the repository root SHALL be deleted, as the correct copy already exists at `backend/app/Http/Controllers/Api/MessageController.php`.
4. WHEN these files are removed, THE repository root SHALL contain only files that are explicitly part of the frontend build tooling (`package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `index.html`, `README.md`) or top-level project files.

---

### Requirement 20: Remove or Route Dead Frontend Pages

**User Story:** As a frontend developer, I want orphaned frontend pages either wired up to working routes or deleted, so that the route tree is accurate and no dead code accumulates.

#### Acceptance Criteria

1. THE Frontend SHALL evaluate `src/pages/student/Diagnostic.tsx` and `src/pages/student/AskTeacher.tsx` against the backend API to determine whether a working backend endpoint supports each page's functionality.
2. WHERE a working backend endpoint exists for a dead page, THE Frontend SHALL add a named route for that page in the application router (`src/App.tsx` or equivalent).
3. WHERE no working backend endpoint exists for a dead page, THE Frontend SHALL delete the page component file.
4. WHEN either page is retained, THE Frontend build SHALL compile without warnings about unused components.
5. THE `src/components/layout/Layout.tsx` sidebar link for `/student/diagnostic` SHALL either point to a fully routed `Diagnostic` page or be removed from the navigation.

---

### Requirement 21: Replace mockData Imports in Active Pages with Live API Calls

**User Story:** As a developer, I want active frontend pages to fetch data from the real API instead of static mock data, so that users see live, accurate information.

#### Acceptance Criteria

1. THE page `src/pages/teacher/ChatbotLogs.tsx` SHALL replace its `MOCK_CHAT_LOGS` import with a call to `teacherApi.aiLogs()`.
2. THE page `src/pages/parent/Curriculum.tsx` SHALL replace its `MOCK_CURRICULUM` import with a call to the appropriate parent curriculum API endpoint.
3. THE page `src/pages/teacher/Content.tsx` SHALL replace its `MOCK_FILES` import with a call to `teacherApi.content()`.
4. THE page `src/pages/parent/Mastery.tsx` SHALL replace its `MOCK_STUDENTS` import with a call to the appropriate parent mastery API endpoint.
5. THE page `src/pages/teacher/Roster.tsx` SHALL replace its `MOCK_STUDENTS` import with a call to `teacherApi.students()`.
6. THE page `src/pages/teacher/StudentProfile.tsx` SHALL replace its `MOCK_STUDENTS` import with a call to `teacherApi.studentProfile(id)`.
7. WHEN each page's mock import is replaced, THE Frontend build SHALL compile without errors or unresolved import warnings.

---

### Requirement 22: Make CORS Configuration Deployment-Ready

**User Story:** As a DevOps engineer, I want CORS allowed origins read from environment configuration and not hardcoded to localhost, so that the API can be deployed to staging and production environments without requiring code changes.

#### Acceptance Criteria

1. THE `config/cors.php` `allowed_origins` array SHALL read its values from the `CORS_ALLOWED_ORIGINS` environment variable (see Requirement 17, Criterion 6).
2. THE `backend/.env.example` SHALL include a `CORS_ALLOWED_ORIGINS` entry with an example value (e.g., `http://localhost:5173,https://app.learnshift.com`).
3. WHEN `CORS_ALLOWED_ORIGINS` is set to a comma-separated list, THE API SHALL split the list and apply each origin as an allowed origin in the CORS response headers.
4. WHEN `APP_ENV=production` and `CORS_ALLOWED_ORIGINS` is not set or empty, THE API SHALL allow no origins by default, effectively blocking all cross-origin requests until origins are explicitly configured.
5. THE CORS configuration SHALL continue to set `supports_credentials: true` to maintain cookie-based authentication (Requirement 4).
