# Requirements Document

## Introduction

The Lesson RAG Chat feature adds a retrieval-augmented generation (RAG) chatbot to each lesson page on the LearnShift platform. Unlike the existing global chatbot (which is a general-purpose AI with no material grounding), this chatbot is strictly scoped to a single lesson — it retrieves content only from the `LearningMaterial` records associated with that lesson and uses them as the primary context for every AI response.

The system ingests teacher-uploaded materials (PDF, DOCX, PPTX) linked to a lesson via the `lesson_id` foreign key on `learning_materials`, extracts their text, chunks and embeds the text into a vector store, and retrieves the most relevant chunks at query time to inject into the Mistral AI prompt. If no relevant material is found, the AI may fall back to general knowledge but must clearly indicate it is doing so.

Content hierarchy: **Subject → Quarter → Topic → Lesson → LearningMaterial**

---

## Glossary

- **Lesson_Chat**: The lesson-scoped RAG chatbot described in this document, distinct from the global chatbot.
- **Global_Chatbot**: The existing general-purpose chatbot at `ChatbotController::ask`, with no material grounding.
- **LearningMaterial**: A teacher-uploaded file (PDF, DOCX, or PPTX) stored in the `learning_materials` table, optionally linked to a lesson via `lesson_id`.
- **Embedding**: A high-dimensional numeric vector representation of a text chunk, used for semantic similarity search.
- **Vector_Store**: A persistent store of text chunk embeddings associated with a specific lesson, enabling semantic retrieval.
- **Chunk**: A fixed-size segment of extracted text from a LearningMaterial, with overlap to preserve context across boundaries.
- **Retriever**: The component that converts a student query into an embedding and queries the Vector_Store to return the top-K most relevant Chunks.
- **RAG_Pipeline**: The end-to-end process: retrieve relevant Chunks → inject into system prompt → call Mistral AI → return response.
- **Lesson_Chat_Log**: A log entry in the database recording a student's question, the retrieved context, the AI response, and relevant metadata for a Lesson_Chat interaction.
- **ai_sync**: The boolean field on `learning_materials` that signals a material should be indexed into the Vector_Store.
- **Ingestion_Job**: A background queue job that extracts text from a LearningMaterial, chunks it, embeds each Chunk, and upserts the embeddings into the Vector_Store.
- **Student**: An authenticated platform user with the student role.
- **Teacher**: An authenticated platform user with the teacher role who uploads LearningMaterials.

---

## Requirements

### Requirement 1: Lesson-Scoped Material Retrieval

**User Story:** As a student, I want the lesson chatbot to answer my questions using the materials my teacher uploaded for this lesson, so that I get answers grounded in what I'm actually studying.

#### Acceptance Criteria

1. WHEN a student submits a question to the Lesson_Chat for a given lesson, THE Retriever SHALL query only the Vector_Store entries associated with that request's `lesson_id`, and SHALL return at most the top 5 Chunks ranked by semantic similarity score.
2. WHEN the Retriever returns one or more Chunks, THE RAG_Pipeline SHALL include those Chunks as context in the system prompt sent to Mistral AI.
3. IF no LearningMaterial with `ai_sync = true` exists for the lesson, THEN THE Lesson_Chat SHALL include a notice in the system prompt indicating that no indexed lesson materials are available, and SHALL proceed to call Mistral AI using general knowledge context only.
4. THE Lesson_Chat SHALL NOT retrieve or use Chunks from any Vector_Store entry whose `lesson_id` differs from the `lesson_id` supplied in the current request.

---

### Requirement 2: Material Ingestion Pipeline

**User Story:** As a teacher, I want my uploaded lesson materials to be automatically indexed so that the lesson chatbot can use them without any extra steps.

#### Acceptance Criteria

1. WHEN a LearningMaterial is newly created with `ai_sync = true` and a non-null `lesson_id`, OR WHEN an existing LearningMaterial's `file_path` changes and `ai_sync = true`, THE System SHALL dispatch an Ingestion_Job to process that material.
2. WHEN an Ingestion_Job runs, THE System SHALL extract plain text from the file based on its `file_type` (PDF, DOCX, or PPTX).
3. WHEN text is extracted, THE System SHALL split it into Chunks of at most 500 tokens with an overlap of 50 tokens between consecutive Chunks.
4. WHEN Chunks are produced, THE System SHALL generate an Embedding for each Chunk using the configured embedding model.
5. WHEN Embeddings are generated, THE System SHALL remove all prior Vector_Store entries for that `material_id`, then insert the new Embeddings keyed by `lesson_id` and `material_id`, so that no stale Chunks remain if re-ingestion is interrupted.
6. IF text extraction from a file fails, THEN THE Ingestion_Job SHALL mark the LearningMaterial with an `ingestion_status` of `failed` and log the error, without rethrowing the exception to the queue.
7. WHEN a LearningMaterial is deleted, THE System SHALL remove all Vector_Store entries associated with that material's `material_id`.
8. WHEN a LearningMaterial is updated with `ai_sync = false`, THE System SHALL remove all Vector_Store entries for that material and set `ingestion_status` to `none`.
9. IF embedding generation or Vector_Store upsert fails during an Ingestion_Job, THEN THE System SHALL mark the LearningMaterial with `ingestion_status = failed` and log the error, without rethrowing the exception to the queue.

---

### Requirement 3: RAG-Grounded AI Response Generation

**User Story:** As a student, I want the chatbot to give me accurate, lesson-relevant answers, so that I can understand the material I'm studying.

#### Acceptance Criteria

1. WHEN a student submits a question and relevant Chunks are retrieved, THE RAG_Pipeline SHALL construct a system prompt that includes the retrieved Chunks as the primary knowledge source and instructs Mistral AI to answer from them.
2. WHEN relevant Chunks are retrieved, THE RAG_Pipeline SHALL pass at most the top 5 Chunks ranked by semantic similarity score.
3. WHEN no relevant Chunks are found with a cosine similarity score ≥ 0.5, THE RAG_Pipeline SHALL construct a system prompt that includes no lesson material context, instructs Mistral AI to answer from general knowledge, and SHALL include a `source` field in the response with value `"general"`.
4. WHEN relevant Chunks are found, THE RAG_Pipeline SHALL include a `source` field in the response with value `"lesson_materials"`.
5. THE Lesson_Chat SHALL send the student's current question plus the last 5 Lesson_Chat_Log entries for that student and lesson, ordered by `created_at` ascending, as conversation history to Mistral AI.
6. IF a Mistral AI call returns a non-2xx HTTP response OR the request times out, THEN THE Lesson_Chat SHALL return an HTTP 502 response with a user-facing error message.
7. THE Lesson_Chat SHALL enforce a maximum question length of 2000 characters and return HTTP 422 for questions exceeding this limit.

---

### Requirement 4: Lesson Chat API Endpoint

**User Story:** As a frontend developer, I want a dedicated lesson chat API endpoint so that I can integrate the lesson chatbot independently from the global chatbot.

#### Acceptance Criteria

1. THE System SHALL expose a POST endpoint at `/api/student/lessons/{lesson}/chat` where `{lesson}` is an integer lesson ID, accepting `question` (required, string, max 2000 characters) in the request body.
2. IF the `lesson` does not exist, THEN THE System SHALL return HTTP 404.
3. IF the authenticated Student is not enrolled in the class to which the lesson belongs, THEN THE System SHALL return HTTP 403.
4. WHEN a successful response is generated, THE System SHALL return a JSON object containing `response` (string), `source` ("lesson_materials" or "general"), `log_id` (integer), and `lesson_id` (integer).
5. THE Lesson_Chat endpoint SHALL be authenticated via Sanctum and restricted to users with the `student` role.
6. IF the Mistral AI service is unavailable or returns an error during a lesson chat request, THEN THE System SHALL return HTTP 502 with a user-facing error message.

---

### Requirement 5: Lesson Chat Logging

**User Story:** As a teacher, I want to see what students are asking in lesson chats, so that I can identify knowledge gaps and review AI responses.

#### Acceptance Criteria

1. WHEN a Lesson_Chat response is successfully generated, THE System SHALL persist a Lesson_Chat_Log record containing `student_id`, `lesson_id`, `question`, `response`, `source`, `retrieved_chunk_count`, and `confidence_score`.
2. IF the `source` is `"lesson_materials"`, THEN THE Lesson_Chat_Log SHALL record `confidence_score` as 90.
3. IF the `source` is `"general"`, THEN THE Lesson_Chat_Log SHALL record `confidence_score` as 70.
4. WHEN a teacher whose class lists them as the assigned teacher requests lesson chat logs for a lesson in that class, THE System SHALL return all Lesson_Chat_Log records for that lesson sorted by `created_at` descending, paginated at 20 per page, including fields: `id`, `student_id`, `question`, `response`, `source`, `retrieved_chunk_count`, `confidence_score`, and `created_at`.
5. IF a teacher requests lesson chat logs for a lesson whose class does not list that teacher as the assigned teacher, THEN THE System SHALL return HTTP 403.
6. IF a student requests Lesson_Chat_Log entries belonging to a different student, THEN THE System SHALL return HTTP 403.

---

### Requirement 6: Ingestion Status Visibility for Teachers

**User Story:** As a teacher, I want to know whether my uploaded materials have been successfully indexed, so that I can trust that the chatbot is using them.

#### Acceptance Criteria

1. THE LearningMaterial record SHALL store an `ingestion_status` field with one of the values: `none`, `pending`, `processing`, `indexed`, or `failed`. The default value SHALL be `none`.
2. WHEN a LearningMaterial is newly created with `ai_sync = true`, OR WHEN an existing LearningMaterial transitions from `ai_sync = false` to `ai_sync = true`, THE System SHALL set `ingestion_status` to `pending` before dispatching the Ingestion_Job.
3. WHEN the Ingestion_Job begins processing a material, THE System SHALL update `ingestion_status` to `processing`.
4. WHEN the Ingestion_Job completes successfully, THE System SHALL update `ingestion_status` to `indexed`.
5. IF the Ingestion_Job fails at any stage (text extraction, embedding generation, or Vector_Store upsert), THEN THE System SHALL update `ingestion_status` to `failed`.
6. WHEN a LearningMaterial is updated with `ai_sync = false`, THE System SHALL set `ingestion_status` to `none`.
7. WHEN a teacher requests the list of their LearningMaterials, THE System SHALL include `ingestion_status` in each material's response payload.

---

### Requirement 7: Global Chatbot Isolation

**User Story:** As a platform operator, I want the lesson chatbot and the global chatbot to remain independent, so that changes to one do not affect the other.

#### Acceptance Criteria

1. THE Global_Chatbot SHALL NOT use the Vector_Store or any Lesson_Chat retrieval logic.
2. THE Lesson_Chat SHALL use only `lesson_chat_logs` as its conversation history source, and THE Global_Chatbot SHALL use only `chatbot_logs` as its conversation history source; neither chatbot SHALL read from the other's log table.
3. THE Lesson_Chat_Log records SHALL be stored in a separate database table from the `chatbot_logs` table used by the Global_Chatbot.
4. WHEN the Vector_Store service is unavailable, THE Global_Chatbot SHALL continue to accept student questions and return Mistral AI responses without any change in availability or response format.

---

### Requirement 8: Round-Trip Embedding Consistency

**User Story:** As a developer, I want the embedding and retrieval pipeline to be deterministic so that the same question always retrieves the same chunks given the same materials.

#### Acceptance Criteria

1. WHILE the configured embedding model version is unchanged, re-embedding the same Chunk text SHALL produce an Embedding with cosine similarity ≥ 0.999 to the original stored Embedding.
2. WHEN the same question is submitted twice to the Retriever for the same lesson with no insertions, deletions, or re-indexing of Vector_Store entries for that lesson between the two submissions, THE Retriever SHALL return the same set of Chunk IDs in the same ranked order.
3. WHEN two or more Chunks have equal similarity scores for a given query, THE Retriever SHALL break ties by `chunk_id` ascending to guarantee a stable, deterministic ordering.
