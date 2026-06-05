<?php

namespace App\Services\Firebase;

use RuntimeException;

class FirebaseService
{
    /**
     * @return array<string, mixed>
     */
    public function configuracao(): array
    {
        return [
            'enabled' => $this->enabled(),
            'projectId' => config('firebase.project_id'),
            'credentialsPath' => config('firebase.credentials_path'),
            'databaseUrl' => config('firebase.database_url'),
            'storageBucket' => config('firebase.storage_bucket'),
            'useEmulator' => config('firebase.use_emulator'),
            'emulatorHost' => config('firebase.emulator_host'),
            'configured' => $this->configured(),
        ];
    }

    public function enabled(): bool
    {
        return (bool) config('firebase.enabled') && $this->configured();
    }

    public function configured(): bool
    {
        return filled(config('firebase.project_id')) && filled(config('firebase.credentials_path'));
    }

    public function firestore(): mixed
    {
        if (! class_exists(\Kreait\Firebase\Factory::class)) {
            throw new RuntimeException('Instale as dependências Composer antes de usar o Firebase.');
        }

        $factory = new \Kreait\Firebase\Factory();

        if (filled(config('firebase.credentials_path'))) {
            $factory = $factory->withServiceAccount(config('firebase.credentials_path'));
        }

        if (filled(config('firebase.project_id'))) {
            $factory = $factory->withProjectId(config('firebase.project_id'));
        }

        if (filled(config('firebase.database_url'))) {
            $factory = $factory->withDatabaseUri(config('firebase.database_url'));
        }

        return $factory->createFirestore()->database();
    }
}
