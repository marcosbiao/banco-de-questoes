<?php

namespace App\Services\Listas;

use App\DTO\ListaFiltroDTO;
use App\Services\Storage\CollectionStore;
use Illuminate\Support\Str;

class ListaService
{
    public function __construct(
        private readonly CollectionStore $store,
        private readonly ListaMontagemService $montagemService,
        private readonly ListaPreviewService $previewService,
    ) {
    }

    /**
     * @param array<string, mixed> $filtros
     * @return array<int, array<string, mixed>>
     */
    public function listar(array $filtros = []): array
    {
        return collect($this->store->all('listas'))
            ->filter(function (array $lista) use ($filtros): bool {
                if (filled($filtros['status'] ?? null) && ($lista['status'] ?? 'ativa') !== $filtros['status']) {
                    return false;
                }

                if (filled($filtros['search'] ?? null)) {
                    return str_contains(
                        mb_strtolower($lista['titulo'] ?? '', 'UTF-8'),
                        mb_strtolower((string) $filtros['search'], 'UTF-8'),
                    );
                }

                return true;
            })
            ->map(fn (array $lista): array => $this->resumo($lista))
            ->sortByDesc('updatedAt')
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function buscar(string $id): ?array
    {
        $lista = $this->store->find('listas', $id);

        return $lista ? $this->previewService->preparar($lista) : null;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function montar(array $payload): array
    {
        return $this->montagemService->montar($payload);
    }

    /**
     * Compatibilidade com a rota antiga /api/listas/gerar.
     *
     * @return array<string, mixed>
     */
    public function gerar(ListaFiltroDTO $filtros): array
    {
        return $this->montar([
            'titulo' => $filtros->titulo,
            'cabecalho' => $filtros->cabecalho,
            'instrucoes' => $filtros->instrucoes,
            'incluirGabarito' => $filtros->incluirGabarito,
            'blocos' => $filtros->blocos,
        ]);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function criar(array $payload): array
    {
        $now = now()->toIso8601String();
        $lista = $this->normalizarParaSalvar($payload);

        $saved = $this->store->create('listas', [
            'id' => 'lista-'.Str::uuid()->toString(),
            ...$lista,
            'status' => $lista['status'] ?: 'ativa',
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);

        return $this->previewService->preparar($saved);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>|null
     */
    public function atualizar(string $id, array $payload): ?array
    {
        $existing = $this->store->find('listas', $id);

        if (! $existing) {
            return null;
        }

        $updated = $this->store->update('listas', $id, [
            ...$this->normalizarParaSalvar([...$existing, ...$payload]),
            'updatedAt' => now()->toIso8601String(),
        ]);

        return $updated ? $this->previewService->preparar($updated) : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function arquivar(string $id): ?array
    {
        $updated = $this->store->update('listas', $id, [
            'status' => 'arquivada',
            'updatedAt' => now()->toIso8601String(),
        ]);

        return $updated ? $this->resumo($updated) : null;
    }

    public function excluir(string $id): bool
    {
        return $this->store->delete('listas', $id);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function remontar(string $id): ?array
    {
        $lista = $this->store->find('listas', $id);

        if (! $lista) {
            return null;
        }

        return $this->montagemService->montar($lista);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function preview(string $id): ?array
    {
        return $this->buscar($id);
    }

    /**
     * @param array<string, mixed> $lista
     * @return array<string, mixed>
     */
    private function resumo(array $lista): array
    {
        return [
            ...$lista,
            'totalBlocos' => count($lista['blocos'] ?? []),
            'totalQuestoes' => collect($lista['blocos'] ?? [])->sum(fn (array $bloco): int => count($bloco['questoesIds'] ?? $bloco['questoes'] ?? [])),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function normalizarParaSalvar(array $payload): array
    {
        $blocos = collect($payload['blocos'] ?? [])
            ->sortBy('ordem')
            ->values()
            ->map(function (array $bloco, int $index): array {
                $questoesIds = collect($bloco['questoes'] ?? [])
                    ->pluck('id')
                    ->merge($bloco['questoesIds'] ?? [])
                    ->unique()
                    ->values()
                    ->all();

                return [
                    'id' => $bloco['id'] ?? 'bloco-'.Str::uuid()->toString(),
                    'ordem' => $index + 1,
                    'tituloBloco' => $bloco['tituloBloco'] ?? $bloco['titulo'] ?? 'Bloco '.($index + 1),
                    'filtros' => $bloco['filtros'] ?? [],
                    'questoesIds' => $questoesIds,
                    'questoesRemovidasIds' => $bloco['questoesRemovidasIds'] ?? [],
                    'duplicadasIgnoradasIds' => $bloco['duplicadasIgnoradasIds'] ?? [],
                    'createdAt' => $bloco['createdAt'] ?? now()->toIso8601String(),
                    'updatedAt' => now()->toIso8601String(),
                ];
            })
            ->all();

        return [
            'titulo' => $payload['titulo'] ?? 'Lista de exercícios',
            'cabecalho' => $payload['cabecalho'] ?? [],
            'instrucoes' => $payload['instrucoes'] ?? '',
            'incluirGabarito' => (bool) ($payload['incluirGabarito'] ?? false),
            'status' => $payload['status'] ?? 'ativa',
            'blocos' => $blocos,
            'questoesSelecionadas' => $payload['questoesSelecionadas'] ?? $this->questoesSelecionadasFrom($blocos),
            'duplicadasIgnoradasTotal' => (int) ($payload['duplicadasIgnoradasTotal'] ?? collect($blocos)->sum(fn (array $bloco): int => count($bloco['duplicadasIgnoradasIds'] ?? []))),
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $blocos
     * @return array<int, array<string, mixed>>
     */
    private function questoesSelecionadasFrom(array $blocos): array
    {
        $selecionadas = [];

        foreach ($blocos as $bloco) {
            foreach (($bloco['questoesIds'] ?? []) as $index => $questaoId) {
                $selecionadas[] = [
                    'blocoId' => $bloco['id'],
                    'questaoId' => $questaoId,
                    'ordem' => $index + 1,
                    'removida' => false,
                    'origemAutomatica' => true,
                ];
            }
        }

        return $selecionadas;
    }
}
