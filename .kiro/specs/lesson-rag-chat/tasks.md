# Implementation Plan: Lesson RAG Chat

## Overview

Implement the lesson-scoped RAG chatbot feature by patching four backend services, adding one new route, updating two frontend components, and writing property-based tests for all 15 correctness properties plus unit and integration tests. No database migrations are required — all tables already exist with the correct schema.

## Tasks

---

- [x] 1. Patch `EmbeddingService` — add SSL bypass to embedding call
  - [x] 1.1 Add `->withoutVerifying()` to the `Http` chain inside `embedBatch()` in `app/Services/Rag/EmbeddingService.php`
    - Mirror the SSL bypass already applied to the chat-completion call
    - Move the model name to `config('services.mistral.embedding_model', 'mistral-embed')` so it can be overridden via `.env`
    - _Requirements: 2.4_

  - [ ]* 1.2 Write unit tests for `EmbeddingService`
    - **Test:** HTTP 500 from Mistral → `EmbeddingException` thrown
    - **Test:** `withoutVerifying()` is present on the HTTP request (mock HTTP assertion)
    - _Requirements: 2.4_

---

- [x] 2. Patch `LessonRetriever` — add `material_ids` scoping
  - [x] 2.1 Add optional `array $materialIds = []` parameter to `LessonRetriever::retrieve()` in `app/Services/Rag/LessonRetriever.php`
    - When `$materialIds` is non-empty, append `AND material_id IN (…)` to the SQL and splice IDs into the bindings array before the LIMIT binding
    - When `$materialIds` is empty, behaviour is unchanged (all materials for the lesson)
    - Foreign-lesson IDs are silently ignored because the `lesson_id = ?` clause already filters them
    - _Requirements: 1.1, 1.4, 4.7, 4.8_

  - [ ]* 2.2 Write property test for lesson-scoped retrieval isolation (Property 1)
    - **Property 1: Lesson-Scoped Retrieval Isolation**
    - Seed the in-memory SQLite DB with chunks for multiple lesson IDs; assert results contain only the queried `lesson_id` and at most 5 chunks
    - **Validates: Requirements 1.1, 1.4**

  - [ ]* 2.3 Write property test for `material_ids` scoping narrows retrieval (Property 11)
    - **Property 11: Material ID Scoping Narrows Retrieval**
    - Seed multi-material store; supply a strict subset of `material_ids`; assert every returned chunk's `material_id` is in the supplied list
    - **Validates: Requirements 4.7, 4.8**

  - [ ]* 2.4 Write property test for retrieval determinism and tie-breaking (Property 15)
    - **Property 15: Retrieval Determinism and Tie-Breaking**
    - Submit the same query twice against an unchanged vector store; assert identical ordered chunk ID list; assert lower `id` wins on equal scores
    - **Validates: Requirements 11.3, 11.5**

---

- [x] 3. Patch `RagPromptBuilder` — add `$source` parameter and `mixed` tier
  - [x] 3.1 Add explicit `string $source = 'general'` parameter to `RagPromptBuilder::build()` in `app/Services/Rag/RagPromptBuilder.php`
    - Replace any internal chunk-count re-derivation with the passed `$source` value
    - Add `mixed` branch to `buildSystemPrompt()`: instructs Mistral to use lesson context first then supplement with general knowledge
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 8.6_

  - [ ]* 3.2 Write unit tests for `RagPromptBuilder`
    - **Test:** Empty chunks + `source = 'general'` → system prompt contains "general knowledge" instruction
    - **Test:** Chunks present + `source = 'lesson_materials'` → system prompt contains "ONLY the lesson materials"
    - **Test:** Chunks present + `source = 'mixed'` → system prompt contains "supplement" instruction
    - _Requirements: 3.1, 3.3, 3.5, 8.6_

  - [ ]* 3.3 Write property test for retrieved chunks appearing in system prompt (Property 2)
    - **Property 2: Retrieved Chunks Appear in System Prompt**
    - Generate random non-empty arrays of chunk text strings; assert every chunk text is present verbatim in the built system prompt when source is `lesson_materials` or `mixed`
    - **Validates: Requirements 1.2, 3.1, 3.2**

  - [ ]* 3.4 Write property test for conversation history window and order (Property 8)
    - **Property 8: Conversation History Window and Order**
    - Generate N random `LessonChatLog` records (0–20) with random `created_at` values; assert messages array contains exactly `min(N, 5)` prior log pairs ordered `created_at` ASC, with the current question as the last user message
    - **Validates: Requirements 3.6**

---

- [x] 4. Patch `IngestLearningMaterialJob` — empty-text guard + 5-minute timeout
  - [x] 4.1 Raise `public int $timeout` from 120 to 300 in `app/Jobs/IngestLearningMaterialJob.php`
    - Also add empty-text guard after `$extractor->extract()`: if `trim($text) === ''`, update `ingestion_status = 'failed'`, log a warning, and return early without calling `EmbeddingService`
    - _Requirements: 2.3, 2.10, 6.5_

  - [ ]* 4.2 Write unit tests for `IngestLearningMaterialJob`
    - **Test:** Empty extracted text → `ingestion_status = failed`, no embedding call made
    - **Test:** Extraction failure → `ingestion_status = failed`, no rethrow
    - **Test:** Embedding failure → `ingestion_status = failed`, no rethrow
    - **Test:** Success path → `ingestion_status = indexed`, correct chunk count in DB
    - **Test:** Status lifecycle: `pending → processing → indexed`
    - _Requirements: 2.3, 2.6, 2.9, 2.10, 6.3, 6.4, 6.5_

  - [ ]* 4.3 Write property test for upsert replaces prior embeddings (Property 5)
    - **Property 5: Upsert Replaces Prior Embeddings**
    - Generate random `material_id` + old/new chunk arrays in SQLite; after successful ingest run, assert DB contains exactly the new chunks and zero rows from the old set
    - **Validates: Requirements 2.5**

  - [ ]* 4.4 Write property test for embedding count matches chunk count (Property 4)
    - **Property 4: Embedding Count Matches Chunk Count**
    - Generate arrays of 1–50 chunk texts (mock HTTP); assert `embedBatch()` returns exactly N vectors in the same order
    - **Validates: Requirements 2.4**

---

- [ ] 5. Write property tests for `TextChunker` and embedding services
  - [ ]* 5.1 Write property test for chunker size and overlap invariants (Property 3)
    - **Property 3: Chunker Size and Overlap Invariants**
    - Generate random text strings 1–100,000 chars; assert every chunk ≤ 2000 characters; assert overlap: last N chars of chunk `i` equal first N chars of chunk `i+1`
    - **Validates: Requirements 2.3**

  - [ ]* 5.2 Write unit tests for `TextChunker`
    - **Test:** Empty string → returns empty array
    - **Test:** Text shorter than `maxTokens` → single chunk returned
    - _Requirements: 2.3_

  - [ ]* 5.3 Write unit tests for `TextExtractor`
    - **Test:** One fixture file per type (PDF, DOCX, PPTX) → returns non-empty string
    - **Test:** Unsupported file type → throws `TextExtractionException`
    - _Requirements: 2.2_

  - [ ]* 5.4 Write property test for embedding determinism (Property 14)
    - **Property 14: Embedding Determinism**
    - Generate random text inputs; mock the HTTP client to return a fixed deterministic vector; embed the same text twice; assert cosine similarity of the two result vectors equals 1.0
    - **Validates: Requirements 11.1, 11.4**

---

- [x] 6. Patch `LessonChatController` — `material_ids` + `mixed` source + student log endpoint
  - [x] 6.1 Update `ask()` in `app/Http/Controllers/Api/Student/LessonChatController.php`
    - Add `material_ids` to `$request->validate()` (`sometimes|array|max:50`, each element `integer`)
    - Pass `$materialIds` to `LessonRetriever::retrieve()`
    - Implement three-tier source logic: `chunkCount >= 2` → `lesson_materials`/90, `chunkCount === 1` → `mixed`/80, `chunkCount === 0` → `general`/70
    - Pass `$source` explicitly to `RagPromptBuilder::build()`
    - _Requirements: 3.3, 3.4, 3.5, 4.1, 4.4, 5.1, 5.2, 5.3, 5.4, 8.1, 8.2, 8.3_

  - [x] 6.2 Add `logs()` method to `LessonChatController`
    - `GET /api/student/lessons/{lesson}/chat-logs`
    - Scope query to `student_id = $request->user()->id` and `lesson_id = $lesson->id`
    - Paginate at 20 per page, return `LessonChatLog` records
    - Return 403 if student is not enrolled; 404 handled by model binding
    - _Requirements: 5.7_

  - [ ]* 6.3 Write unit tests for `LessonChatController`
    - **Test:** Unauthenticated → 401
    - **Test:** Teacher token → 403
    - **Test:** Student not enrolled → 403
    - **Test:** Lesson not found → 404
    - **Test:** `material_ids` contains non-integer → 422
    - **Test:** `EmbeddingService` throws → 502, no query to `lesson_embeddings`
    - **Test:** Mistral returns 500 → 502
    - **Test:** Mistral times out → 502
    - **Test:** `source = 'lesson_materials'` (≥2 chunks) → `confidence_score = 90`
    - **Test:** `source = 'mixed'` (1 chunk) → `confidence_score = 80`
    - **Test:** `source = 'general'` (0 chunks) → `confidence_score = 70`
    - **Test:** Successful request → response contains `response`, `source`, `log_id`, `lesson_id`
    - _Requirements: 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 6.4 Write property test for source field assignment by similarity threshold (Property 7)
    - **Property 7: Source Field Assignment by Similarity Threshold**
    - Generate random chunk counts (0, 1, 2–5) and assert the controller assigns the correct `source` value and `confidence_score` for each case
    - **Validates: Requirements 3.3, 3.4, 3.5, 8.1, 8.2, 8.3**

  - [ ]* 6.5 Write property test for question length validation boundary (Property 9)
    - **Property 9: Question Length Validation Boundary**
    - Generate random strings of length 1–3000; assert strings > 2000 chars return 422 and strings 1–2000 chars do not return 422 due to length
    - **Validates: Requirements 3.8, 4.1**

  - [ ]* 6.6 Write property test for response payload completeness (Property 10)
    - **Property 10: Response Payload Completeness**
    - Mock Mistral AI; generate random valid questions; assert response JSON contains `response` (non-empty string), `source` (one of three valid values), `log_id` (int or null), `lesson_id` (matching route param)
    - **Validates: Requirements 4.4**

  - [ ]* 6.7 Write property test for chat log persistence with all required fields (Property 12)
    - **Property 12: Chat Log Persistence with All Required Fields**
    - Mock Mistral AI; generate random valid questions; assert a `LessonChatLog` row is persisted with non-null values for all seven required fields
    - **Validates: Requirements 5.1**

---

- [x] 7. Register the new student chat-logs route
  - [x] 7.1 Add `Route::get('lessons/{lesson}/chat-logs', [LessonChatController::class, 'logs'])` inside the `student` prefix group in `routes/api.php`
    - Place it alongside the existing `lessons/{lesson}/chat` route for consistency
    - _Requirements: 5.7_

---

- [ ] 8. Write remaining observer and log-controller tests
  - [ ]* 8.1 Write unit tests for `LearningMaterialObserver`
    - **Test:** Create with `ai_sync=true` + `lesson_id` → job dispatched, `ingestion_status = pending`
    - **Test:** Create with `ai_sync=false` → job NOT dispatched
    - **Test:** Update `ai_sync` false→true → job dispatched
    - **Test:** Update `file_path` with `ai_sync=true` → job dispatched
    - **Test:** Update `ai_sync` true→false → embeddings deleted, `ingestion_status = none`
    - **Test:** Delete → embeddings deleted
    - _Requirements: 2.1, 2.7, 2.8, 6.1, 6.2, 6.6_

  - [ ]* 8.2 Write property test for material deletion removes all embeddings (Property 6)
    - **Property 6: Material Deletion Removes All Embeddings**
    - Seed random materials with embeddings; delete the material; assert `lesson_embeddings` row count for that `material_id` equals 0
    - **Validates: Requirements 2.7**

  - [ ]* 8.3 Write unit tests for `LessonChatLogController` (Teacher)
    - **Test:** Teacher for correct class → 200, paginated, sorted by `created_at` DESC
    - **Test:** Teacher for wrong class → 403
    - **Test:** Student accessing own logs → 200, only own records returned
    - **Test:** Pagination returns ≤ 20 per page
    - _Requirements: 5.5, 5.6, 5.7_

  - [ ]* 8.4 Write property test for teacher materials list includes `ingestion_status` (Property 13)
    - **Property 13: Teacher Materials List Includes `ingestion_status`**
    - Generate N materials with random `ingestion_status` values; assert every item in the endpoint response contains an `ingestion_status` field with a value from `{none, pending, processing, indexed, failed}`
    - **Validates: Requirements 6.7**

---

- [x] 9. Checkpoint — ensure all backend tests pass
  - Run `php artisan test` (or the project's test command) against the full PHP test suite.
  - Ensure all tests pass, ask the user if questions arise.

---

- [x] 10. Update `SourcePanel` frontend component
  - [x] 10.1 Add checkboxes, status indicators, count badge, and polling to `src/components/lesson/SourcePanel.tsx`
    - Render each `LearningMaterial` as a checkbox item; enable only when `ingestion_status === 'indexed'`
    - Status indicator: green dot for `indexed`, pulsing gray dot for `pending`/`processing`, yellow warning triangle for `failed`/`none`
    - Count badge: `"N of M selected"` where N = selected indexed materials, M = total indexed materials; show `"Using all sources"` when N = 0
    - Polling: `setInterval(fetchMaterials, 30_000)` with immediate fetch on mount; clear interval on unmount
    - Auto-deselect: when a material's status transitions away from `indexed`, remove its ID from `selectedMaterialIds` and update the count badge
    - Expose `selectedMaterialIds`, `onSelectionChange`, and `onMaterialsLoaded` props per the design interface
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13_

  - [ ]* 10.2 Write frontend tests for `SourcePanel` (`SourcePanel.test.tsx`)
    - **Test:** Indexed material → checkbox enabled, green indicator rendered
    - **Test:** Processing material → checkbox disabled, pulse indicator rendered
    - **Test:** Failed/none material → checkbox disabled, warning indicator rendered
    - **Test:** Checking a material → `onSelectionChange` called with correct Set
    - **Test:** Count badge shows `"2 of 3 selected"` with correct numerator/denominator
    - **Test:** Empty selection → `"Using all sources"` text visible
    - **Test:** Polling: `setInterval` called with interval ≤ 30000 ms
    - **Test:** Auto-deselect: if a selected material's status changes away from `indexed`, it is removed from selection
    - _Requirements: 7.1, 7.6, 7.7, 7.8, 7.9, 7.11, 7.12, 7.13_

---

- [x] 11. Update `ChatPanel` frontend component
  - [x] 11.1 Add source badges, header indicator, and `material_ids` in request body to `src/components/lesson/ChatPanel.tsx`
    - `SourceBadge` component: `lesson_materials` → green "Lesson Material", `mixed` → blue "Mixed Sources", `general` → gray "General Knowledge", null/unknown → gray "Unknown Source" (no rendering error)
    - Header indicator: `"Using N source(s)"` when `selectedMaterialIds.size > 0`; `"Using all sources"` when empty; update reactively via props (no async delay)
    - `sendMessage()`: include `material_ids: [...selectedMaterialIds]` in request body when set is non-empty; omit key when empty
    - Store each assistant message with its `source` and `log_id` for badge rendering
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 11.2 Write frontend tests for `ChatPanel` (`ChatPanel.test.tsx`)
    - **Test:** `source = 'lesson_materials'` → green "Lesson Material" badge rendered
    - **Test:** `source = 'mixed'` → blue "Mixed Sources" badge rendered
    - **Test:** `source = 'general'` → gray "General Knowledge" badge rendered
    - **Test:** `source = null` / unknown → gray "Unknown Source" badge rendered, no error thrown
    - **Test:** `selectedMaterialIds.size = 2` → header shows `"Using 2 sources"`
    - **Test:** `selectedMaterialIds.size = 0` → header shows `"Using all sources"`
    - **Test:** Header updates within 500 ms of selection change (synchronous state update in test)
    - **Test:** Request body includes `material_ids` when selection is non-empty
    - **Test:** Request body omits `material_ids` when selection is empty
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

---

- [x] 12. Checkpoint — ensure all frontend tests pass
  - Run `vitest --run` and confirm all `SourcePanel.test.tsx` and `ChatPanel.test.tsx` tests pass.
  - Ensure all tests pass, ask the user if questions arise.

---

- [ ] 13. Write integration tests
  - [ ]* 13.1 Full ingestion pipeline integration test
    - Upload a fixture PDF for a lesson → confirm job sets `ingestion_status = indexed` → confirm rows present in `lesson_embeddings` with correct `lesson_id` and `material_id`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.3, 6.4_

  - [ ]* 13.2 Full chat pipeline integration test
    - Seed embeddings for a known lesson → send a question that should match → confirm response has `source = 'lesson_materials'` and `retrieved_chunk_count > 0`
    - _Requirements: 1.1, 1.2, 3.1, 3.4, 4.4, 5.1_

  - [ ]* 13.3 `material_ids` filtering integration test
    - Seed two materials for a lesson → send chat request scoped to one `material_id` → confirm all returned chunks belong only to that material
    - _Requirements: 4.7, 4.8_

  - [ ]* 13.4 Global chatbot isolation integration test
    - Call `POST /api/student/chatbot/ask` → assert no query is made to `lesson_embeddings` (checked via DB query log)
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 13.5 Empty-text guard integration test
    - Ingest a fixture file that produces empty extracted text → confirm `ingestion_status = failed`
    - _Requirements: 2.3, 6.5_

---

- [x] 14. Final checkpoint — full test suite passes
  - Run `php artisan test` and `vitest --run` together.
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- No database migrations are required — all tables (`lesson_embeddings`, `learning_materials`, `lesson_chat_logs`) already exist with the correct schema
- Backend property-based tests use **giorgiosironi/eris** integrated with PHPUnit; each property test runs a minimum of 100 iterations
- Frontend tests use **Vitest + React Testing Library**
- Integration tests (tasks 13.1–13.5) require a real PostgreSQL + pgvector instance (CI database service)
- The `LearningMaterialObserver` and `LessonChatLogController` (Teacher) require **no code changes** — tests in task 8 verify existing behaviour
- Each property test file must begin with the tag comment: `// Feature: lesson-rag-chat, Property N: <property_text>`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "2.3", "2.4", "3.2", "3.3", "3.4", "4.2", "4.3", "4.4", "5.1", "5.2", "5.3", "5.4"] },
    { "id": 2, "tasks": ["6.1", "6.2"] },
    { "id": 3, "tasks": ["7.1"] },
    { "id": 4, "tasks": ["6.3", "6.4", "6.5", "6.6", "6.7", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 5, "tasks": ["10.1", "11.1"] },
    { "id": 6, "tasks": ["10.2", "11.2"] },
    { "id": 7, "tasks": ["13.1", "13.2", "13.3", "13.4", "13.5"] }
  ]
}
```
