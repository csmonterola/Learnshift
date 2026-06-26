# Technical Design Document
## LearnShift System Hardening & Cleanup

---

## Architecture

LearnShift is a two-tier full-stack application:

- **Backend**: Laravel 12 REST API (`backend/`) served at `/api/*`. PHP 8.2, Sanctum token auth, PostgreSQL + pgvector, queue-based RAG ingestion, Mistral AI for embeddings and chat.
- **Frontend**: React 18 + TypeScript SPA (`src/`) built with Vite. Axios HTTP client (`src/lib/api.ts`) communicates exclusively with the Laravel API. Four role portals share a single bundle.

After this hardening work, the architecture changes in the following ways:

1. **Auth flow**: Sanctum Bearer token stored in `localStorage` → HttpOnly cookie. The axios `withCredentials: true` flag (already present) becomes functional.
2. **Role enforcement**: A new `EnsureRole` middleware layer sits between `auth:sanctum` and all role-prefixed route groups, providing a hard boundary that was previously missing.
3. **Service layer additions**: Two new services (`MaterialUploadService`, `MaterialIngestionService`) centralize logic previously duplicated across controllers and jobs. A new `EnrollmentGuard` service centralizes the six copy-pasted enrollment checks.
4. **Config layer**: Two new config files (`config/rag.php`, `config/quiz.php`) and additions to `config/services.php` replace hardcoded constants throughout the codebase.
5. **Frontend lib layer**: A `useApiRequest` hook and two shared UI components (`LoadingSpinner`, `ErrorMessage`) replace ad-hoc per-page loading/error state.

No database engine, no queue infrastructure, and no external service integrations change — only credentials, middleware, service extraction, and schema cleanup.

---

## Components and Interfaces

### Backend: New and Modified Components

#### EnsureRole Middleware
```
Input:  HTTP Request + route middleware arguments (role names)
Output: Passes request to next handler | Returns HTTP 403 JSON
Logic:  Check request->user()->role is in the allowed roles list
```

#### MaterialUploadService
```
upload(UploadedFile $file, int $lessonId, string $disk): string
  → Returns stored path on success, throws RuntimeException on failure

url(string $path, string $disk): string
  → Returns public URL for stored path

delete(string $path, string $disk): void
  → Deletes file from storage
```

#### MaterialIngestionService
```
ingest(LearningMaterial $material): int
  → Runs full pipeline: download → extract → chunk → embed → store
  → Returns chunk count on success
  → Updates material.ingestion_status ('processing' → 'indexed' | 'failed')
  → Throws on unrecoverable errors
```

#### EnrollmentGuard
```
isEnrolled(User $student, Lesson $lesson): bool
  → Traverses lesson → topic → schoolClass → students pivot

denyIfNotEnrolled(User $student, Lesson $lesson): ?JsonResponse
  → Returns HTTP 403 response if not enrolled, null if enrolled
```

#### MasteryCalculator additions
```
calculateLessonMastery(?int $bestScore): int
  → 0 if null, 50 if < THRESHOLD_PASS, 100 if >= THRESHOLD_PASS

Constants:
  THRESHOLD_PASS    = 70
  MASTERY_NONE      = 0
  MASTERY_ATTEMPTED = 50
  MASTERY_COMPLETE  = 100
```

#### AuthController additions
```
resetPassword(Request $request): JsonResponse
  → Accepts: token, email, password, password_confirmation
  → Uses Password::reset facade
  → Returns 200 on success, 422 on invalid/expired token
```

#### WelcomeCredentials Mailable
```
Input:  User $user, string $plainPassword
Output: Email sent to user with one-time credentials
```

### Frontend: New and Modified Components

#### useApiRequest<T> hook
```
Returns: { data: T|null, loading: boolean, error: string|null, execute: fn }
execute(fn: () => Promise<{data: T}>): Promise<T>
  → Sets loading=true, calls fn(), sets data or error
  → Extracts user-facing message from AxiosError
```

#### LoadingSpinner component
```
Props: { message?: string }
Renders: Animated spinner with optional label
Usage: Replaces ad-hoc loading state in all pages
```

#### ErrorMessage component
```
Props: { message: string; onRetry?: () => void }
Renders: Styled error box with optional retry button
Usage: Replaces console.error-only error handling in all pages
```

---

## Data Models

### Schema Changes

#### topics table
| Column | Before | After | Reason |
|---|---|---|---|
| `quarter_id` | NOT NULL | nullable | Teacher-created topics have no quarter |
| `lesson_count` | integer column | **dropped** | Drifting counter — replaced with computed count |
| `order` | integer column | **dropped** | Redundant with `order_index` |

#### classes table
| Column | Before | After | Reason |
|---|---|---|---|
| `subject_id` | absent | nullable FK → subjects.id | Links class to structured curriculum |

### Model Updates

**Topic model** (`backend/app/Models/Topic.php`):
- Remove `lesson_count` and `order` from `$fillable`
- Add `quarter_id` as nullable in `$fillable`

**SchoolClass model** (`backend/app/Models/SchoolClass.php`):
- Add `subject_id` to `$fillable`
- Add `subjectModel()` BelongsTo relationship to `Subject`

**MasteryCalculator**:
- `getStudentProgressSummary()` updated to join `subjects` table via `subject_id` for display

---

## Error Handling

### Backend Error Handling Strategy

| Scenario | Current | After |
|---|---|---|
| Wrong role on protected route | No check → 200/data leak | `EnsureRole` → HTTP 403 |
| File upload failure | Inconsistent (500 or silent) | `MaterialUploadService` throws, controller returns typed error |
| RAG ingestion failure | Swallowed in job, status set to 'failed' | `MaterialIngestionService` throws, caller decides status |
| Mistral TLS failure | Bypassed by `withoutVerifying()` | TLS error propagates as `EmbeddingException` |
| Password reset (broken) | Silent no-op | `Password::sendResetLink` + proper 422 on expired token |
| Enrollment not checked | Request proceeds | `EnrollmentGuard::denyIfNotEnrolled` → HTTP 403 |

### Frontend Error Handling Strategy

All pages that currently use `console.error` only will be migrated to the `useApiRequest` hook which surfaces errors via `ErrorMessage`. The error message shown to users is extracted from `err.response?.data?.message` (server-provided) with a fallback to a generic string.

---

## Correctness Properties

These invariants must hold after all changes are applied:

### Property 1: Role Isolation
A request authenticated as role X can never successfully complete a route scoped to role Y. Every wrong-role request receives HTTP 403. Coverage: 4 roles × 4 route groups = 16 combinations tested in `RoleMiddlewareTest`.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

### Property 2: Credential Secrecy
No JWT, API key, DB password, or AWS key appears as a string literal in any committed source file. Verified by: `git grep -r "eyJhbGci\|uLRLBhn\|391dedef\|3dae03dc\|dP5QVckL" -- '*.ts' '*.php' '*.js'` returns zero results after the purge.

**Validates: Requirements 1.3, 2.1, 2.4**

### Property 3: Enrollment Enforcement
Every endpoint that reads lesson content (`/chat`, `/quiz/*`, `/practice/*`) returns HTTP 403 if the student is not enrolled — enforced through the single `EnrollmentGuard` class with no inline bypasses possible.

**Validates: Requirements 11.3, 11.4**

### Property 4: Mastery Consistency
`QuizController` and `MasteryCalculator` produce identical mastery values for identical inputs, because `QuizController` now delegates to `MasteryCalculator::calculateLessonMastery()` instead of computing independently.

**Validates: Requirements 12.1, 12.2, 12.3**

### Property 5: Lesson Count Accuracy
`topics.lessons_count` (computed via `withCount('lessons')`) always equals `SELECT COUNT(*) FROM lessons WHERE topic_id = ?`. The removed manual `lesson_count` counter cannot drift.

**Validates: Requirements 14.1, 14.2, 14.5**

### Property 6: Ingestion Idempotency
Calling `MaterialIngestionService::ingest()` twice on the same material produces the same final set of embeddings — old embeddings are deleted before new ones are inserted in every run.

**Validates: Requirements 10.4, 10.5, 10.6**

### Property 7: Password Reset Token Single-Use
Using a reset token successfully deletes it from `password_reset_tokens`. A second attempt with the same token returns HTTP 422 with an appropriate error message.

**Validates: Requirements 6.3, 6.4, 6.5**

---

## Testing Strategy

### New Tests Required

| File | Type | What it covers |
|---|---|---|
| `tests/Feature/RoleMiddlewareTest.php` | Feature | All 4 role boundaries — each wrong role gets 403, correct role gets 200 |
| `tests/Unit/EnrollmentGuardTest.php` | Unit | Enrolled/unenrolled/non-existent class cases |
| `tests/Unit/MasteryCalculatorTest.php` | Unit | All three mastery tiers (0, 50, 100) and edge cases (null, 0, 70, 69, 100) |
| `tests/Feature/PasswordResetTest.php` | Feature | Valid reset flow, expired token → 422, email not found → 200 (same message) |
| `tests/Feature/BulkUserCreateTest.php` | Feature | Response does not contain `plain_password` field |

### Existing Tests

Run `php artisan test` after each stream to confirm no regressions. The test suite is the acceptance gate before marking any task complete.

---

## Overview

This document describes the technical design for all 22 hardening items identified in the LearnShift codebase audit. Each section maps to one or more requirements, names the exact files that change, and provides pseudocode or component signatures where the change is non-trivial.

The changes fall into five work streams that can proceed partially in parallel after the credential rotation (Req 1) is complete:

| Stream | Requirements | Description |
|---|---|---|
| **A — Security** | 1–8 | Credentials, auth, TLS, CORS |
| **B — Dead Code Removal** | 2, 9, 19–21 | Delete unused files and misplaced artifacts |
| **C — Backend Consolidation** | 10–16 | Services, DB schema, mastery, enrollment |
| **D — Configuration** | 17, 22 | Env-driven config for all magic constants |
| **E — Frontend UX** | 18 | Shared loading/error hook and components |

---

## Stream A — Security

### A1. Credential Rotation & Git History Purge (Req 1)

**This is a manual admin step, not a code change.** It must happen before any code is pushed.

Steps:
1. Rotate all six credential sets at their respective dashboards (Supabase, Mistral, AWS).
2. Run `git filter-repo --path passwords.txt --invert-paths` to remove the file from every commit.
3. Remove junk files in the same pass: `cnt}`, `test`, `backend/process_material5.php`.
4. Force-push all branches. All collaborators re-clone.
5. Add to root `.gitignore`:

```
passwords.txt
*.passwords
.env
*.env
!.env.example
```

New credentials go into `backend/.env` only. No credential values anywhere in source code.

---

### A2. Remove Hardcoded Supabase Secrets & Dead API Layer (Req 2, 9)

**Files deleted:**
- `src/lib/supabase.ts`
- `src/lib/supabaseApi.ts`
- `src/lib/supabaseTypes.ts`
- `src/lib/mockData.ts`

These are fully dead code (no active page imports from `supabaseApi.ts` or `mockData.ts`). The `supabase.ts` file contains the hardcoded service role key and anon key as string literals — deletion is the correct fix, not env-var migration, because the active app never uses it.

If Supabase direct access is needed in the future, the pattern is:
```ts
// src/lib/supabaseClient.ts  (future, if needed)
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY   // anon only — never service role
)
```

The service role key is **never** used in frontend code. It lives only in `backend/.env` as `SUPABASE_SERVICE_ROLE_KEY`.

---

### A3. Role-Enforcement Middleware (Req 3)

**New file:** `backend/app/Http/Middleware/EnsureRole.php`

```php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): mixed
    {
        if (!in_array($request->user()?->role, $roles, true)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        return $next($request);
    }
}
```

**Modified:** `bootstrap/app.php` (Laravel 11) — register alias:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias(['role' => \App\Http\Middleware\EnsureRole::class]);
})
```

**Modified:** `backend/routes/api.php` — add `role:` to each group:

```php
Route::prefix('admin')
    ->middleware(['auth:sanctum', 'role:admin'])
    ->group(function () { /* ... */ });

Route::prefix('teacher')
    ->middleware(['auth:sanctum', 'role:teacher'])
    ->group(function () { /* ... */ });

Route::prefix('student')
    ->middleware(['auth:sanctum', 'role:student'])
    ->group(function () { /* ... */ });

Route::prefix('parent')
    ->middleware(['auth:sanctum', 'role:parent'])
    ->group(function () { /* ... */ });
```

**New test file:** `backend/tests/Feature/RoleMiddlewareTest.php`

Each of the four role groups gets at least one test asserting that a user of a different role receives HTTP 403, and a user of the correct role receives HTTP 200.

---

### A4. Migrate Auth Token from localStorage to HttpOnly Cookie (Req 4)

**Modified:** `backend/app/Http/Controllers/Api/AuthController.php`

`login()` stops returning `token` in the JSON body. Instead:

```php
public function login(Request $request): JsonResponse
{
    // ... validate, find user, verify password ...

    $token = $user->createToken('auth_token')->plainTextToken;

    return response()
        ->json(['user' => $user->load('studentProfile')])
        ->cookie(
            'auth_token',      // name
            $token,            // value
            60 * 24 * 30,      // minutes (30 days)
            '/',               // path
            null,              // domain (null = current)
            true,              // secure (HTTPS only)
            true,              // httpOnly
            false,             // raw
            'Lax'              // sameSite
        );
}
```

`logout()` expires the cookie:
```php
public function logout(Request $request): JsonResponse
{
    $request->user()->currentAccessToken()->delete();
    return response()
        ->json(['message' => 'Logged out successfully.'])
        ->cookie(Cookie::forget('auth_token'));
}
```

**Modified:** `backend/config/sanctum.php` — ensure `stateful` domains are set from env.

**Modified:** `src/lib/api.ts`
- Remove `localStorage.getItem('auth_token')` interceptor block entirely.
- Keep `withCredentials: true` — this is already set and is now meaningful.
- Remove all `localStorage.setItem`/`removeItem` calls from AuthContext and any other files.

```ts
// BEFORE — remove this interceptor:
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// AFTER — withCredentials: true does the work; no interceptor needed
```

**Modified:** `src/components/auth/AuthContext.tsx` (or equivalent) — remove all `localStorage` token reads/writes.

---

### A5. Enable TLS Verification on Mistral API Calls (Req 5)

**Modified:** `backend/app/Services/Rag/EmbeddingService.php`

Remove `->withoutVerifying()`:
```php
// BEFORE
$response = Http::timeout(30)
    ->withToken(config('services.mistral.api_key'))
    ->withoutVerifying()   // <-- DELETE THIS LINE
    ->post(self::API_URL, [...]);

// AFTER
$response = Http::timeout(30)
    ->withToken(config('services.mistral.api_key'))
    ->post(config('services.mistral.embed_url'), [...]);
```

Grep all AI controllers for `->withoutVerifying()` and remove each occurrence. Affected files confirmed by audit:
- `EmbeddingService.php`
- Any `LessonChatController` or `QuestionGenerator` that proxies Mistral directly.

When TLS fails, the existing `$response->failed()` check already catches it and throws `EmbeddingException` — no additional change needed there.

---

### A6. Implement Password Reset Flow (Req 6)

**Modified:** `backend/app/Http/Controllers/Api/AuthController.php`

Replace the stub with Laravel's built-in Password facade:

```php
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;

public function forgotPassword(Request $request): JsonResponse
{
    $request->validate(['email' => 'required|email']);

    // Always returns the same message — avoids leaking email existence
    Password::sendResetLink($request->only('email'));

    return response()->json([
        'message' => 'If an account with that email exists, a reset link has been sent.'
    ]);
}

public function resetPassword(Request $request): JsonResponse
{
    $request->validate([
        'token'                 => 'required|string',
        'email'                 => 'required|email',
        'password'              => 'required|string|min:8|confirmed',
        'password_confirmation' => 'required|string',
    ]);

    $status = Password::reset(
        $request->only('email', 'password', 'password_confirmation', 'token'),
        function (User $user, string $password) {
            $user->forceFill(['password' => Hash::make($password)])
                 ->setRememberToken(Str::random(60));
            $user->save();
            event(new PasswordReset($user));
        }
    );

    return $status === Password::PASSWORD_RESET
        ? response()->json(['message' => 'Password has been reset.'])
        : response()->json(['message' => __($status)], 422);
}
```

**New route** in `routes/api.php` (public group):
```php
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
```

**Required config** in `backend/.env`:
```
MAIL_MAILER=smtp
MAIL_HOST=...
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=noreply@learnshift.com
MAIL_FROM_NAME="LearnShift"
```

The `password_reset_tokens` table already exists from the standard Laravel migration.

---

### A7. Remove Plaintext Passwords from Bulk Creation Responses (Req 7)

**Modified:** `backend/app/Http/Controllers/Api/Admin/UserController.php`

In `bulkCreate()` and `upload()`:
1. After creating each user, dispatch a `WelcomeEmail` mailable containing the generated password.
2. Strip `plain_password` from the response array.
3. If mail fails, set a `requires_password_reset` flag on the user and include a warning in the response.

Response shape after fix:
```json
{
  "created": [
    { "id": 1, "name": "...", "email": "...", "role": "student", "created_at": "..." }
  ],
  "warnings": []
}
```

**New mailable:** `backend/app/Mail/WelcomeCredentials.php`
```php
class WelcomeCredentials extends Mailable
{
    public function __construct(
        public readonly User $user,
        public readonly string $plainPassword
    ) {}

    public function content(): Content
    {
        return new Content(view: 'emails.welcome-credentials');
    }
}
```

**New view:** `backend/resources/views/emails/welcome-credentials.blade.php`

---

### A8. Secure Database Seeder Credentials (Req 8)

**Modified:** `backend/database/seeders/AdminAccountSeeder.php` (and `DatabaseSeeder.php`):

```php
$password = Str::random(16);
$email    = 'admin@' . config('app.domain', 'learnshift.local');

User::create([
    'name'     => 'Administrator',
    'email'    => $email,
    'password' => Hash::make($password),
    'role'     => 'admin',
]);

if (app()->environment('local')) {
    $this->command->info("Admin created: {$email} / {$password}");
}
```

Add to `.env.example`: `APP_DOMAIN=learnshift.local`

---

## Stream B — Dead Code & Artifact Removal

### B1. Delete Junk Files at Repository Root (Req 1, 19)

Files to delete (git rm):
```
passwords.txt
cnt}
test
2026_06_19_000001_create_messages_table.php   (root copy — keep backend/database/migrations/ copy)
MessageController.php                          (root copy — keep backend/app/Http/Controllers/Api/ copy)
backend/process_material5.php
```

### B2. Delete Dead Frontend Files (Req 2, 9)

Files to delete:
```
src/lib/supabase.ts
src/lib/supabaseApi.ts
src/lib/supabaseTypes.ts
src/lib/mockData.ts
```

### B3. Wire or Delete Orphaned Frontend Pages (Req 20)

`src/pages/student/Diagnostic.tsx` — Backend has `POST /student/diagnostic/start` and `POST /student/diagnostic/submit`. The page has a working backend. Add route in `App.tsx`:
```tsx
<Route path="/student/diagnostic" element={<Diagnostic />} />
```
Add nav link in the student sidebar.

`src/pages/student/AskTeacher.tsx` — Backend has `POST /student/ask-teacher` and `GET /student/ask-teacher/answers`. Add route:
```tsx
<Route path="/student/ask-teacher" element={<AskTeacher />} />
```

### B4. Replace mockData Imports with Live API Calls (Req 21)

Each of the six affected pages follows the same pattern — replace the static import with a `useEffect` + `useState` + `useApiRequest` (from Stream E):

| Page | Mock var | Replacement call |
|---|---|---|
| `teacher/ChatbotLogs.tsx` | `MOCK_CHAT_LOGS` | `teacherApi.aiLogs()` |
| `parent/Curriculum.tsx` | `MOCK_CURRICULUM` | `curriculumApi.bySubject(...)` |
| `teacher/Content.tsx` | `MOCK_FILES` | `teacherApi.content()` |
| `parent/Mastery.tsx` | `MOCK_STUDENTS` | `parentApi.childProgress(childId)` |
| `teacher/Roster.tsx` | `MOCK_STUDENTS` | `teacherApi.students()` |
| `teacher/StudentProfile.tsx` | `MOCK_STUDENTS` | `teacherApi.studentProfile(id)` |

---

## Stream C — Backend Consolidation

### C1. MaterialUploadService — Eliminate Duplicate Upload Logic (Req 10)

**New file:** `backend/app/Services/Storage/MaterialUploadService.php`

```php
namespace App\Services\Storage;

class MaterialUploadService
{
    public function __construct(
        private readonly StorageConfigurationValidator $validator
    ) {}

    /**
     * Validate config, upload file, verify existence, return stored path.
     * Throws \RuntimeException on any failure.
     */
    public function upload(
        \Illuminate\Http\UploadedFile $file,
        int $lessonId,
        string $disk = 'public'
    ): string {
        $this->validateStorageOrFail($disk, $lessonId);

        $path = "lessons/{$lessonId}/materials/" . \Str::uuid()
              . '.' . $file->getClientOriginalExtension();

        $stored = Storage::disk($disk)->putFileAs(
            dirname($path), $file, basename($path)
        );

        if (!$stored || !Storage::disk($disk)->exists($stored)) {
            throw new \RuntimeException('Upload verification failed.');
        }

        return $stored;
    }

    public function url(string $path, string $disk = 'public'): string
    {
        return Storage::disk($disk)->url($path);
    }

    public function delete(string $path, string $disk = 'public'): void
    {
        Storage::disk($disk)->delete($path);
    }

    private function validateStorageOrFail(string $disk, int $context): void
    {
        $result = $this->validator->validateCurrentConfig($disk);
        if (!$result['valid']) {
            throw new \RuntimeException('Storage misconfigured: ' . implode(', ', $result['errors']));
        }
    }
}
```

**Modified:** `ContentController::store()` — replace the ~80-line upload block with:
```php
$path    = $this->uploadService->upload($file, $request->lesson_id);
$fileUrl = $this->uploadService->url($path);
```

**Modified:** `TopicController::storeMaterial()` — same replacement.

---

### C2. MaterialIngestionService — Eliminate Duplicate Pipeline (Req 10)

**New file:** `backend/app/Services/Rag/MaterialIngestionService.php`

```php
namespace App\Services\Rag;

use App\Models\LearningMaterial;
use App\Models\LessonEmbedding;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class MaterialIngestionService
{
    public function __construct(
        private readonly TextExtractor  $extractor,
        private readonly TextChunker    $chunker,
        private readonly EmbeddingService $embedder
    ) {}

    /**
     * Run the full ingestion pipeline for a material.
     * Updates ingestion_status on the material record.
     * Returns chunk count on success, throws on failure.
     */
    public function ingest(LearningMaterial $material): int
    {
        $material->update(['ingestion_status' => 'processing']);

        $tempPath = $this->downloadToTemp($material);

        try {
            $text = $this->extractor->extract($tempPath, $material->file_type);
            if (trim($text) === '') {
                $material->update(['ingestion_status' => 'failed']);
                return 0;
            }

            $chunks  = $this->chunker->chunk($text);
            $vectors = $this->embedder->embedBatch($chunks);

            LessonEmbedding::where('material_id', $material->id)->delete();

            $rows = [];
            $now  = now()->toDateTimeString();
            foreach ($chunks as $i => $chunkText) {
                $rows[] = [
                    'lesson_id'   => $material->lesson_id,
                    'material_id' => $material->id,
                    'chunk_index' => $i,
                    'chunk_text'  => $chunkText,
                    'embedding'   => '[' . implode(',', $vectors[$i]) . ']',
                    'created_at'  => $now,
                ];
            }

            foreach (array_chunk($rows, 100) as $batch) {
                DB::table('lesson_embeddings')->insert($batch);
            }

            $material->update(['ingestion_status' => 'indexed', 'ai_sync' => true]);
            return count($rows);
        } finally {
            @unlink($tempPath);
        }
    }

    private function downloadToTemp(LearningMaterial $material): string
    {
        $path = sys_get_temp_dir() . '/' . uniqid('mat_')
              . '.' . strtolower($material->file_type);
        file_put_contents($path, Storage::disk('public')->get($material->file_path));
        return $path;
    }
}
```

**Modified:** `IngestLearningMaterialJob::handle()` — delegate entirely:
```php
public function handle(MaterialIngestionService $ingestionService): void
{
    $material = LearningMaterial::findOrFail($this->materialId);
    try {
        $ingestionService->ingest($material);
    } catch (\Throwable $e) {
        Log::error('IngestLearningMaterialJob failed', [
            'material_id' => $this->materialId, 'error' => $e->getMessage()
        ]);
        $material->update(['ingestion_status' => 'failed', 'ai_sync' => false]);
    }
}
```

**Modified:** `ContentController::reprocess()` — replace the ~80-line inline pipeline with:
```php
public function reprocess(Request $request, LearningMaterial $material): JsonResponse
{
    if ($material->teacher_id !== $request->user()->id) {
        return response()->json(['message' => 'Forbidden'], 403);
    }
    try {
        $count = $this->ingestionService->ingest($material);
        return response()->json(['message' => 'Reprocessed.', 'chunks' => $count]);
    } catch (\Throwable $e) {
        return response()->json(['message' => $e->getMessage()], 500);
    }
}
```

---

### C3. EnrollmentGuard — Eliminate Duplicate Enrollment Checks (Req 11)

**New file:** `backend/app/Services/EnrollmentGuard.php`

```php
namespace App\Services;

use App\Models\Lesson;
use App\Models\User;

class EnrollmentGuard
{
    /**
     * Returns true if the student is enrolled in the class that owns this lesson.
     */
    public function isEnrolled(User $student, Lesson $lesson): bool
    {
        return $lesson->topic->schoolClass
            ->students()
            ->where('users.id', $student->id)
            ->exists();
    }

    /**
     * Returns a 403 JSON response, or null if student is enrolled.
     * Usage: if ($resp = $this->guard->denyIfNotEnrolled($student, $lesson)) return $resp;
     */
    public function denyIfNotEnrolled(User $student, Lesson $lesson): ?\Illuminate\Http\JsonResponse
    {
        if (!$this->isEnrolled($student, $lesson)) {
            return response()->json(['error' => 'You are not enrolled in this class.'], 403);
        }
        return null;
    }
}
```

**Modified controllers** (replace 6 identical inline blocks):
- `Student\LessonChatController::ask()` and `::logs()`
- `Student\QuizController::generate()`, `::submit()`, `::history()`
- `Student\LessonPracticeController`

Replace:
```php
$isEnrolled = $lesson->topic->schoolClass->students()
    ->where('users.id', $student->id)->exists();
if (!$isEnrolled) {
    return response()->json(['error' => 'You are not enrolled in this class.'], 403);
}
```

With:
```php
if ($deny = $this->enrollmentGuard->denyIfNotEnrolled($student, $lesson)) {
    return $deny;
}
```

Each affected controller injects `EnrollmentGuard` via constructor.

---

### C4. Consolidate Mastery Calculation (Req 12)

**Modified:** `backend/app/Services/Mastery/MasteryCalculator.php`

Add a public method and named constants:

```php
// Named constants — single source of truth
public const THRESHOLD_PASS    = 70;   // score >= 70% → mastery 100%
public const MASTERY_NONE      = 0;
public const MASTERY_ATTEMPTED = 50;
public const MASTERY_COMPLETE  = 100;

/**
 * Calculate mastery tier from a best quiz score.
 * Used by QuizController::submit() and LessonProgress updates.
 */
public function calculateLessonMastery(?int $bestScore): int
{
    if ($bestScore === null)                  return self::MASTERY_NONE;
    if ($bestScore >= self::THRESHOLD_PASS)   return self::MASTERY_COMPLETE;
    return self::MASTERY_ATTEMPTED;
}
```

**Modified:** `Student\QuizController.php`
- Inject `MasteryCalculator` in constructor.
- Delete private `calculateMastery()` method.
- Replace all calls to `$this->calculateMastery(...)` with `$this->masteryCalculator->calculateLessonMastery(...)`.

---

### C5. Fix topics.quarter_id Nullable Constraint (Req 13)

**New migration:** `backend/database/migrations/YYYY_MM_DD_fix_topics_quarter_id_nullable.php`

```php
Schema::table('topics', function (Blueprint $table) {
    $table->unsignedBigInteger('quarter_id')->nullable()->change();
});
```

**Modified:** `TopicController::storeTopic()` — ensure `quarter_id` is not set:
```php
$topic = Topic::create([
    'class_id'    => $classId,
    'quarter_id'  => null,        // explicitly null for teacher-created topics
    'title'       => $request->title,
    'description' => $request->description,
    'order_index' => $orderIndex + 1,
]);
```

**Modified:** `Topic` model — ensure `quarter_id` is in `$fillable` and nullable.

**Modified:** `TopicController` validation — add rule:
```php
'class_id OR quarter_id required' // custom rule or at-least-one validation
```

---

### C6. Remove Drifting lesson_count Counter (Req 14)

**New migration:**
```php
Schema::table('topics', function (Blueprint $table) {
    $table->dropColumn('lesson_count');
});
```

**Modified:** `TopicController::storeTopic()` — remove `'lesson_count' => 0` from create array.

**Modified:** `TopicController::storeLessonForTopic()` — remove `$topic->increment('lesson_count')`.

**Modified:** `TopicController::destroyLesson()` — remove `$topic->decrement('lesson_count')`.

**Modified:** All queries that read `lesson_count` in API responses — replace with `withCount('lessons')`:
```php
Topic::where('class_id', $classId)
    ->withCount('lessons')
    ->orderBy('order_index')
    ->get();
// lesson_count becomes lessons_count in the response automatically
```

---

### C7. Link classes.subject to subjects FK (Req 15)

**New migration:**
```php
Schema::table('classes', function (Blueprint $table) {
    $table->unsignedBigInteger('subject_id')->nullable()->after('subject');
    $table->foreign('subject_id')->references('id')->on('subjects')->nullOnDelete();
});

// Back-fill existing rows
DB::statement("
    UPDATE classes
    SET subject_id = subjects.id
    FROM subjects
    WHERE LOWER(classes.subject) = LOWER(subjects.name)
");
```

**Modified:** `SchoolClass` model — add `subject_id` to `$fillable`, add relationship:
```php
public function subjectModel(): BelongsTo
{
    return $this->belongsTo(Subject::class, 'subject_id');
}
```

**Modified:** `TeacherClassController::store()` and `AdminClassController::store()` — accept `subject_id` in validation and store it.

**Modified:** `MasteryCalculator::getStudentProgressSummary()` — use `subject_id` join for subject display:
```php
->select('classes.id', 'classes.name', 'classes.subject', 'subjects.name as subject_name')
->leftJoin('subjects', 'classes.subject_id', '=', 'subjects.id')
```

---

### C8. Remove Redundant topics.order Column (Req 16)

**New migration:**
```php
Schema::table('topics', function (Blueprint $table) {
    $table->dropColumn('order');
});
```

**Modified:** `TopicController::storeTopic()` — remove `'order' => $orderIndex + 1` from create.

**Modified:** `Topic` model `$fillable` — remove `'order'`.

**Modified:** `DatabaseSeeder` — remove `order` column from topic seeding.

---

## Stream D — Configuration

### D1. Move All Magic Constants to Env-Driven Config (Req 17, 22)

#### Backend config files

**New file:** `backend/config/rag.php`
```php
return [
    'top_k'              => env('RAG_TOP_K', 5),
    'similarity_threshold' => env('RAG_SIMILARITY_THRESHOLD', 0.5),
    'chunk_size'         => env('RAG_CHUNK_SIZE', 500),
    'chunk_overlap'      => env('RAG_CHUNK_OVERLAP', 50),
];
```

**New file:** `backend/config/quiz.php`
```php
return [
    'max_attempts' => env('QUIZ_MAX_ATTEMPTS', 3),
];
```

**Modified:** `backend/config/services.php` — add Mistral block:
```php
'mistral' => [
    'api_key'         => env('MISTRAL_API_KEY'),
    'model'           => env('MISTRAL_MODEL', 'mistral-small-latest'),
    'embedding_model' => env('MISTRAL_EMBEDDING_MODEL', 'mistral-embed'),
    'embed_url'       => env('MISTRAL_EMBED_URL', 'https://api.mistral.ai/v1/embeddings'),
    'chat_url'        => env('MISTRAL_CHAT_URL', 'https://api.mistral.ai/v1/chat/completions'),
],
```

**Modified:** `backend/config/cors.php`:
```php
'allowed_origins' => array_filter(
    explode(',', env('CORS_ALLOWED_ORIGINS', '')),
    fn($o) => trim($o) !== ''
),
```

**Modified:** `EmbeddingService.php` — replace private constants:
```php
// Remove: private const API_URL = '...'
// Remove: private const MODEL = '...'
// Use:    config('services.mistral.embed_url')
//         config('services.mistral.embedding_model')
```

**Modified:** `QuizController.php`:
```php
// Remove: private const MAX_ATTEMPTS = 3;
// Use:    config('quiz.max_attempts', 3)
```

**Modified:** `LessonRetriever.php`, `TextChunker.php` — replace inline literals:
```php
// top_k
config('rag.top_k', 5)
// similarity_threshold
config('rag.similarity_threshold', 0.5)
// chunk_size, chunk_overlap in TextChunker
config('rag.chunk_size', 500), config('rag.chunk_overlap', 50)
```

#### Frontend env

**Modified:** `src/lib/api.ts`:
```ts
baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api',
```

**New file:** `src/.env.example` (or root `.env.example` for Vite):
```
VITE_API_BASE_URL=http://localhost:8000/api
```

**Updated:** `backend/.env.example` — document all new variables:
```
MISTRAL_API_KEY=
MISTRAL_MODEL=mistral-small-latest
MISTRAL_EMBEDDING_MODEL=mistral-embed
MISTRAL_EMBED_URL=https://api.mistral.ai/v1/embeddings
MISTRAL_CHAT_URL=https://api.mistral.ai/v1/chat/completions

QUIZ_MAX_ATTEMPTS=3

RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.5
RAG_CHUNK_SIZE=500
RAG_CHUNK_OVERLAP=50

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

APP_DOMAIN=learnshift.local
```

---

## Stream E — Frontend UX Standardization

### E1. Shared useApiRequest Hook and UI Components (Req 18)

**New file:** `src/lib/useApiRequest.ts`

```ts
import { useState, useCallback } from 'react'
import { AxiosError } from 'axios'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApiRequest<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null, loading: false, error: null
  })

  const execute = useCallback(async (fn: () => Promise<{ data: T }>) => {
    setState({ data: null, loading: true, error: null })
    try {
      const res = await fn()
      setState({ data: res.data, loading: false, error: null })
      return res.data
    } catch (err) {
      const msg = err instanceof AxiosError
        ? (err.response?.data?.message ?? err.message)
        : 'An unexpected error occurred.'
      setState({ data: null, loading: false, error: msg })
      throw err
    }
  }, [])

  return { ...state, execute }
}
```

**New file:** `src/components/ui/LoadingSpinner.tsx`

```tsx
export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      <span className="text-sm">{message}</span>
    </div>
  )
}
```

**New file:** `src/components/ui/ErrorMessage.tsx`

```tsx
export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 underline text-red-600">
          Try again
        </button>
      )}
    </div>
  )
}
```

**Migration pattern** for each existing page:

```tsx
// BEFORE
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  someApi.getData()
    .then(res => { setData(res.data); setLoading(false) })
    .catch(err => console.error(err))  // silent!
}, [])

// AFTER
const { data, loading, error, execute } = useApiRequest()

useEffect(() => {
  execute(() => someApi.getData())
}, [execute])

if (loading) return <LoadingSpinner />
if (error)   return <ErrorMessage message={error} onRetry={() => execute(() => someApi.getData())} />
```

This pattern is applied to all active pages that currently do ad-hoc loading state.

---

## Data Model Changes Summary

| Table | Change | Migration |
|---|---|---|
| `topics` | `quarter_id` → nullable | New migration |
| `topics` | Drop `lesson_count` | New migration |
| `topics` | Drop `order` | New migration |
| `classes` | Add `subject_id` FK nullable | New migration |

---

## New Files Summary

| Path | Purpose |
|---|---|
| `backend/app/Http/Middleware/EnsureRole.php` | Role enforcement middleware |
| `backend/app/Services/Storage/MaterialUploadService.php` | Unified file upload |
| `backend/app/Services/Rag/MaterialIngestionService.php` | Unified RAG ingestion pipeline |
| `backend/app/Services/EnrollmentGuard.php` | Shared enrollment check |
| `backend/app/Mail/WelcomeCredentials.php` | Bulk-created user welcome email |
| `backend/resources/views/emails/welcome-credentials.blade.php` | Email template |
| `backend/config/rag.php` | RAG parameters from env |
| `backend/config/quiz.php` | Quiz parameters from env |
| `backend/tests/Feature/RoleMiddlewareTest.php` | Role boundary tests |
| `src/lib/useApiRequest.ts` | Shared async state hook |
| `src/components/ui/LoadingSpinner.tsx` | Reusable loading component |
| `src/components/ui/ErrorMessage.tsx` | Reusable error component |

## Files Deleted

| Path | Reason |
|---|---|
| `passwords.txt` | Exposed credentials |
| `cnt}` | Garbage artifact |
| `test` | Garbage artifact |
| `2026_06_19_000001_create_messages_table.php` (root) | Misplaced duplicate |
| `MessageController.php` (root) | Misplaced duplicate |
| `backend/process_material5.php` | Debug artifact |
| `src/lib/supabase.ts` | Dead code with hardcoded secrets |
| `src/lib/supabaseApi.ts` | Dead code |
| `src/lib/supabaseTypes.ts` | Dead code |
| `src/lib/mockData.ts` | Dead code |
