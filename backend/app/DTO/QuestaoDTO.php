<?php

namespace App\DTO;

class QuestaoDTO
{
    /**
     * @param array<int, mixed> $alternativas
     * @param array<int, string> $tagsIds
     * @param array<int, mixed> $anexos
     */
    public function __construct(
        public readonly ?string $disciplinaId,
        public readonly ?string $assuntoId,
        public readonly ?string $subassuntoId,
        public readonly string $tipo,
        public readonly string $enunciado,
        public readonly array $alternativas,
        public readonly ?string $respostaCorreta,
        public readonly ?string $explicacao,
        public readonly ?string $dificuldade,
        public readonly ?string $fonte,
        public readonly ?string $competencia,
        public readonly ?string $nivelBloom,
        public readonly array $tagsIds,
        public readonly ?string $observacaoPedagogica,
        public readonly string $status,
        public readonly array $anexos,
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            disciplinaId: $data['disciplinaId'] ?? null,
            assuntoId: $data['assuntoId'] ?? null,
            subassuntoId: $data['subassuntoId'] ?? null,
            tipo: $data['tipo'] ?? 'discursiva',
            enunciado: $data['enunciado'],
            alternativas: $data['alternativas'] ?? [],
            respostaCorreta: $data['respostaCorreta'] ?? null,
            explicacao: $data['explicacao'] ?? null,
            dificuldade: $data['dificuldade'] ?? null,
            fonte: $data['fonte'] ?? null,
            competencia: $data['competencia'] ?? null,
            nivelBloom: $data['nivelBloom'] ?? null,
            tagsIds: self::tagsFrom($data),
            observacaoPedagogica: $data['observacaoPedagogica'] ?? null,
            status: $data['status'] ?? 'ativa',
            anexos: $data['anexos'] ?? [],
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'disciplinaId' => $this->disciplinaId,
            'assuntoId' => $this->assuntoId,
            'subassuntoId' => $this->subassuntoId,
            'tipo' => $this->tipo,
            'enunciado' => $this->enunciado,
            'alternativas' => $this->alternativas,
            'respostaCorreta' => $this->respostaCorreta,
            'explicacao' => $this->explicacao,
            'dificuldade' => $this->dificuldade,
            'fonte' => $this->fonte,
            'competencia' => $this->competencia,
            'nivelBloom' => $this->nivelBloom,
            'tagsIds' => $this->tagsIds,
            'observacaoPedagogica' => $this->observacaoPedagogica,
            'status' => $this->status,
            'anexos' => $this->anexos,
        ];
    }

    /**
     * @param array<string, mixed> $data
     * @return array<int, string>
     */
    private static function tagsFrom(array $data): array
    {
        if (isset($data['tagsIds']) && is_array($data['tagsIds'])) {
            return array_values(array_filter($data['tagsIds']));
        }

        if (! isset($data['tags'])) {
            return [];
        }

        if (is_array($data['tags'])) {
            return array_values(array_filter($data['tags']));
        }

        return array_values(array_filter(array_map(
            fn (string $tag): string => trim($tag),
            explode(',', (string) $data['tags']),
        )));
    }
}
