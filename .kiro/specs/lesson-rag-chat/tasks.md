# Implementation Plan: Lesson RAG Chat

## Overview

Implement a retrieval-augmented generation (RAG) chatbot scoped to individual lesson pages, using pgvector for semantic search over teacher-uploaded materials, Mistral AI for embeddings and chat completions, and Laravel queued jobs for background ingestion. The implementation follows the architecture defined in the design document, building from database migrations up through service classes, background jobs, HTTP controllers, and tests.

---

## Tasks

- [x] 1. Database migrations and schema setup
  - [x] 1.1 Create `add_ingestion_status_to_learning_materials` migration
    - Add `ingestion_status` enum column (`none`, `pending`, `processing`, `indexed`, `failed`) with default `none` after `ai_sync` on the `learning_materials` table
    - _Requirements: 6.1_
  - [x] 1.2 Create `create_lesson_embeddings_table` migration
    - Enable `pgvector` extension (`CREATE EXTENSION IF NOT EXISTS vector`)
    - Create `lesson_embeddings` table: `id`, `lesson_id` (FK → lessons), `material_id` (FK → learning_materials), `chunk_index`, `chunk_text`, `embedding VECTOR(1024)`, `created_at`
    - Add indexes on `lesson_id`, `material_id`, and an IVFFlat index on `embedding` using `vector_cosine_ops`
    - _Requirements: 2.4, 2.5_
  - [x] 1.3 Create `create_lesson_chat_logs_table` migration
    - Create `lesson_chat_logs` table: `id`, `student_id` (FK → users), `lesson_id` (FK → lessons), `question`, `response`, `source`, `retrieved_chunk_count`, `confidence_score`, `timestamps`
    - Add composite index on `(student_id, lesson_id, created_at)`
    - _Requirements: 5.1, 5.3, 7.3_

- [x] 2. Eloquent models
  - [x] 2.1 Create `LessonEmbedding` model (`App\Models\LessonEmbedding`)
    - Set `$fillable`: `lesson_id`, `material_id`, `chunk_index`, `chunk_text`, `embedding`
    - Cast `embedding` to `array` for pgvector compatibility
    - _Requirements: 2.4, 2.5_
  - [x] 2.2 Create `LessonChatLog` model (`App\Models\LessonChatLog`)
    - Set `$fillable`: `student_id`, `lesson_id`, `question`, `response`, `source`, `retrieved_chunk_count`, `confidence_score`
    - Add `student()` and `lesson()` BelongsTo relationships
    - _Requirements: 5.1_
  - [x] 2.3 Update `LearningMaterial` model
    - Add `ingestion_status` to `$fillable`
    - _Requirements: 6.1, 6.2_
  - [x] 2.4 Update `Lesson` model
    - Add `learningMaterials()` HasMany relationship and `topic()` BelongsTo relationship (if not already present)
    - _Requirements: 1.1_

- [x] 3. RAG service layer — EmbeddingService and TextExtractor
  - [x] 3.1 Implement `EmbeddingService` (`App\Services\Rag\EmbeddingService`)
    - Implement `embed(string $text): array` — calls Mistral AI embeddings endpoint (`mistral-embed` model), returns float array
    - Implement `embedBatch(array $texts): array` — calls endpoint once for all texts, returns array of vectors in same order
    - Throw `EmbeddingException` on non-2xx or timeout
    - _Requirements: 2.4_
  - [ ]* 3.2 Write property test for EmbeddingService batch count invariant
    - **Property 4: Embedding Count Matches Chunk Count**
    - **Validates: Requirements 2.4**
    - Generate random arrays of 1–50 chunk texts (mocked HTTP), assert returned array has exactly N elements in input order
  - [x] 3.3 Implement `TextExtractor` (`App\Services\Rag\TextExtractor`)
    - Implement `extract(string $filePath, string $fileType): string`
    - Delegate to `smalot/pdfparser` for PDF, `phpoffice/phpword` for DOCX, `phpoffice/phppresentation` for PPTX
    - Throw `TextExtractionException` on failure
    - _Requirements: 2.2_
  - [ ]* 3.4 Write unit tests for TextExtractor
    - Test one fixture file per type (PDF, DOCX, PPTX) — assert non-empty string returned
    - Test unsupported type or corrupt file — assert `TextExtractionException` thrown
    - _Requirements: 2.2_

- [x] 4. RAG service layer — TextChunker
  - [x] 4.1 Implement `TextChunker` (`App\Services\Rag\TextChunker`)
    - Implement `chunk(string $text, int $maxTokens = 500, int $overlap = 50): array`
    - Use token approximation of 1 token ≈ 4 characters
    - Split on whitespace boundaries to avoid cutting mid-word
    - Apply 50-token overlap between consecutive chunks
    - Handle edge cases: empty string (return `[]`), text shorter than one chunk (return single element)
    - _Requirements: 2.3_
  - [ ]* 4.2 Write property test for TextChunker size and overlap invariants
    - **Property 3: Chunker Size and Overlap Invariants**
    - **Validates: Requirements 2.3**
    - Generate random strings of 1–100,000 characters; assert every chunk ≤ 500 tokens and that last 50 tokens of chunk `i` equal first 50 tokens of chunk `i+1` for all consecutive pairs
  - [ ]* 4.3 Write unit tests for TextChunker edge cases
    - Test empty string → empty array
    - Test text shorter than 500 tokens → single chunk
    - _Requirements: 2.3_

- [x] 5. Checkpoint — core service layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. RagPromptBuilder and LessonRetriever
  - [x] 6.1 Implement `RagPromptBuilder` (`App\Services\Rag\RagPromptBuilder`)
    - Implement `build(Collection $chunks, Collection $history, string $question): array`
    - When `$chunks` is non-empty: construct system prompt with chunk texts as primary knowledge source
    - When `$chunks` is empty: construct system prompt with `"No indexed lesson materials are available for this lesson. Answering from general knowledge."` notice
    - Include up to last 5 history pairs (user/assistant) ordered `created_at` ascending, followed by current question as final user message
    - Return full Mistral messages array (`[system_message, ...history_pairs, user_message]`)
    - _Requirements: 1.2, 1.3, 3.1, 3.5_
  - [ ]* 6.2 Write property test for RagPromptBuilder chunk inclusion
    - **Property 2: Retrieved Chunks Appear in System Prompt**
    - **Validates: Requirements 1.2, 3.1**
    - Generate random non-empty chunk text arrays; assert every chunk text appears in the built system prompt
  - [ ]* 6.3 Write property test for RagPromptBuilder conversation history window
    - **Property 8: Conversation History Window and Order**
    - **Validates: Requirements 3.5**
    - Generate random N log records (0–20); assert messages array includes exactly `min(N, 5)` prior log pairs ordered `created_at` ascending, with current question as last user message
  - [ ]* 6.4 Write unit tests for RagPromptBuilder
    - Test empty chunks → system prompt contains the "no indexed materials" notice
    - Test non-empty chunks → all chunk texts appear in system message
    - _Requirements: 1.2, 1.3, 3.1_
  - [x] 6.5 Implement `LessonRetriever` (`App\Services\Rag\LessonRetriever`)
    - Implement `retrieve(int $lessonId, array $queryVector, int $topK = 5): Collection`
    - Run cosine similarity query: `SELECT id, lesson_id, material_id, chunk_index, chunk_text, 1 - (embedding <=> '[...]') AS score FROM lesson_embeddings WHERE lesson_id = :lessonId AND 1 - (embedding <=> '[...]') >= 0.5 ORDER BY embedding <=> '[...]' ASC, id ASC LIMIT :topK`
    - Return empty collection when no results meet the 0.5 threshold
    - _Requirements: 1.1, 1.4, 3.2, 3.3, 8.2, 8.3_
  - [ ]* 6.6 Write property test for LessonRetriever isolation
    - **Property 1: Lesson-Scoped Retrieval Isolation**
    - **Validates: Requirements 1.1, 1.4**
    - Seed vector store with chunks across multiple distinct lesson IDs; assert results contain only chunks with the queried `lesson_id` and at most 5 items
  - [ ]* 6.7 Write property test for LessonRetriever determinism and tie-breaking
    - **Property 14: Retrieval Determinism and Tie-Breaking**
    - **Validates: Requirements 8.2, 8.3**
    - Submit same query vector twice with unchanged vector store; assert identical ordered chunk ID sets. Include chunks with equal scores; assert tie-broken by `id` ascending

- [x] 7. IngestLearningMaterialJob and LearningMaterialObserver
  - [x] 7.1 Create `IngestLearningMaterialJob` (`App\Jobs\IngestLearningMaterialJob`)
    - Implement `handle(TextExtractor $extractor, TextChunker $chunker, EmbeddingService $embedder): void`
    - Status lifecycle: set `processing` on entry, `indexed` on success, `failed` on any `Throwable`
    - On success: delete all `lesson_embeddings` rows for `material_id`, then bulk-insert new embeddings keyed by `lesson_id` and `material_id`
    - Catch all `Throwable`, log error, set `ingestion_status = failed`, do NOT rethrow
    - Set `tries = 1`, `timeout = 120`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.9, 6.3, 6.4, 6.5_
  - [ ]* 7.2 Write property test for IngestLearningMaterialJob upsert
    - **Property 5: Upsert Replaces Prior Embeddings**
    - **Validates: Requirements 2.5**
    - For random `material_id` with pre-existing embeddings, run job with new chunk set; assert DB contains exactly the new chunks for that `material_id` with zero rows from the prior set
  - [ ]* 7.3 Write unit tests for IngestLearningMaterialJob error handling
    - Test extraction failure → `ingestion_status = failed`, exception not rethrown
    - Test embedding failure → `ingestion_status = failed`, exception not rethrown
    - Test success → full status lifecycle `pending → processing → indexed`
    - _Requirements: 2.6, 2.9, 6.3, 6.4, 6.5_
  - [x] 7.4 Create `LearningMaterialObserver` (`App\Observers\LearningMaterialObserver`)
    - `created` event: if `ai_sync = true` AND `lesson_id != null` → set `ingestion_status = pending`, dispatch `IngestLearningMaterialJob`
    - `updated` event, `ai_sync` changed false→true OR `file_path` changed AND `ai_sync = true` → set `ingestion_status = pending`, dispatch job
    - `updated` event, `ai_sync` changed true→false → delete `lesson_embeddings` for `material_id`, set `ingestion_status = none`
    - `deleted` event: delete all `lesson_embeddings` rows for `material_id`
    - _Requirements: 2.1, 2.7, 2.8, 6.2, 6.6_
  - [ ]* 7.5 Write property test for material deletion embedding cleanup
    - **Property 6: Material Deletion Removes All Embeddings**
    - **Validates: Requirements 2.7**
    - For random `material_id` with seeded embeddings, delete the material; assert `COUNT(lesson_embeddings WHERE material_id = ?) = 0`
  - [ ]* 7.6 Write unit tests for LearningMaterialObserver
    - Test create with `ai_sync=true` + `lesson_id` set → job dispatched, `ingestion_status = pending`
    - Test update `ai_sync` false→true → job dispatched, `ingestion_status = pending`
    - Test update `ai_sync` true→false → embeddings deleted, `ingestion_status = none`
    - Test delete → all embeddings for `material_id` deleted
    - _Requirements: 2.1, 2.7, 2.8, 6.2, 6.6_
  - [x] 7.7 Register `LearningMaterialObserver` in `AppServiceProvider::boot()`
    - Add `LearningMaterial::observe(LearningMaterialObserver::class);`
    - _Requirements: 2.1_

- [x] 8. Checkpoint — ingestion pipeline
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. LessonChatController and lesson chat endpoint
  - [x] 9.1 Create `LessonChatController` (`App\Http\Controllers\Api\Student\LessonChatController`)
    - Implement `ask(Request $request, Lesson $lesson): JsonResponse`
    - Validate `question` (required, string, max:2000); return 422 on violation
    - Check student enrollment via `$lesson->topic->schoolClass->students`; return 403 with `{"error": "You are not enrolled in the class for this lesson."}` if not enrolled
    - Embed the question via `EmbeddingService::embed()`
    - Retrieve chunks via `LessonRetriever::retrieve($lesson->id, $queryVector)`
    - Determine `source` (`"lesson_materials"` if chunks non-empty, `"general"` if empty)
    - Set `confidence_score` (90 for `lesson_materials`, 70 for `general`)
    - Fetch last 5 `LessonChatLog` entries for this student + lesson ordered `created_at` ASC as history
    - Build prompt via `RagPromptBuilder::build()`
    - Call Mistral AI chat completions; catch non-2xx and `ConnectionException` → return 502 with user-facing message
    - Persist `LessonChatLog` record
    - Return `{response, source, log_id, lesson_id}`
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3_
  - [ ]* 9.2 Write property test for question length validation
    - **Property 9: Question Length Validation**
    - **Validates: Requirements 3.7**
    - Generate random strings of lengths 1–2000; assert HTTP 200 (not rejected for length). Generate random strings of lengths 2001–3000; assert HTTP 422
  - [ ]* 9.3 Write property test for response payload completeness
    - **Property 10: Response Payload Completeness**
    - **Validates: Requirements 4.4**
    - Generate random valid question inputs (mocked AI); assert JSON response contains exactly `response` (string), `source` (one of `"lesson_materials"` or `"general"`), `log_id` (integer), `lesson_id` (integer)
  - [ ]* 9.4 Write property test for source field assignment by similarity threshold
    - **Property 7: Source Field Assignment by Similarity Threshold**
    - **Validates: Requirements 3.3, 3.4**
    - Generate random retrieval result sets with all scores below 0.5 (or empty); assert `source = "general"`. Generate sets with at least one score ≥ 0.5; assert `source = "lesson_materials"`
  - [ ]* 9.5 Write property test for chat log persistence
    - **Property 11: Chat Log Persistence with All Required Fields**
    - **Validates: Requirements 5.1**
    - Generate random valid question inputs (mocked AI); after each request assert `LessonChatLog` record exists with non-null values for all required fields
  - [ ]* 9.6 Write unit tests for LessonChatController authorization and error paths
    - Test unauthenticated → 401
    - Test teacher token → 403
    - Test student not enrolled → 403
    - Test lesson not found → 404
    - Test Mistral 500 → 502
    - Test Mistral timeout (`ConnectionException`) → 502
    - Test `source = 'lesson_materials'` → `confidence_score = 90`
    - Test `source = 'general'` → `confidence_score = 70`
    - _Requirements: 3.6, 3.7, 4.2, 4.3, 4.5, 4.6, 5.2, 5.3_

- [x] 10. Register lesson chat route
  - [x] 10.1 Add `POST /api/student/lessons/{lesson}/chat` route
    - Register in the student API route group with `auth:sanctum` and `student` role middleware
    - Bind to `LessonChatController@ask`
    - _Requirements: 4.1, 4.5_

- [x] 11. LessonChatLogController and teacher log endpoint
  - [x] 11.1 Create `LessonChatLogController` (`App\Http\Controllers\Api\Teacher\LessonChatLogController`)
    - Implement `index(Request $request, Lesson $lesson): JsonResponse`
    - Verify `$lesson->topic->schoolClass->teacher_id === $request->user()->id`; return 403 if mismatch
    - Return paginated (20/page) `LessonChatLog` records for `lesson_id`, ordered `created_at` DESC
    - Include fields: `id`, `student_id`, `question`, `response`, `source`, `retrieved_chunk_count`, `confidence_score`, `created_at`
    - _Requirements: 5.4, 5.5, 5.6_
  - [ ]* 11.2 Write property test for teacher log list ingestion status inclusion
    - **Property 12: Teacher Log List Includes Ingestion Status**
    - **Validates: Requirements 6.7**
    - Generate random N materials with varying `ingestion_status` values; assert every item in the teacher content endpoint response includes `ingestion_status` from `{none, pending, processing, indexed, failed}`
  - [ ]* 11.3 Write unit tests for LessonChatLogController
    - Test teacher for wrong class → 403
    - Test student accessing another student's logs → 403
    - Test pagination returns ≤ 20 per page, sorted by `created_at` DESC
    - _Requirements: 5.4, 5.5, 5.6_
  - [x] 11.4 Add `GET /api/teacher/lessons/{lesson}/chat-logs` route
    - Register in the teacher API route group with `auth:sanctum` and `teacher` role middleware
    - Bind to `LessonChatLogController@index`
    - _Requirements: 5.4_

- [x] 12. Update ContentController to expose ingestion_status in material responses
  - [x] 12.1 Include `ingestion_status` in the LearningMaterial resource/response payload returned by the teacher content endpoint
    - Update the resource or controller response to add `ingestion_status` to every material item
    - _Requirements: 6.7_

- [x] 13. Checkpoint — HTTP layer and logging
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Property-based tests for embedding determinism
  - [ ]* 14.1 Write property test for EmbeddingService determinism
    - **Property 13: Embedding Determinism**
    - **Validates: Requirements 8.1**
    - Generate random text inputs; embed each twice with a mocked deterministic embedder; assert cosine similarity of the two vectors ≥ 0.999

- [ ] 15. Integration tests
  - [ ]* 15.1 Write full ingestion pipeline integration test
    - Upload a fixture PDF material with `ai_sync=true` and a `lesson_id`; dispatch job synchronously; assert `lesson_embeddings` rows exist for that `material_id` with correct `lesson_id`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]* 15.2 Write full chat pipeline integration test
    - Seed `lesson_embeddings` for a lesson; submit a student question via `POST /api/student/lessons/{lesson}/chat`; assert response contains `source = 'lesson_materials'` and a `LessonChatLog` is persisted
    - _Requirements: 1.1, 1.2, 3.1, 3.4, 4.4, 5.1_
  - [ ]* 15.3 Write global chatbot isolation integration test
    - Call `POST /api/student/chatbot/ask` with pgvector present; assert `lesson_embeddings` table is never queried and response format is unchanged
    - _Requirements: 7.1, 7.2, 7.4_

- [x] 16. Final checkpoint — full suite
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 5, 8, 13, and 16 ensure incremental validation
- The design has 14 correctness properties — each has a dedicated property-based test sub-task
- Property tests use `giorgiosironi/eris` (PHPUnit-compatible); install via `composer require --dev giorgiosironi/eris`
- File extraction packages (`smalot/pdfparser`, `phpoffice/phpword`, `phpoffice/phppresentation`) must be added to `composer.json` before tasks 3.3 and 7.1
- pgvector must be enabled on the PostgreSQL instance before running migrations (tasks 1.2)
- The IVFFlat index on `lesson_embeddings` should be created after bulk loading initial embeddings for best performance

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["3.1", "3.3", "4.1"] },
    { "id": 3, "tasks": ["3.2", "3.4", "4.2", "4.3"] },
    { "id": 4, "tasks": ["6.1", "6.5"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "6.6", "6.7", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 7, "tasks": ["7.5", "7.6", "7.7"] },
    { "id": 8, "tasks": ["9.1", "10.1"] },
    { "id": 9, "tasks": ["9.2", "9.3", "9.4", "9.5", "9.6"] },
    { "id": 10, "tasks": ["11.1", "12.1"] },
    { "id": 11, "tasks": ["11.2", "11.3", "11.4", "14.1"] },
    { "id": 12, "tasks": ["15.1", "15.2", "15.3"] }
  ]
}
```
