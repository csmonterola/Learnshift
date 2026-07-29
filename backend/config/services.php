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

    /*
    |--------------------------------------------------------------------------
    | AI Provider Selection
    |--------------------------------------------------------------------------
    |
    | Supported: 'mistral', 'ollama_cloud'
    |
    | Providers are split per-purpose so you can use different backends for
    | chat/vision (e.g. Ollama Cloud) and embeddings (Mistral).
    |   AI_PROVIDER_CHAT     — chat completions + vision (default: ollama_cloud)
    |   AI_PROVIDER_EMBEDDING — text embeddings (default: mistral)
    |
    | The legacy AI_PROVIDER value is used as fallback when the purpose-specific
    | variable is not set.
    |
    */

    'ai_provider' => env('AI_PROVIDER', 'mistral'),
    'ai_provider_chat' => env('AI_PROVIDER_CHAT', env('AI_PROVIDER', 'mistral')),
    'ai_provider_embedding' => env('AI_PROVIDER_EMBEDDING', 'mistral'),

    'mistral' => [
        'api_key' => env('MISTRAL_API_KEY'),
        'model' => env('MISTRAL_MODEL', 'mistral-small-latest'),
        'vision_model' => env('MISTRAL_VISION_MODEL', 'pixtral-12b-2409'),
        'embedding_model' => env('MISTRAL_EMBEDDING_MODEL', 'mistral-embed'),
        'embedding_batch_size' => env('MISTRAL_EMBEDDING_BATCH_SIZE', 20),
        'embedding_concurrency' => env('MISTRAL_EMBEDDING_CONCURRENCY', 3),
    ],

    'ollama_cloud' => [
        'api_key' => env('OLLAMA_CLOUD_API_KEY'),
        'base_url' => env('OLLAMA_CLOUD_BASE_URL', 'https://ollama.com/v1'),
        'chat_model' => env('OLLAMA_CLOUD_CHAT_MODEL', 'qwen2.5-vl:7b'),
        'vision_model' => env('OLLAMA_CLOUD_VISION_MODEL', 'qwen2.5-vl:7b'),
        'embedding_model' => env('OLLAMA_CLOUD_EMBEDDING_MODEL', 'nomic-embed-text'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Image Extraction (Phase 1 — visual-content feature)
    |--------------------------------------------------------------------------
    |
    | Controls for extracting embedded images from uploaded learning materials
    | (PDF, DOCX, PPTX) during the ingestion pipeline.
    |
    */

    'image_extraction' => [
        'max_images_per_material'   => (int) env('IMAGE_EXTRACTION_MAX_PER_MATERIAL', 30),
        'min_image_dimension'       => (int) env('IMAGE_EXTRACTION_MIN_DIMENSION', 150),
        'min_file_size'             => (int) env('IMAGE_EXTRACTION_MIN_FILE_SIZE', 5000),
        'min_pixel_area'            => (int) env('IMAGE_EXTRACTION_MIN_PIXEL_AREA', 22500),
        'duplicate_hash_threshold'  => (int) env('IMAGE_EXTRACTION_DUPLICATE_THRESHOLD', 3),
        'aspect_ratio_limit'        => (float) env('IMAGE_EXTRACTION_ASPECT_RATIO', 6.0),
        'borderline_color_variance' => (float) env('IMAGE_EXTRACTION_COLOR_VARIANCE', 0.05),
    ],

];
