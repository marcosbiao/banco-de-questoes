<?php

namespace App\Services\Tags;

use App\Helpers\TextNormalizer;
use App\Services\Storage\CollectionStore;
use Illuminate\Support\Str;

class TagService
{
    public function __construct(private readonly CollectionStore $store)
    {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listar(): array
    {
        return collect($this->store->all('tags'))
            ->sortBy('nomeNormalizado')
            ->values()
            ->all();
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function criar(array $data): array
    {
        return $this->garantir($data['nome']);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function sugestoes(string $query): array
    {
        $normalizado = TextNormalizer::normalize($query);

        return collect($this->listar())
            ->filter(fn (array $tag): bool => $normalizado === '' || str_contains($tag['nomeNormalizado'], $normalizado))
            ->take(8)
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function garantir(string $nome): array
    {
        $nome = trim($nome);
        $nomeNormalizado = TextNormalizer::normalize($nome);

        $existing = collect($this->listar())
            ->first(fn (array $tag): bool => $tag['nomeNormalizado'] === $nomeNormalizado);

        if ($existing) {
            return $existing;
        }

        $now = now()->toIso8601String();

        return $this->store->create('tags', [
            'id' => 'tag-'.Str::slug($nomeNormalizado).'-'.Str::lower(Str::random(5)),
            'nome' => $nome,
            'nomeNormalizado' => $nomeNormalizado,
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);
    }

    /**
     * @param array<int, string> $nomes
     * @return array{ids: array<int, string>, nomes: array<int, string>}
     */
    public function garantirMuitas(array $nomes): array
    {
        $tags = collect($nomes)
            ->map(fn (string $nome): string => trim($nome))
            ->filter()
            ->unique(fn (string $nome): string => TextNormalizer::normalize($nome))
            ->map(fn (string $nome): array => $this->garantir($nome))
            ->values();

        return [
            'ids' => $tags->pluck('id')->all(),
            'nomes' => $tags->pluck('nome')->all(),
        ];
    }
}
