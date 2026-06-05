<?php

namespace App\Services\Storage;

use App\Services\Firebase\FirebaseService;
use Illuminate\Support\Str;

class CollectionStore
{
    public function __construct(private readonly FirebaseService $firebaseService)
    {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function all(string $collection): array
    {
        if ($this->firebaseService->enabled()) {
            return $this->allFromFirestore($collection);
        }

        return array_values($this->mockData()[$collection] ?? []);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(string $collection, string $id): ?array
    {
        if ($this->firebaseService->enabled()) {
            $snapshot = $this->firebaseService->firestore()
                ->collection($collection)
                ->document($id)
                ->snapshot();

            if (! $snapshot->exists()) {
                return null;
            }

            return ['id' => $snapshot->id(), ...$snapshot->data()];
        }

        $data = $this->mockData();

        return $data[$collection][$id] ?? null;
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function create(string $collection, array $data): array
    {
        $id = $data['id'] ?? Str::uuid()->toString();

        return $this->save($collection, $id, ['id' => $id, ...$data]);
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function save(string $collection, string $id, array $data): array
    {
        $record = ['id' => $id, ...$data];

        if ($this->firebaseService->enabled()) {
            $this->firebaseService->firestore()
                ->collection($collection)
                ->document($id)
                ->set($record);

            return $record;
        }

        $mockData = $this->mockData();
        $mockData[$collection] ??= [];
        $mockData[$collection][$id] = $record;
        $this->writeMockData($mockData);

        return $record;
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>|null
     */
    public function update(string $collection, string $id, array $data): ?array
    {
        $existing = $this->find($collection, $id);

        if (! $existing) {
            return null;
        }

        return $this->save($collection, $id, [...$existing, ...$data, 'id' => $id]);
    }

    public function delete(string $collection, string $id): bool
    {
        if ($this->firebaseService->enabled()) {
            $this->firebaseService->firestore()
                ->collection($collection)
                ->document($id)
                ->delete();

            return true;
        }

        $mockData = $this->mockData();

        if (! isset($mockData[$collection][$id])) {
            return false;
        }

        unset($mockData[$collection][$id]);
        $this->writeMockData($mockData);

        return true;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function allFromFirestore(string $collection): array
    {
        $documents = $this->firebaseService->firestore()->collection($collection)->documents();
        $records = [];

        foreach ($documents as $document) {
            if ($document->exists()) {
                $records[] = ['id' => $document->id(), ...$document->data()];
            }
        }

        return $records;
    }

    /**
     * @return array<string, array<string, array<string, mixed>>>
     */
    private function mockData(): array
    {
        $path = $this->mockPath();

        if (! file_exists($path)) {
            $this->writeMockData($this->seedData());
        }

        $contents = file_get_contents($path);
        $decoded = json_decode($contents ?: '', true);

        $data = is_array($decoded) ? $decoded : $this->seedData();
        $merged = $this->mergeSeedData($data);

        if ($merged !== $data) {
            $this->writeMockData($merged);
        }

        return $merged;
    }

    /**
     * @param array<string, array<string, array<string, mixed>>> $data
     */
    private function writeMockData(array $data): void
    {
        $path = $this->mockPath();
        $directory = dirname($path);

        if (! is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function mockPath(): string
    {
        return storage_path('app/mock-firestore.json');
    }

    /**
     * @param array<string, array<string, array<string, mixed>>> $data
     * @return array<string, array<string, array<string, mixed>>>
     */
    private function mergeSeedData(array $data): array
    {
        $seed = $this->seedData();

        foreach ($seed as $collection => $records) {
            $data[$collection] ??= [];

            foreach ($records as $id => $record) {
                $data[$collection][$id] ??= $record;
            }
        }

        return $data;
    }

    /**
     * @return array<string, array<string, array<string, mixed>>>
     */
    private function seedData(): array
    {
        $now = '2026-06-03T00:00:00-03:00';

        return [
            'disciplinas' => [
                'disc-prog' => [
                    'id' => 'disc-prog',
                    'nome' => 'Introdução à Programação',
                    'descricao' => 'Fundamentos de algoritmos e lógica de programação.',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
            ],
            'assuntos' => [
                'ass-entrada-processamento-saida' => [
                    'id' => 'ass-entrada-processamento-saida',
                    'disciplinaId' => 'disc-prog',
                    'nome' => 'Entrada, processamento e saída',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'ass-condicionais' => [
                    'id' => 'ass-condicionais',
                    'disciplinaId' => 'disc-prog',
                    'nome' => 'Condicionais',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'ass-lacos' => [
                    'id' => 'ass-lacos',
                    'disciplinaId' => 'disc-prog',
                    'nome' => 'Laços de repetição',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'ass-vetores' => [
                    'id' => 'ass-vetores',
                    'disciplinaId' => 'disc-prog',
                    'nome' => 'Vetores',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'ass-matrizes' => [
                    'id' => 'ass-matrizes',
                    'disciplinaId' => 'disc-prog',
                    'nome' => 'Matrizes',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
            ],
            'subassuntos' => [
                'sub-variaveis' => [
                    'id' => 'sub-variaveis',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-entrada-processamento-saida',
                    'nome' => 'variáveis',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'sub-if-else' => [
                    'id' => 'sub-if-else',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-condicionais',
                    'nome' => 'if e else',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'sub-while' => [
                    'id' => 'sub-while',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-lacos',
                    'nome' => 'while',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'sub-for' => [
                    'id' => 'sub-for',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-lacos',
                    'nome' => 'for',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'sub-contador' => [
                    'id' => 'sub-contador',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-lacos',
                    'nome' => 'contador',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'sub-acumulador' => [
                    'id' => 'sub-acumulador',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-lacos',
                    'nome' => 'acumulador',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'sub-vetor-unidimensional' => [
                    'id' => 'sub-vetor-unidimensional',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-vetores',
                    'nome' => 'vetor unidimensional',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'sub-matriz-bidimensional' => [
                    'id' => 'sub-matriz-bidimensional',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-matrizes',
                    'nome' => 'matriz bidimensional',
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
            ],
            'tags' => [
                'tag-algoritmo' => ['id' => 'tag-algoritmo', 'nome' => 'algoritmo', 'nomeNormalizado' => 'algoritmo', 'createdAt' => $now, 'updatedAt' => $now],
                'tag-while' => ['id' => 'tag-while', 'nome' => 'while', 'nomeNormalizado' => 'while', 'createdAt' => $now, 'updatedAt' => $now],
                'tag-contador' => ['id' => 'tag-contador', 'nome' => 'contador', 'nomeNormalizado' => 'contador', 'createdAt' => $now, 'updatedAt' => $now],
                'tag-condicao-parada' => ['id' => 'tag-condicao-parada', 'nome' => 'condição de parada', 'nomeNormalizado' => 'condicao de parada', 'createdAt' => $now, 'updatedAt' => $now],
                'tag-vetor' => ['id' => 'tag-vetor', 'nome' => 'vetor', 'nomeNormalizado' => 'vetor', 'createdAt' => $now, 'updatedAt' => $now],
                'tag-matriz' => ['id' => 'tag-matriz', 'nome' => 'matriz', 'nomeNormalizado' => 'matriz', 'createdAt' => $now, 'updatedAt' => $now],
                'tag-teste-mesa' => ['id' => 'tag-teste-mesa', 'nome' => 'teste de mesa', 'nomeNormalizado' => 'teste de mesa', 'createdAt' => $now, 'updatedAt' => $now],
            ],
            'questoes' => [
                'q-001' => [
                    'id' => 'q-001',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-lacos',
                    'subassuntoId' => 'sub-while',
                    'tipo' => 'codigo_analise',
                    'enunciado' => "Analise o trecho abaixo e explique quando o laço será encerrado:\n\nwhile contador <= 10:\n    contador = contador + 1",
                    'alternativas' => [],
                    'respostaCorreta' => 'O laço encerra quando contador passa a ser maior que 10.',
                    'explicacao' => 'A condição de parada deixa de ser verdadeira após o incremento superar o limite.',
                    'dificuldade' => 'medio',
                    'fonte' => 'Banco inicial',
                    'competencia' => 'Analisar estruturas de repetição',
                    'nivelBloom' => 'analisar',
                    'tagsIds' => ['tag-algoritmo', 'tag-while', 'tag-contador', 'tag-condicao-parada'],
                    'tagsNomes' => ['algoritmo', 'while', 'contador', 'condição de parada'],
                    'observacaoPedagogica' => 'Útil para discutir condição de parada e incremento.',
                    'status' => 'ativa',
                    'anexos' => [],
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'q-002' => [
                    'id' => 'q-002',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-condicionais',
                    'subassuntoId' => 'sub-if-else',
                    'tipo' => 'verdadeiro_falso',
                    'enunciado' => 'Em uma estrutura if e else, o bloco else é executado quando a condição do if é falsa.',
                    'alternativas' => [],
                    'respostaCorreta' => 'verdadeiro',
                    'explicacao' => 'O else representa o caminho alternativo quando a condição principal não é satisfeita.',
                    'dificuldade' => 'facil',
                    'fonte' => 'Banco inicial',
                    'competencia' => 'Reconhecer fluxo condicional',
                    'nivelBloom' => 'compreender',
                    'tagsIds' => ['tag-algoritmo'],
                    'tagsNomes' => ['algoritmo'],
                    'observacaoPedagogica' => '',
                    'status' => 'ativa',
                    'anexos' => [],
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'q-003' => [
                    'id' => 'q-003',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-vetores',
                    'subassuntoId' => 'sub-vetor-unidimensional',
                    'tipo' => 'multipla_escolha',
                    'enunciado' => 'Qual estrutura é mais adequada para armazenar uma sequência de 30 notas de uma turma?',
                    'alternativas' => [
                        ['id' => 'a', 'texto' => 'Variável simples', 'correta' => false],
                        ['id' => 'b', 'texto' => 'Vetor unidimensional', 'correta' => true],
                        ['id' => 'c', 'texto' => 'Comando if', 'correta' => false],
                    ],
                    'respostaCorreta' => 'Vetor unidimensional',
                    'explicacao' => 'Um vetor permite armazenar vários valores do mesmo tipo em posições indexadas.',
                    'dificuldade' => 'facil',
                    'fonte' => 'Banco inicial',
                    'competencia' => 'Selecionar estrutura de dados simples',
                    'nivelBloom' => 'aplicar',
                    'tagsIds' => ['tag-vetor'],
                    'tagsNomes' => ['vetor'],
                    'observacaoPedagogica' => 'Boa para introduzir arrays.',
                    'status' => 'ativa',
                    'anexos' => [],
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'q-004' => [
                    'id' => 'q-004',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-lacos',
                    'subassuntoId' => 'sub-acumulador',
                    'tipo' => 'discursiva',
                    'enunciado' => 'Explique a diferença entre contador e acumulador em um algoritmo.',
                    'alternativas' => [],
                    'respostaCorreta' => 'Um contador registra quantas vezes algo ocorre; um acumulador soma ou agrega valores.',
                    'explicacao' => 'Contadores costumam variar por unidade, enquanto acumuladores incorporam valores processados.',
                    'dificuldade' => 'medio',
                    'fonte' => 'Banco inicial',
                    'competencia' => 'Diferenciar padrões de variáveis',
                    'nivelBloom' => 'compreender',
                    'tagsIds' => ['tag-contador', 'tag-algoritmo'],
                    'tagsNomes' => ['contador', 'algoritmo'],
                    'observacaoPedagogica' => '',
                    'status' => 'ativa',
                    'anexos' => [],
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'q-005' => [
                    'id' => 'q-005',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-lacos',
                    'subassuntoId' => 'sub-for',
                    'tipo' => 'multipla_escolha',
                    'enunciado' => 'Em qual situação o laço for costuma ser mais adequado?',
                    'alternativas' => [
                        ['id' => 'a', 'texto' => 'Quando a quantidade de repetições é conhecida', 'correta' => true],
                        ['id' => 'b', 'texto' => 'Quando não existe condição de parada', 'correta' => false],
                        ['id' => 'c', 'texto' => 'Quando o algoritmo não usa contador', 'correta' => false],
                    ],
                    'respostaCorreta' => 'Quando a quantidade de repetições é conhecida',
                    'explicacao' => 'O laço for é útil quando se sabe previamente quantas iterações serão executadas.',
                    'dificuldade' => 'facil',
                    'fonte' => 'Banco inicial',
                    'competencia' => 'Selecionar estrutura de repetição',
                    'nivelBloom' => 'aplicar',
                    'tagsIds' => ['tag-algoritmo', 'tag-contador'],
                    'tagsNomes' => ['algoritmo', 'contador'],
                    'observacaoPedagogica' => '',
                    'status' => 'ativa',
                    'anexos' => [],
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'q-006' => [
                    'id' => 'q-006',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-matrizes',
                    'subassuntoId' => 'sub-matriz-bidimensional',
                    'tipo' => 'discursiva',
                    'enunciado' => 'Descreva uma situação em que uma matriz bidimensional é mais adequada que um vetor.',
                    'alternativas' => [],
                    'respostaCorreta' => 'Quando os dados possuem duas dimensões, como linhas e colunas de uma tabela.',
                    'explicacao' => 'Matrizes representam dados organizados por dois índices.',
                    'dificuldade' => 'medio',
                    'fonte' => 'Banco inicial',
                    'competencia' => 'Escolher estruturas de dados',
                    'nivelBloom' => 'avaliar',
                    'tagsIds' => ['tag-matriz'],
                    'tagsNomes' => ['matriz'],
                    'observacaoPedagogica' => '',
                    'status' => 'ativa',
                    'anexos' => [],
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'q-007' => [
                    'id' => 'q-007',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-entrada-processamento-saida',
                    'subassuntoId' => 'sub-variaveis',
                    'tipo' => 'verdadeiro_falso',
                    'enunciado' => 'Uma variável pode armazenar valores temporários usados durante o processamento de um algoritmo.',
                    'alternativas' => [],
                    'respostaCorreta' => 'verdadeiro',
                    'explicacao' => 'Variáveis guardam dados que podem ser lidos e alterados ao longo do algoritmo.',
                    'dificuldade' => 'facil',
                    'fonte' => 'Banco inicial',
                    'competencia' => 'Compreender uso de variáveis',
                    'nivelBloom' => 'compreender',
                    'tagsIds' => ['tag-algoritmo'],
                    'tagsNomes' => ['algoritmo'],
                    'observacaoPedagogica' => '',
                    'status' => 'ativa',
                    'anexos' => [],
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'q-008' => [
                    'id' => 'q-008',
                    'disciplinaId' => 'disc-prog',
                    'assuntoId' => 'ass-lacos',
                    'subassuntoId' => 'sub-while',
                    'tipo' => 'codigo_analise',
                    'enunciado' => "Faça o teste de mesa do algoritmo:\n\nsoma <- 0\ncontador <- 1\nenquanto contador <= 3 faça\n  soma <- soma + contador\n  contador <- contador + 1\nfim-enquanto",
                    'alternativas' => [],
                    'respostaCorreta' => 'A soma final será 6.',
                    'explicacao' => 'O algoritmo soma 1 + 2 + 3.',
                    'dificuldade' => 'medio',
                    'fonte' => 'Banco inicial',
                    'competencia' => 'Executar teste de mesa',
                    'nivelBloom' => 'analisar',
                    'tagsIds' => ['tag-algoritmo', 'tag-while', 'tag-contador', 'tag-teste-mesa'],
                    'tagsNomes' => ['algoritmo', 'while', 'contador', 'teste de mesa'],
                    'observacaoPedagogica' => 'Boa para exercitar rastreamento de variáveis.',
                    'status' => 'ativa',
                    'anexos' => [],
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
            ],
            'listas' => [
                'lista-revisao-lacos' => [
                    'id' => 'lista-revisao-lacos',
                    'titulo' => 'Revisão de laços de repetição',
                    'cabecalho' => [
                        'instituicao' => 'Escola Modelo',
                        'curso' => 'Técnico em Informática',
                        'disciplinaTexto' => 'Introdução à Programação',
                        'professor' => 'Professor',
                        'turma' => '1º ano',
                        'data' => '03/06/2026',
                        'tituloExibicao' => 'Lista de Revisão',
                    ],
                    'instrucoes' => 'Resolva as questões com atenção.',
                    'incluirGabarito' => true,
                    'status' => 'ativa',
                    'blocos' => [
                        [
                            'id' => 'bloco-lacos',
                            'ordem' => 1,
                            'tituloBloco' => 'Laços',
                            'filtros' => ['disciplinaId' => 'disc-prog', 'assuntoIds' => ['ass-lacos'], 'subassuntoIds' => [], 'tagIds' => [], 'tipo' => '', 'dificuldade' => '', 'competencia' => '', 'nivelBloom' => '', 'search' => ''],
                            'questoesIds' => ['q-001', 'q-004', 'q-005', 'q-008'],
                            'questoesRemovidasIds' => [],
                            'duplicadasIgnoradasIds' => [],
                            'createdAt' => $now,
                            'updatedAt' => $now,
                        ],
                    ],
                    'questoesSelecionadas' => [
                        ['blocoId' => 'bloco-lacos', 'questaoId' => 'q-001', 'ordem' => 1, 'removida' => false, 'origemAutomatica' => true],
                        ['blocoId' => 'bloco-lacos', 'questaoId' => 'q-004', 'ordem' => 2, 'removida' => false, 'origemAutomatica' => true],
                        ['blocoId' => 'bloco-lacos', 'questaoId' => 'q-005', 'ordem' => 3, 'removida' => false, 'origemAutomatica' => true],
                        ['blocoId' => 'bloco-lacos', 'questaoId' => 'q-008', 'ordem' => 4, 'removida' => false, 'origemAutomatica' => true],
                    ],
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
                'lista-vetores-matrizes' => [
                    'id' => 'lista-vetores-matrizes',
                    'titulo' => 'Vetores e matrizes',
                    'cabecalho' => [
                        'instituicao' => 'Escola Modelo',
                        'curso' => 'Técnico em Informática',
                        'disciplinaTexto' => 'Introdução à Programação',
                        'professor' => 'Professor',
                        'turma' => '1º ano',
                        'data' => '03/06/2026',
                        'tituloExibicao' => 'Lista de Estruturas',
                    ],
                    'instrucoes' => 'Justifique suas respostas.',
                    'incluirGabarito' => false,
                    'status' => 'ativa',
                    'blocos' => [
                        [
                            'id' => 'bloco-estruturas',
                            'ordem' => 1,
                            'tituloBloco' => 'Estruturas indexadas',
                            'filtros' => ['disciplinaId' => 'disc-prog', 'assuntoIds' => ['ass-vetores', 'ass-matrizes'], 'subassuntoIds' => [], 'tagIds' => [], 'tipo' => '', 'dificuldade' => '', 'competencia' => '', 'nivelBloom' => '', 'search' => ''],
                            'questoesIds' => ['q-003', 'q-006'],
                            'questoesRemovidasIds' => [],
                            'duplicadasIgnoradasIds' => [],
                            'createdAt' => $now,
                            'updatedAt' => $now,
                        ],
                    ],
                    'questoesSelecionadas' => [
                        ['blocoId' => 'bloco-estruturas', 'questaoId' => 'q-003', 'ordem' => 1, 'removida' => false, 'origemAutomatica' => true],
                        ['blocoId' => 'bloco-estruturas', 'questaoId' => 'q-006', 'ordem' => 2, 'removida' => false, 'origemAutomatica' => true],
                    ],
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
            ],
        ];
    }
}
