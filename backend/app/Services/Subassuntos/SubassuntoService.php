<?php

namespace App\Services\Subassuntos;

use App\Helpers\TextNormalizer;
use App\Services\Storage\CollectionStore;
use Illuminate\Support\Str;

class SubassuntoService
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
        return collect($this->store->all('subassuntos'))
            ->filter(function (array $subassunto) use ($filtros): bool {
                if (filled($filtros['disciplinaId'] ?? null) && $subassunto['disciplinaId'] !== $filtros['disciplinaId']) {
                    return false;
                }

                if (filled($filtros['assuntoId'] ?? null) && $subassunto['assuntoId'] !== $filtros['assuntoId']) {
                    return false;
                }

                return true;
            })
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
        $assuntoId = (string) ($data['assuntoId'] ?? '');
        $existing = collect($this->listar(['assuntoId' => $assuntoId]))
            ->first(fn (array $subassunto): bool => TextNormalizer::normalize((string) ($subassunto['nome'] ?? '')) === $nomeNormalizado);

        if ($existing) {
            return $existing;
        }

        $now = now()->toIso8601String();

        return $this->store->create('subassuntos', [
            'id' => 'sub-'.Str::slug($nomeNormalizado).'-'.Str::lower(Str::random(5)),
            'disciplinaId' => $disciplinaId,
            'assuntoId' => $assuntoId,
            'nome' => $nome,
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);
    }
}
