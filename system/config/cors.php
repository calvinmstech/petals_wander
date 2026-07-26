<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | The storefront/admin Next.js app calls this API from the browser with a
    | Bearer token (no cookies), so a permissive origin is safe here. The
    | configured FRONTEND_URL is allowed explicitly for clarity.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'docs', 'docs.openapi'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:8015'),
    ],

    // Dev: accept the app served from localhost, 127.0.0.1, or any LAN/WSL IP
    // (so it works whether the browser opens it via localhost or an IP host).
    'allowed_origins_patterns' => [
        '#^https?://localhost(:\d+)?$#',
        '#^https?://127\.0\.0\.1(:\d+)?$#',
        '#^https?://(\d{1,3}\.){3}\d{1,3}(:\d+)?$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
