# Requirements Document

## Introduction

The Lesson RAG Chat feature adds a retrieval-augmented generation (RAG) chatbot to each lesson page on the LearnShift platform. Unlike the existing global chatbot (`ChatbotController` / `chatbot_logs`), which is a general-purpose AI with no material grounding, this chatbot is scoped to a single lesson — it retrieves context from the `LearningMaterial` records the teacher has uploaded for that lesson and uses them as the primary knowledge source for every AI response.

### Root Cause Analysis of Current AI Failures

After investigating the existing codebase, the following issues were identified:

**1. No Material Context in the Current System**
The original global `ChatbotController::ask` sends only a generic system prompt and recent chat history to Mistral AI. It does not read, retrieve, or reference any lesson materials. Students asking lesson-specific questions receive generic AI responses with no grounding in their actual curriculum.

**2. RAG Pipeline Exists But Has Integration Gaps**
A full RAG pipeline was partially scaffolded (services, migrations, models, routes) but the integration between material ingestion and retrieval was not complete:
- The `LessonChatController` and all RAG services exist in code but the **queue worker must be running** for `IngestLearningMaterialJob` to process materials. In a local dev environment without a running queue, materials are never indexed.
- The `EmbeddingService` calls `https://api.mistral.ai/v1/embeddings` but `withoutVerifying()` (SSL bypass) is only applied to the chat completion call, not the embedding call, which can silently fail in local Windows environments.
- The `LessonRetriever` uses a 0.5 cosine similarity threshold. If embeddings are not yet present (no queue worker, or ingestion failed), it returns an empty collection and the AI falls back to general knowledge with no indication to the student.

**3. Material Selection Not Available to Students**
Students cannot control which materials the AI uses. All indexed materials for a lesson are included indiscriminately. Students studying a specific document should be able to tell the AI to focus on it.

**4. No Source Attribution in the UI**
The `LessonChatController` returns a `source` field (`"lesson_materials"` or `"general"`) but the frontend `ChatPanel` component ignores it entirely. Students receive no indication of where an answer came from.

**5. Rigid Binary Fallback Strategy**
The current design is binary: either use lesson materials or fall back to general AI knowledge. There is no mechanism to supplement incomplete lesson materials with broader internet-based knowledge, and the AI is instructed to say "I can't find that in the materials" — which is unhelpful for students.

**6. Left Column Is Read-Only**
The left "Sources" panel in the lesson viewer only lists materials as clickable/downloadable items. It has no selection mechanism for controlling what the AI uses.

### Recommended Architecture

The architecture follows a **multi-tier retrieval hierarchy**:

1. **Primary**: Retrieve from student-selected, indexed lesson materials using pgvector cosine similarity search (semantic search).
2. **Secondary**: If retrieved context is insufficient (empty or low confidence), supplement with Mistral AI's general knowledge.
3. **Attribution**: Always label which tier(s) provided the answer.

**Why this approach beats alternatives:**
- Traditional fixed-size chunking: fast but cuts mid-sentence; semantic quality degrades at boundaries. The existing 500-token/50-overlap chunker is a good baseline.
- Pure embedding + vector search: excellent semantic match but requires index to be populated; empty index means total fallback. The tiered approach handles this gracefully.
- Hybrid retrieval (BM25 + vector): higher quality but requires a BM25 index (e.g., Elasticsearch) — overkill for a school platform with small material corpora per lesson.
- Web scraping at query time: too slow (adds 2–5s latency) and introduces unpredictable content. Better to rely on Mistral's pre-trained knowledge as the secondary tier.

The chosen approach — **pgvector semantic search + Mistral general knowledge fallback + source attribution** — offers the best balance of response quality, system simplicity, and reliability for an educational platform.

### Content Hierarchy

```
Subject → Quarter → Topic → Lesson → LearningMaterial
```

A `LearningMaterial` is associated with a lesson via `lesson_id` on the `learning_materials` table.

---

## Glossary

- **Lesson_Chat**: The lesson-scoped RAG chatbot described in this document, distinct from the Global_Chatbot.
- **Global_Chatbot**: The existing general-purpose chatbot at `ChatbotController::ask`, with no material grounding.
- **LearningMaterial**: A teacher-uploaded file (PDF, DOCX, or PPTX) or link stored in the `learning_materials` table, optionally linked to a lesson via `lesson_id`.
- **Embedding**: A high-dimensional numeric vector representation of a text chunk, used for semantic similarity search.
- **Vector_Store**: A persistent store of text chunk embeddings associated with a specific lesson, enabling semantic retrieval.
- **Chunk**: A fixed-size segment of extracted text from a LearningMaterial with overlap to preserve context across chunk boundaries.
- **Retriever**: The component that converts a student query into an embedding and queries the Vector_Store to return the top-K most relevant Chunks.
- **RAG_Pipeline**: The end-to-end process: retrieve relevant Chunks from selected materials → inject into system prompt → call Mistral AI → return attributed response.
- **Lesson_Chat_Log**: A database record of a student's question, the retrieved context, the AI response, source attribution, and relevant metadata for a Lesson_Chat interaction.
- **ai_sync**: The boolean field on `learning_materials` that signals a material should be indexed into the Vector_Store.
- **Ingestion_Job**: A background queue job that extracts text from a LearningMaterial, chunks it, embeds each Chunk, and upserts the embeddings into the Vector_Store.
- **Source_Panel**: The left column of the lesson viewer UI that displays lesson materials with checkboxes for student selection.
- **Selected_Materials**: The subset of LearningMaterials that a student has checked in the Source_Panel, used as the exclusive retrieval scope for that session.
- **Source_Attribution**: A label attached to each AI response indicating whether the answer came from lesson materials, general AI knowledge, or a combination.
- **Student**: An authenticated platform user with the student role.
- **Teacher**: An authenticated platform user with the teacher role who uploads LearningMaterials.
- **Ingestion_Status**: The current state of a LearningMaterial's indexing lifecycle: `none`, `pending`, `processing`, `indexed`, or `failed`.

---

## Requirements

### Requirement 1: Lesson-Scoped Material Retrieval

**User Story:** As a student, I want the lesson chatbot to answer my questions using the materials my teacher uploaded for this lesson, so that I get answers grounded in what I'm actually studying.

#### Acceptance Criteria

1. WHEN a student submits a question to the Lesson_Chat for a given lesson, THE Retriever SHALL query only the Vector_Store entries associated with that request's `lesson_id`, and SHALL return at most the top 5 Chunks ranked by descending cosine similarity score, with ties broken by `chunk_id` ascending.
2. WHEN the Retriever returns one or more Chunks with cosine similarity score ≥ 0.5, THE RAG_Pipeline SHALL include those Chunks as context in the system prompt sent to Mistral AI, ordered by descending similarity score.
3. IF no LearningMaterial with `ai_sync = true` and `ingestion_status = indexed` exists for the lesson, THEN THE Lesson_Chat SHALL include a notice in the system prompt indicating that no indexed lesson materials are available, SHALL proceed to call Mistral AI using general knowledge context, and SHALL set `source` to `"general"` in the response so that a helpful response is still returned to the student.
4. THE Lesson_Chat SHALL NOT retrieve or use Chunks from any Vector_Store entry whose `lesson_id` differs from the `lesson_id` supplied in the current request.
5. IF the embedding call for the student's question fails (e.g., network error or non-2xx response from the embeddings endpoint), THEN THE Lesson_Chat SHALL return HTTP 502 with a user-facing error message without attempting to query the Vector_Store.

---

### Requirement 2: Material Ingestion Pipeline

**User Story:** As a teacher, I want my uploaded lesson materials to be automatically indexed so that the lesson chatbot can use them without any extra steps.

#### Acceptance Criteria

1. WHEN a LearningMaterial is newly created with `ai_sync = true` and a non-null `lesson_id`, OR WHEN an existing LearningMaterial's `file_path` changes while `ai_sync = true`, OR WHEN an existing LearningMaterial transitions from `ai_sync = false` to `ai_sync = true`, THE System SHALL dispatch an Ingestion_Job to process that material.
2. WHEN an Ingestion_Job runs, THE System SHALL extract plain text from the file based on its `file_type` (PDF, DOCX, or PPTX).
3. WHEN text is extracted and the resulting text is non-empty, THE System SHALL split it into Chunks using the configured `maxTokens` (default 500) and `overlap` (default 50 tokens) values. The Ingestion_Job SHALL proceed with the configured chunk size even if it exceeds the default 500-token guideline, rather than fail the job. IF the extracted text is empty, THE System SHALL mark the LearningMaterial with `ingestion_status = failed` and log the error.
4. WHEN Chunks are produced, THE System SHALL generate an Embedding for each Chunk using the configured embedding model via the Mistral AI embeddings endpoint, applying SSL verification bypass for all HTTP calls to that endpoint.
5. WHEN Embeddings are generated, THE System SHALL remove all prior Vector_Store entries for that `material_id`, then insert the new Embeddings keyed by `lesson_id` and `material_id`. IF embedding generation fails after the prior entries have been deleted, THE System SHALL set `ingestion_status = failed` and log the error; the material will have no searchable content until re-ingestion succeeds.
6. IF text extraction from a file fails, THEN THE Ingestion_Job SHALL mark the LearningMaterial with an `ingestion_status` of `failed` and log the error, without rethrowing the exception to the queue.
7. WHEN a LearningMaterial is deleted, THE System SHALL remove all Vector_Store entries associated with that material's `material_id`.
8. WHEN a LearningMaterial is updated with `ai_sync = false`, THE System SHALL remove all Vector_Store entries for that material and set `ingestion_status` to `none`.
9. IF embedding generation or Vector_Store upsert fails during an Ingestion_Job, THEN THE System SHALL mark the LearningMaterial with `ingestion_status = failed` and log the error, without rethrowing the exception to the queue.
10. IF an Ingestion_Job exceeds 5 minutes of execution time, THEN THE System SHALL mark the LearningMaterial with `ingestion_status = failed`, log a timeout error, and release the job without retrying.

---

### Requirement 3: RAG-Grounded AI Response Generation

**User Story:** As a student, I want the chatbot to give me accurate, lesson-relevant answers, so that I can understand the material I'm studying.

#### Acceptance Criteria

1. WHEN a student submits a question and one or more Chunks with cosine similarity score ≥ 0.5 are retrieved from Selected_Materials, THE RAG_Pipeline SHALL construct a system prompt that includes those Chunks as the primary knowledge source and instructs Mistral AI to answer from them first.
2. WHEN Chunks with cosine similarity score ≥ 0.5 are retrieved, THE RAG_Pipeline SHALL pass at most the top 5 Chunks ranked by descending similarity score.
3. WHEN no Chunks with cosine similarity score ≥ 0.5 are found among the Selected_Materials (or no materials are selected), THE RAG_Pipeline SHALL construct a system prompt that includes no lesson material context, instructs Mistral AI to answer from general knowledge, and SHALL include a `source` field in the response with value `"general"`.
4. WHEN one or more Chunks with cosine similarity score ≥ 0.5 are found and used as the primary context, THE RAG_Pipeline SHALL include a `source` field in the response with value `"lesson_materials"`.
5. THE `source` field SHALL be set to `"mixed"` only when the RAG_Pipeline explicitly issues an instruction in the system prompt directing Mistral AI to supplement the retrieved lesson context with general knowledge due to insufficient chunk coverage; in all other cases where chunks are present and used, `source` SHALL be `"lesson_materials"`.
6. THE Lesson_Chat SHALL send the student's current question plus up to the last 5 Lesson_Chat_Log entries for that student and lesson (or all available entries if fewer than 5 exist), ordered by `created_at` ascending, as conversation history to Mistral AI.
7. IF a Mistral AI call returns a non-2xx HTTP response OR the request exceeds 30 seconds, THEN THE Lesson_Chat SHALL return an HTTP 502 response with a user-facing error message.
8. THE Lesson_Chat SHALL enforce a maximum question length of 2000 characters and return HTTP 422 for questions exceeding this limit.

---

### Requirement 4: Lesson Chat API Endpoint

**User Story:** As a frontend developer, I want a dedicated lesson chat API endpoint that supports material selection, so that I can integrate fine-grained RAG control independently from the global chatbot.

#### Acceptance Criteria

1. THE System SHALL expose a POST endpoint at `/api/student/lessons/{lesson}/chat` where `{lesson}` is an integer lesson ID, accepting `question` (required, string, max 2000 characters) and `material_ids` (optional, array of integers, max 50 elements) in the request body. IF `material_ids` contains non-integer values, THE System SHALL return HTTP 422.
2. IF the `lesson` does not exist, THEN THE System SHALL return HTTP 404.
3. IF the authenticated Student is not enrolled in the class to which the lesson belongs, THEN THE System SHALL return HTTP 403.
4. WHEN a successful response is generated, THE System SHALL return a JSON object containing `response` (string), `source` (one of `"lesson_materials"`, `"general"`, or `"mixed"`), `log_id` (integer), and `lesson_id` (integer).
5. THE Lesson_Chat endpoint SHALL be authenticated via Sanctum; unauthenticated requests SHALL receive HTTP 401, and authenticated non-student users SHALL receive HTTP 403.
6. IF the Mistral AI service is unavailable or returns an error during a lesson chat request, THEN THE System SHALL return HTTP 502 with a user-facing error message.
7. WHEN `material_ids` is provided and non-empty, THE Retriever SHALL scope retrieval to only the Vector_Store entries whose `material_id` is in the provided list AND whose `lesson_id` matches the current lesson; `material_id` values in the list that do not belong to the current lesson SHALL be silently ignored.
8. WHEN `material_ids` is absent or empty, THE Retriever SHALL use all indexed materials for the lesson (default behavior).

---

### Requirement 5: Lesson Chat Logging

**User Story:** As a teacher, I want to see what students are asking in lesson chats, so that I can identify knowledge gaps and review AI responses.

#### Acceptance Criteria

1. WHEN a Lesson_Chat response is successfully generated, THE System SHALL persist a Lesson_Chat_Log record containing `student_id`, `lesson_id`, `question`, `response`, `source`, `retrieved_chunk_count`, and `confidence_score`. IF the persist operation fails, THE System SHALL log the error and still return the AI response to the student without surfacing a storage error.
2. IF the `source` is `"lesson_materials"`, THEN THE Lesson_Chat_Log SHALL record `confidence_score` as 90.
3. IF the `source` is `"general"`, THEN THE Lesson_Chat_Log SHALL record `confidence_score` as 70.
4. IF the `source` is `"mixed"`, THEN THE Lesson_Chat_Log SHALL record `confidence_score` as 80.
5. THE System SHALL expose a GET endpoint at `/api/teacher/lessons/{lesson}/chat-logs`. WHEN a teacher whose class lists them as the assigned teacher requests lesson chat logs for a lesson in that class via this endpoint, THE System SHALL return Lesson_Chat_Log records for that lesson sorted by `created_at` descending, paginated at 20 per page, including fields: `id`, `student_id`, `question`, `response`, `source`, `retrieved_chunk_count`, `confidence_score`, and `created_at`.
6. IF a teacher requests lesson chat logs for a lesson whose class does not list that teacher as the assigned teacher, THEN THE System SHALL return HTTP 403.
7. THE System SHALL expose a GET endpoint at `/api/student/lessons/{lesson}/chat-logs`. WHEN an authenticated student requests their own Lesson_Chat_Log entries for a lesson they are enrolled in, THE System SHALL return those records. IF a student requests Lesson_Chat_Log entries belonging to a different student, THEN THE System SHALL return HTTP 403.

---

### Requirement 6: Ingestion Status Visibility for Teachers

**User Story:** As a teacher, I want to know whether my uploaded materials have been successfully indexed, so that I can trust that the chatbot is using them.

#### Acceptance Criteria

1. THE LearningMaterial record SHALL store an `ingestion_status` field with one of the values: `none`, `pending`, `processing`, `indexed`, or `failed`. The default value SHALL be `none`.
2. WHEN a LearningMaterial is newly created with `ai_sync = true`, OR WHEN an existing LearningMaterial transitions from `ai_sync = false` to `ai_sync = true` (either via a separate update or because `ai_sync=true` was set at creation time), OR WHEN an existing LearningMaterial's `file_path` changes while `ai_sync = true`, THE System SHALL set `ingestion_status` to `pending` before dispatching the Ingestion_Job.
3. WHEN the Ingestion_Job begins processing a material, THE System SHALL update `ingestion_status` to `processing`.
4. WHEN the Ingestion_Job completes successfully, THE System SHALL update `ingestion_status` to `indexed`.
5. IF the Ingestion_Job fails at any stage (text extraction, embedding generation, or Vector_Store upsert), THEN THE System SHALL update `ingestion_status` to `failed`.
6. WHEN a LearningMaterial is updated with `ai_sync = false`, THE System SHALL set `ingestion_status` to `none`.
7. WHEN a teacher requests the list of LearningMaterials for lessons they are assigned to teach, or requests a single LearningMaterial record, THE System SHALL include `ingestion_status` in the response payload.

---

### Requirement 7: Material Selection Panel (Source Panel)

**User Story:** As a student, I want to choose which materials the AI uses when answering my questions, so that I can focus my study session on specific documents.

#### Acceptance Criteria

1. THE Source_Panel SHALL display each LearningMaterial associated with the current lesson as a selectable item with a visible checkbox.
2. WHEN a student checks a material's checkbox, THE Source_Panel SHALL mark that material as Selected and include its `material_id` in subsequent chat requests.
3. WHEN a student unchecks a material's checkbox, THE Source_Panel SHALL remove that material from the Selected_Materials set so that its `material_id` is no longer sent in subsequent chat requests.
4. THE Source_Panel SHALL allow multiple materials to be selected simultaneously.
5. WHEN the Source_Panel first loads and no checkboxes have been interacted with, all checkboxes SHALL be in an unchecked state and the Lesson_Chat SHALL use all indexed materials as the default retrieval scope.
6. WHEN the Selected_Materials set is empty (no checkboxes checked), THE Source_Panel SHALL display the text "Using all sources" to indicate the default all-materials scope is active.
7. IF a material's `ingestion_status` is `indexed`, THE Source_Panel SHALL render that material's checkbox item with a green status indicator and the checkbox SHALL be enabled.
8. IF a material's `ingestion_status` is `pending` or `processing`, THE Source_Panel SHALL render that material's item with a pulsing loading indicator and the checkbox SHALL be disabled.
9. IF a material's `ingestion_status` is `failed` or `none`, THE Source_Panel SHALL render that material's item with a warning indicator and the checkbox SHALL be disabled.
10. THE Source_Panel SHALL preserve checkbox state within a browser session (no page-reload persistence required).
11. THE Source_Panel SHALL display a count badge showing the number of currently selected materials out of the total number of selectable materials (those with `ingestion_status = indexed`), for example "2 of 3 sources selected". Materials that are still processing, failed, or not yet indexed SHALL be excluded from both the numerator and the denominator of this count.
12. THE Source_Panel SHALL refresh each material's `ingestion_status` by polling the materials endpoint at an interval of ≤ 30 seconds while the lesson page is open.
13. WHEN a material's `ingestion_status` transitions away from `indexed` during an active session (e.g., due to re-ingestion triggered by a teacher update), THE Source_Panel SHALL automatically deselect that material, disable its checkbox, and update the count badge accordingly.

---

### Requirement 8: Internet Access and Knowledge Fallback Strategy

**User Story:** As a student, I want the AI to give me a helpful answer even when my lesson materials don't fully cover my question, so that I never get an unhelpful "I don't know" response.

#### Acceptance Criteria

1. WHEN one or more Chunks with cosine similarity score ≥ 0.5 are retrieved from Selected_Materials, THE RAG_Pipeline SHALL answer primarily from the lesson material context and set `source` to `"lesson_materials"`.
2. WHEN no Chunks with cosine similarity score ≥ 0.5 are retrieved from Selected_Materials, THE RAG_Pipeline SHALL instruct Mistral AI to answer from its pre-trained general knowledge and set `source` to `"general"`.
3. WHEN the RAG_Pipeline explicitly issues an instruction in the system prompt directing Mistral AI to supplement retrieved lesson context with general knowledge due to insufficient chunk coverage, THE RAG_Pipeline SHALL set `source` to `"mixed"`.
4. THE RAG_Pipeline SHALL NOT include any instruction in the system prompt directing Mistral AI to refuse to answer or state that it cannot find the answer in the materials.
5. THE Lesson_Chat SHALL always return a non-empty AI-generated response string regardless of whether lesson materials are available.
6. THE RAG_Pipeline SHALL include in every system prompt one of the following explicit instructions corresponding to the source scenario: (a) when `source = "lesson_materials"`: instruct the AI to answer using only the provided lesson material context; (b) when `source = "general"`: instruct the AI to answer from its general knowledge as no lesson materials are available; (c) when `source = "mixed"`: instruct the AI to use the provided lesson material context first and supplement with general knowledge where the context is insufficient.

---

### Requirement 9: Source Attribution UI

**User Story:** As a student, I want to know where each AI answer came from, so that I can trust the response and know when to consult my actual materials.

#### Acceptance Criteria

1. WHEN the Lesson_Chat API returns a response with `source = "lesson_materials"`, THE Chat_Panel SHALL display a green-tinted badge labeled "Lesson Material" directly below or to the right of the AI's message text.
2. WHEN the Lesson_Chat API returns a response with `source = "mixed"`, THE Chat_Panel SHALL display a blue-tinted badge labeled "Mixed Sources" directly below or to the right of the AI's message text.
3. WHEN the Lesson_Chat API returns a response with `source = "general"`, THE Chat_Panel SHALL display a gray-tinted badge labeled "General Knowledge" directly below or to the right of the AI's message text.
4. THE Chat_Panel SHALL display a persistent source context indicator in the chat header. WHEN one or more materials are in the Selected_Materials set, THE indicator SHALL show the text "Using N sources" where N is the count of selected materials. WHEN the Selected_Materials set is empty (default all-materials mode), THE indicator SHALL show "Using all sources".
5. WHEN the student changes their material selection in the Source_Panel, THE Chat_Panel SHALL update the source context indicator within 500 milliseconds.
6. IF the Lesson_Chat API response contains an absent, null, or unrecognized `source` value, THE Chat_Panel SHALL display a gray-tinted badge labeled "Unknown Source" and SHALL NOT throw a rendering error.

---

### Requirement 10: Global Chatbot Isolation

**User Story:** As a platform operator, I want the lesson chatbot and the global chatbot to remain independent, so that changes to one do not affect the other.

#### Acceptance Criteria

1. THE Global_Chatbot SHALL NOT import, call, or depend on the Vector_Store, EmbeddingService, LessonRetriever, or any other service or model class introduced exclusively for the Lesson_Chat feature.
2. THE Lesson_Chat SHALL use only `lesson_chat_logs` as its conversation history source, and THE Global_Chatbot SHALL use only `chatbot_logs` as its conversation history source; neither chatbot SHALL read from or write to the other's log table.
3. THE Lesson_Chat_Log records SHALL be stored in a separate database table (`lesson_chat_logs`) from the `chatbot_logs` table used by the Global_Chatbot.
4. WHEN the Global_Chatbot is requested and the Vector_Store service is unavailable but the database and Mistral AI service are both reachable, THE Global_Chatbot SHALL continue to accept student questions and return Mistral AI responses without any change in availability, HTTP status codes, or response JSON format.
5. WHEN the Lesson_Chat feature is deployed or its services are restarted, THE Global_Chatbot SHALL continue to serve requests without requiring a restart or redeployment of its own service components.

---

### Requirement 11: Round-Trip Embedding Consistency

**User Story:** As a developer, I want the embedding and retrieval pipeline to be deterministic, so that the same question always retrieves the same chunks given the same materials.

#### Acceptance Criteria

1. WHEN the same Chunk text is re-embedded using the same embedding model name and version that was used to produce the stored Embedding, THE resulting Embedding SHALL have a cosine similarity of ≥ 0.999 with the original stored Embedding.
2. IF the cosine similarity between a re-embedded Chunk and its stored Embedding falls below 0.999 under the same model name and version, THE System SHALL flag the affected LearningMaterial for re-ingestion by setting its `ingestion_status` to `pending`.
3. WHEN the same question is submitted twice to the Retriever for the same lesson with the same Selected_Materials, the same embedding model name and version, and no changes to the Vector_Store between the two submissions, THE Retriever SHALL return the same set of Chunk IDs in the same ranked order.
4. WHEN the same question text is embedded twice using the same embedding model name and version, THE System SHALL produce identical embedding vectors such that their cosine similarity equals 1.0.
5. WHEN two or more Chunks have equal cosine similarity scores for a given query, THE Retriever SHALL break ties by `chunk_id` ascending to guarantee a stable, deterministic ordering.
