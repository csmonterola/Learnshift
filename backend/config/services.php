<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'mistral' => [
        'api_key' => env('MISTRAL_API_KEY'),
        'model'   => env('MISTRAL_MODEL', 'mistral-small-latest'),
    ],

    'rag' => [
        'chunk_max_tokens' => env('RAG_CHUNK_MAX_TOKENS', 500),
        'chunk_overlap' => env('RAG_CHUNK_OVERLAP', 50),
        'retrieval_top_k' => env('RAG_RETRIEVAL_TOP_K', 5),
        'similarity_threshold' => env('RAG_SIMILARITY_THRESHOLD', 0.5),
    ],

    'quiz' => [
        'max_attempts' => env('QUIZ_MAX_ATTEMPTS', 3),
        'pass_threshold' => env('QUIZ_PASS_THRESHOLD', 70),
    ],
];
