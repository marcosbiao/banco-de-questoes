<?php

namespace App\Services\Listas;

use App\Services\Questoes\QuestaoService;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class ListaMontagemService
{
    public function __construct(private readonly QuestaoService $questaoService)
    {
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function montar(array $payload): array
    {
        $seen = [];
        $blocos = collect($payload['blocos'] ?? [])
            ->sortBy(fn (array $bloco): int => (int) ($bloco['ordem'] ?? 0))
            ->values()
            ->map(function (array $bloco, int $index) use (&$seen): array {
                $id = $bloco['id'] ?? 'bloco-'.Str::uuid()->toString();
                $filtros = $this->normalizarFiltros($bloco['filtros'] ?? $bloco);
                $removidas = $this->idsFrom($bloco['questoesRemovidasIds'] ?? []);
                $questoes = $this->questaoService->listar([
                    ...$filtros,
                    'status' => 'ativa',
                ]);

                $selecionadas = [];
                $duplicadas = [];
                $removidasEncontradas = [];

                foreach ($questoes as $questao) {
                    if (in_array($questao['id'], $seen, true)) {
                        $duplicadas[] = $questao['id'];
                        continue;
                    }

                    $seen[] = $questao['id'];

                    if (in_array($questao['id'], $removidas, true)) {
                        $removidasEncontradas[] = $questao['id'];
                        continue;
                    }

                    $selecionadas[] = $questao;
                }

                return [
                    'id' => $id,
                    'ordem' => (int) ($bloco['ordem'] ?? $index + 1),
                    'tituloBloco' => $bloco['tituloBloco'] ?? $bloco['titulo'] ?? 'Bloco '.($index + 1),
                    'filtros' => $filtros,
                    'questoesIds' => collect($selecionadas)->pluck('id')->values()->all(),
                    'questoesRemovidasIds' => array_values(array_unique([...$removidas, ...$removidasEncontradas])),
                    'duplicadasIgnoradasIds' => array_values(array_unique($duplicadas)),
                    'questoes' => $selecionadas,
                    'totalEncontradas' => count($questoes),
                    'totalSelecionadas' => count($selecionadas),
                    'totalDuplicadasIgnoradas' => count($duplicadas),
                    'createdAt' => $bloco['createdAt'] ?? now()->toIso8601String(),
                    'updatedAt' => now()->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        return $this->montadaFrom($payload, $blocos);
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<int, array<string, mixed>> $blocos
     * @return array<string, mixed>
     */
    private function montadaFrom(array $payload, array $blocos): array
    {
        return [
            'id' => $payload['id'] ?? null,
            'titulo' => $payload['titulo'] ?? 'Lista de exercícios',
            'cabecalho' => $this->normalizarCabecalho($payload['cabecalho'] ?? []),
            'instrucoes' => $payload['instrucoes'] ?? '',
            'incluirGabarito' => (bool) ($payload['incluirGabarito'] ?? false),
            'status' => $payload['status'] ?? 'ativa',
            'blocos' => $blocos,
            'questoesSelecionadas' => $this->questoesSelecionadasFrom($blocos),
            'duplicadasIgnoradasTotal' => collect($blocos)->sum('totalDuplicadasIgnoradas'),
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

            foreach (($bloco['questoesRemovidasIds'] ?? []) as $questaoId) {
                $selecionadas[] = [
                    'blocoId' => $bloco['id'],
                    'questaoId' => $questaoId,
                    'ordem' => null,
                    'removida' => true,
                    'origemAutomatica' => true,
                ];
            }
        }

        return $selecionadas;
    }

    /**
     * @param array<string, mixed> $filtros
     * @return array<string, mixed>
     */
    private function normalizarFiltros(array $filtros): array
    {
        return [
            'disciplinaId' => (string) Arr::get($filtros, 'disciplinaId', ''),
            'assuntoIds' => $this->idsFrom(Arr::get($filtros, 'assuntoIds', Arr::get($filtros, 'assuntoId', []))),
            'subassuntoIds' => $this->idsFrom(Arr::get($filtros, 'subassuntoIds', Arr::get($filtros, 'subassuntoId', []))),
            'tagIds' => $this->idsFrom(Arr::get($filtros, 'tagIds', [])),
            'tipo' => (string) Arr::get($filtros, 'tipo', ''),
            'dificuldade' => (string) Arr::get($filtros, 'dificuldade', ''),
            'competencia' => (string) Arr::get($filtros, 'competencia', ''),
            'nivelBloom' => (string) Arr::get($filtros, 'nivelBloom', ''),
            'search' => (string) Arr::get($filtros, 'search', ''),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function idsFrom(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter($value));
        }

        if (is_string($value) && $value !== '') {
            return array_values(array_filter(array_map('trim', explode(',', $value))));
        }

        return [];
    }

    /**
     * @return array<string, string>
     */
    private function normalizarCabecalho(mixed $cabecalho): array
    {
        if (! is_array($cabecalho)) {
            return [
                'instituicao' => '',
                'curso' => '',
                'disciplinaTexto' => '',
                'professor' => '',
                'turma' => '',
                'data' => '',
                'tituloExibicao' => (string) $cabecalho,
            ];
        }

        return [
            'instituicao' => (string) ($cabecalho['instituicao'] ?? ''),
            'curso' => (string) ($cabecalho['curso'] ?? ''),
            'disciplinaTexto' => (string) ($cabecalho['disciplinaTexto'] ?? ''),
            'professor' => (string) ($cabecalho['professor'] ?? ''),
            'turma' => (string) ($cabecalho['turma'] ?? ''),
            'data' => (string) ($cabecalho['data'] ?? ''),
            'tituloExibicao' => (string) ($cabecalho['tituloExibicao'] ?? ''),
        ];
    }
}
