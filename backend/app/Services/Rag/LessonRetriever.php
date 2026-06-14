<?php

namespace App\Services\Rag;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class LessonRetriever
{
    /**
     * Retrieve the top-K most semantically similar chunks for a lesson.
     *
     * Uses pgvector cosine distance operator (<=>) for similarity scoring.
     * Only chunks with cosine similarity >= 0.5 are returned.
     * Ties are broken by id ASC for deterministic ordering.
     *
     * @param  int    $lessonId     The lesson to scope retrieval to
     * @param  array  $queryVector  Float array from EmbeddingService::embed()
     * @param  int    $topK         Maximum number of chunks to return (default 5)
     * @return Collection           Collection of objects with id, chunk_text, score
     */
    public function retrieve(int $lessonId, array $queryVector, int $topK = 5): Collection
    {
        $vectorLiteral = '[' . implode(',', $queryVector) . ']';

        $rows = DB::select(
            'SELECT id, lesson_id, material_id, chunk_index, chunk_text,
                    1 - (embedding <=> ?) AS score
             FROM lesson_embeddings
             WHERE lesson_id = ?
               AND 1 - (embedding <=> ?) >= 0.5
             ORDER BY embedding <=> ? ASC, id ASC
             LIMIT ?',
            [$vectorLiteral, $lessonId, $vectorLiteral, $vectorLiteral, $topK]
        );

        return collect($rows);
    }
}
