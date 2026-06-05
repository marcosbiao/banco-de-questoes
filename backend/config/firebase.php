<?php

return [
    'enabled' => (bool) env('FIREBASE_ENABLED', false),
    'project_id' => env('FIREBASE_PROJECT_ID'),
    'credentials_path' => env('FIREBASE_CREDENTIALS_PATH'),
    'database_url' => env('FIREBASE_DATABASE_URL'),
    'storage_bucket' => env('FIREBASE_STORAGE_BUCKET'),
    'use_emulator' => (bool) env('FIREBASE_USE_EMULATOR', false),
    'emulator_host' => env('FIRESTORE_EMULATOR_HOST'),
];
