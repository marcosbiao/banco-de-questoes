<?php

namespace App\Services\Listas;

use App\Services\Questoes\QuestaoService;

class ListaPreviewService
{
    public function __construct(private readonly QuestaoService $questaoService)
    {
    }

    /**
     * @param array<string, mixed> $lista
     * @return array<string, mixed>
     */
    public function preparar(array $lista): array
    {
        $blocos = collect($lista['blocos'] ?? [])
            ->sortBy('ordem')
            ->values()
            ->map(function (array $bloco): array {
                $questoes = collect($bloco['questoes'] ?? []);

                if ($questoes->isEmpty()) {
                    $questoes = collect($bloco['questoesIds'] ?? [])
                        ->map(fn (string $id): ?array => $this->questaoService->buscar($id))
                        ->filter()
                        ->values();
                }

                return [
                    ...$bloco,
                    'questoes' => $questoes->values()->all(),
                    'questoesIds' => $questoes->pluck('id')->values()->all(),
                ];
            })
            ->all();

        return [
            ...$lista,
            'blocos' => $blocos,
        ];
    }
}
