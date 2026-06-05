<?php

namespace App\Services\Assuntos;

use App\Helpers\TextNormalizer;
use App\Services\Storage\CollectionStore;
use Illuminate\Support\Str;

class AssuntoService
{
    public function __construct(private readonly CollectionStore $store)
    {
    }

    /**
     * @param array<string, mixed> $filtros
     * @return array<int, array<string, mixed>>
     */
    public function listar(array $filtros = []): array
    {
        return collect($this->store->all('assuntos'))
            ->filter(fn (array $assunto): bool => ! filled($filtros['disciplinaId'] ?? null) || $assunto['disciplinaId'] === $filtros['disciplinaId'])
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
        $disciplinaId = (string) ($data['disciplinaId'] ?? '');
        $existing = collect($this->listar(['disciplinaId' => $disciplinaId]))
            ->first(fn (array $assunto): bool => TextNormalizer::normalize((string) ($assunto['nome'] ?? '')) === $nomeNormalizado);

        if ($existing) {
            return $existing;
        }

        $now = now()->toIso8601String();

        return $this->store->create('assuntos', [
            'id' => 'ass-'.Str::slug($nomeNormalizado).'-'.Str::lower(Str::random(5)),
            'disciplinaId' => $disciplinaId,
            'nome' => $nome,
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);
    }
}
