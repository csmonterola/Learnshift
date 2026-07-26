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
     * @param  int[]  $materialIds  Optional: restrict retrieval to these material IDs;
     *                              foreign-lesson IDs are silently ignored by the lesson_id clause
     * @return Collection           Collection of objects with id, lesson_id, material_id, chunk_index, page_number, chunk_text, score
     */
    public function retrieve(
        int   $lessonId,
        array $queryVector,
        int   $topK = 5,
        array $materialIds = []
    ): Collection {
        $vectorLiteral = '[' . implode(',', $queryVector) . ']';

        $materialFilter = '';
        $bindings       = [$vectorLiteral, $lessonId, $vectorLiteral, $vectorLiteral, $topK];

        if (!empty($materialIds)) {
            $placeholders   = implode(',', array_fill(0, count($materialIds), '?'));
            $materialFilter = "AND material_id IN ({$placeholders})";
            // Inject material IDs before the LIMIT binding
            array_splice($bindings, 4, 0, $materialIds);
        }

        $rows = DB::select(
            "SELECT id, lesson_id, material_id, chunk_index, page_number,
                    content_type, material_image_id, chunk_text,
                    1 - (embedding <=> ?) AS score
             FROM lesson_embeddings
             WHERE lesson_id = ?
               AND 1 - (embedding <=> ?) >= 0.5
               {$materialFilter}
             ORDER BY embedding <=> ? ASC, id ASC
             LIMIT ?",
            $bindings
        );

        return collect($rows);
    }
}
