<?php

namespace App\Services\Questoes;

use App\Helpers\TextNormalizer;
use App\Services\Assuntos\AssuntoService;
use App\Services\Disciplinas\DisciplinaService;
use App\Services\Storage\CollectionStore;
use App\Services\Subassuntos\SubassuntoService;
use App\Services\Tags\TagService;
use Illuminate\Support\Str;

class QuestaoService
{
    public const TIPOS_PERMITIDOS = [
        'multipla_escolha',
        'verdadeiro_falso',
        'discursiva',
        'codigo_analise',
        'problema_programacao',
        'imagem',
        'arquivo_anexo',
    ];

    public const STATUS_PERMITIDOS = [
        'ativa',
        'arquivada',
    ];

    public const DIFICULDADES_PERMITIDAS = [
        'facil',
        'medio',
        'dificil',
    ];

    public const NIVEIS_BLOOM_PERMITIDOS = [
        'lembrar',
        'compreender',
        'aplicar',
        'analisar',
        'avaliar',
        'criar',
    ];

    public function __construct(
        private readonly CollectionStore $store,
        private readonly TagService $tagService,
        private readonly DisciplinaService $disciplinaService,
        private readonly AssuntoService $assuntoService,
        private readonly SubassuntoService $subassuntoService,
    ) {
    }

    /**
     * @param array<string, mixed> $filtros
     * @return array<int, array<string, mixed>>
     */
    public function listar(array $filtros = []): array
    {
        $questoes = array_map(
            fn (array $questao): array => $this->enriquecer($questao),
            $this->store->all('questoes'),
        );

        return array_values(array_filter($questoes, function (array $questao) use ($filtros): bool {
            foreach (['disciplinaId', 'assuntoId', 'subassuntoId', 'tipo', 'dificuldade', 'status', 'nivelBloom'] as $campo) {
                if (filled($filtros[$campo] ?? null) && ($questao[$campo] ?? null) !== $filtros[$campo]) {
                    return false;
                }
            }

            if (! $this->matchesAny($questao['assuntoId'] ?? '', $filtros['assuntoIds'] ?? null)) {
                return false;
            }

            if (! $this->matchesAny($questao['subassuntoId'] ?? '', $filtros['subassuntoIds'] ?? null)) {
                return false;
            }

            if (filled($filtros['competencia'] ?? null)) {
                $competencia = TextNormalizer::normalize((string) $filtros['competencia']);
                $textoCompetencia = TextNormalizer::normalize((string) ($questao['competencia'] ?? ''));

                if (! str_contains($textoCompetencia, $competencia)) {
                    return false;
                }
            }

            $tagIds = $this->tagIdsFromFiltro($filtros['tagIds'] ?? null);
            foreach ($tagIds as $tagId) {
                if (! in_array($tagId, $questao['tagsIds'] ?? [], true)) {
                    return false;
                }
            }

            $search = $filtros['search'] ?? $filtros['busca'] ?? null;
            if (filled($search)) {
                $busca = TextNormalizer::normalize((string) $search);
                $texto = TextNormalizer::normalize($questao['enunciado'].' '.implode(' ', $questao['tagsNomes'] ?? []));

                if (! str_contains($texto, $busca)) {
                    return false;
                }
            }

            return true;
        }));
    }

    /**
     * @return array<string, mixed>|null
     */
    public function buscar(string $id): ?array
    {
        $questao = $this->store->find('questoes', $id);

        return $questao ? $this->enriquecer($questao) : null;
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function criar(array $data): array
    {
        $now = now()->toIso8601String();
        $tags = $this->tagService->garantirMuitas($this->tagsFrom($data));
        $record = $this->normalizarPayload($data);

        $questao = $this->store->create('questoes', [
            'id' => 'q-'.Str::uuid()->toString(),
            ...$record,
            'tagsIds' => $tags['ids'],
            'tagsNomes' => $tags['nomes'],
            'status' => $record['status'] ?: 'ativa',
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);

        return $this->enriquecer($questao);
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>|null
     */
    public function atualizar(string $id, array $data): ?array
    {
        $existing = $this->store->find('questoes', $id);

        if (! $existing) {
            return null;
        }

        $record = $this->normalizarPayload([...$existing, ...$data]);

        if (array_key_exists('tags', $data) || array_key_exists('tagsNomes', $data) || array_key_exists('tagsIds', $data)) {
            $tags = $this->tagService->garantirMuitas($this->tagsFrom($data));
            $record['tagsIds'] = $tags['ids'];
            $record['tagsNomes'] = $tags['nomes'];
        }

        $updated = $this->store->update('questoes', $id, [
            ...$record,
            'updatedAt' => now()->toIso8601String(),
        ]);

        return $updated ? $this->enriquecer($updated) : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function arquivar(string $id): ?array
    {
        $updated = $this->store->update('questoes', $id, [
            'status' => 'arquivada',
            'updatedAt' => now()->toIso8601String(),
        ]);

        return $updated ? $this->enriquecer($updated) : null;
    }

    /**
     * @param array<string, mixed> $questao
     * @return array<string, mixed>
     */
    private function enriquecer(array $questao): array
    {
        $disciplinas = collect($this->disciplinaService->listar())->keyBy('id');
        $assuntos = collect($this->assuntoService->listar())->keyBy('id');
        $subassuntos = collect($this->subassuntoService->listar())->keyBy('id');

        return [
            ...$questao,
            'disciplina' => $disciplinas->get($questao['disciplinaId'] ?? '')['nome'] ?? '',
            'assunto' => $assuntos->get($questao['assuntoId'] ?? '')['nome'] ?? '',
            'subassunto' => $subassuntos->get($questao['subassuntoId'] ?? '')['nome'] ?? '',
            'tags' => $questao['tagsNomes'] ?? [],
        ];
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function normalizarPayload(array $data): array
    {
        $tipo = (string) ($data['tipo'] ?? 'discursiva');
        $alternativas = $tipo === 'multipla_escolha' ? $this->normalizarAlternativas($data['alternativas'] ?? []) : [];
        $respostaCorreta = trim((string) ($data['respostaCorreta'] ?? ''));
        $alternativaCorreta = collect($alternativas)->first(fn (array $alternativa): bool => (bool) ($alternativa['correta'] ?? false));

        if ($alternativaCorreta) {
            $respostaCorreta = $alternativaCorreta['texto'];
        }

        if ($tipo === 'verdadeiro_falso' && $respostaCorreta !== '') {
            $respostaCorreta = in_array(mb_strtolower($respostaCorreta, 'UTF-8'), ['true', 'verdadeiro'], true) ? 'verdadeiro' : 'falso';
        }

        return [
            'disciplinaId' => (string) ($data['disciplinaId'] ?? ''),
            'assuntoId' => (string) ($data['assuntoId'] ?? ''),
            'subassuntoId' => (string) ($data['subassuntoId'] ?? ''),
            'tipo' => $tipo,
            'enunciado' => trim((string) ($data['enunciado'] ?? '')),
            'alternativas' => $alternativas,
            'respostaCorreta' => $respostaCorreta,
            'explicacao' => trim((string) ($data['explicacao'] ?? '')),
            'dificuldade' => (string) ($data['dificuldade'] ?? ''),
            'fonte' => trim((string) ($data['fonte'] ?? '')),
            'competencia' => trim((string) ($data['competencia'] ?? '')),
            'nivelBloom' => (string) ($data['nivelBloom'] ?? ''),
            'tagsIds' => $data['tagsIds'] ?? [],
            'tagsNomes' => $data['tagsNomes'] ?? [],
            'observacaoPedagogica' => trim((string) ($data['observacaoPedagogica'] ?? '')),
            'status' => $data['status'] ?? 'ativa',
            'anexos' => $data['anexos'] ?? [],
        ];
    }

    /**
     * @return array<int, array{id: string, texto: string, correta: bool}>
     */
    private function normalizarAlternativas(mixed $alternativas): array
    {
        if (! is_array($alternativas)) {
            return [];
        }

        return collect($alternativas)
            ->filter(fn (mixed $alternativa): bool => is_array($alternativa) && filled($alternativa['texto'] ?? null))
            ->values()
            ->map(fn (array $alternativa, int $index): array => [
                'id' => (string) ($alternativa['id'] ?? chr(97 + $index)),
                'texto' => trim((string) ($alternativa['texto'] ?? '')),
                'correta' => (bool) ($alternativa['correta'] ?? false),
            ])
            ->values()
            ->all();
    }

    /**
     * @param array<string, mixed> $data
     * @return array<int, string>
     */
    private function tagsFrom(array $data): array
    {
        if (isset($data['tags']) && is_array($data['tags'])) {
            return array_values(array_filter($data['tags']));
        }

        if (isset($data['tagsNomes']) && is_array($data['tagsNomes'])) {
            return array_values(array_filter($data['tagsNomes']));
        }

        if (isset($data['tags']) && is_string($data['tags'])) {
            return array_values(array_filter(array_map('trim', explode(',', $data['tags']))));
        }

        return [];
    }

    /**
     * @return array<int, string>
     */
    private function tagIdsFromFiltro(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter($value));
        }

        if (is_string($value)) {
            return array_values(array_filter(array_map('trim', explode(',', $value))));
        }

        return [];
    }

    private function matchesAny(string $actual, mixed $expected): bool
    {
        $values = $this->idsFromFiltro($expected);

        if (count($values) === 0) {
            return true;
        }

        return in_array($actual, $values, true);
    }

    /**
     * @return array<int, string>
     */
    private function idsFromFiltro(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter($value));
        }

        if (is_string($value)) {
            return array_values(array_filter(array_map('trim', explode(',', $value))));
        }

        return [];
    }
}
