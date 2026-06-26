<?php

return [

    /*
    |--------------------------------------------------------------------------
    | RAG Chunking Parameters
    |--------------------------------------------------------------------------
    |
    | These values control how lesson materials are split into chunks before
    | being embedded and stored for retrieval-augmented generation.
    |
    */

    'chunk_max_tokens' => (int) env('RAG_CHUNK_MAX_TOKENS', 500),

    'chunk_overlap' => (int) env('RAG_CHUNK_OVERLAP', 50),

    /*
    |--------------------------------------------------------------------------
    | Retrieval Parameters
    |--------------------------------------------------------------------------
    |
    | These values control how the system retrieves relevant chunks when
    | answering a student's question.
    |
    */

    'retrieval_top_k' => (int) env('RAG_RETRIEVAL_TOP_K', 5),

    'similarity_threshold' => (float) env('RAG_SIMILARITY_THRESHOLD', 0.5),

];
