<?php

return [
    'name' => env('APP_NAME', 'Banco de Questões e Gerador de Listas'),
    'env' => env('APP_ENV', 'local'),
    'debug' => (bool) env('APP_DEBUG', true),
    'url' => env('APP_URL', 'http://localhost:8000'),
    'timezone' => 'America/Recife',
    'locale' => env('APP_LOCALE', 'pt_BR'),
    'fallback_locale' => env('APP_FALLBACK_LOCALE', 'pt_BR'),
    'faker_locale' => env('APP_FAKER_LOCALE', 'pt_BR'),
    'key' => env('APP_KEY'),
    'cipher' => 'AES-256-CBC',
];
