<?php

namespace App\DTO;

class ListaFiltroDTO
{
    /**
     * @param array<int, array<string, mixed>> $blocos
     */
    public function __construct(
        public readonly string $titulo,
        public readonly ?string $cabecalho,
        public readonly ?string $instrucoes,
        public readonly bool $incluirGabarito,
        public readonly array $blocos,
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            titulo: $data['titulo'] ?? 'Lista de exercícios',
            cabecalho: $data['cabecalho'] ?? null,
            instrucoes: $data['instrucoes'] ?? null,
            incluirGabarito: (bool) ($data['incluirGabarito'] ?? false),
            blocos: $data['blocos'] ?? [],
        );
    }
}
