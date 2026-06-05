<?php

namespace App\Services\Disciplinas;

use App\Helpers\TextNormalizer;
use App\Services\Storage\CollectionStore;
use Illuminate\Support\Str;

class DisciplinaService
{
    public function __construct(private readonly CollectionStore $store)
    {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listar(): array
    {
        return collect($this->store->all('disciplinas'))
            ->sortBy('nome')
            ->values()
            ->all();
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function criar(array $data): array
    {
        $nome = trim((string) ($data['nome'] ?? ''));
        $nomeNormalizado = TextNormalizer::normalize($nome);
        $existing = collect($this->listar())
            ->first(fn (array $disciplina): bool => TextNormalizer::normalize((string) ($disciplina['nome'] ?? '')) === $nomeNormalizado);

        if ($existing) {
            return $existing;
        }

        $now = now()->toIso8601String();

        return $this->store->create('disciplinas', [
            'id' => 'disc-'.Str::slug($nomeNormalizado).'-'.Str::lower(Str::random(5)),
            'nome' => $nome,
            'descricao' => $data['descricao'] ?? '',
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);
    }
}
