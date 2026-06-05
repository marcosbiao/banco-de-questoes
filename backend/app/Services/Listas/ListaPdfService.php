<?php

namespace App\Services\Listas;

use App\Services\Storage\CollectionStore;
use Illuminate\Support\Str;

class ListaPdfService
{
    public function __construct(
        private readonly CollectionStore $store,
        private readonly ListaPreviewService $previewService,
    ) {
    }

    /**
     * @return array<string, mixed>|null
     */
    public function preparar(string $id, bool $comGabarito): ?array
    {
        $lista = $this->store->find('listas', $id);

        if (! $lista) {
            return null;
        }

        $lista = $this->previewService->preparar($lista);
        $lista['cabecalho'] = $this->normalizarCabecalho($lista['cabecalho'] ?? []);
        $lista['incluirGabarito'] = $comGabarito;
        $lista['blocos'] = collect($lista['blocos'] ?? [])
            ->sortBy(fn (array $bloco): int => (int) ($bloco['ordem'] ?? 0))
            ->values()
            ->map(function (array $bloco, int $index): array {
                return [
                    ...$bloco,
                    'ordem' => $index + 1,
                    'questoes' => collect($bloco['questoes'] ?? [])->values()->all(),
                ];
            })
            ->all();

        return [
            'lista' => $lista,
            'comGabarito' => $comGabarito,
            'filename' => $this->filename($lista['titulo'] ?? 'lista', $comGabarito),
            'geradoEm' => now()->format('d/m/Y H:i'),
        ];
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

    private function filename(string $titulo, bool $comGabarito): string
    {
        $base = Str::of('lista de exercicios '.$titulo)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', '_')
            ->trim('_')
            ->toString();

        if ($base === '') {
            $base = 'lista_de_exercicios';
        }

        return $base.'_'.($comGabarito ? 'com_gabarito' : 'sem_gabarito').'.pdf';
    }
}
