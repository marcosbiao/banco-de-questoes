<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Questoes\QuestaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class QuestaoController extends Controller
{
    public function __construct(private readonly QuestaoService $questaoService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->questaoService->listar($request->query()),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatedData($request);

        return response()->json([
            'message' => 'Questão criada com sucesso.',
            'data' => $this->questaoService->criar($validated),
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $questao = $this->questaoService->buscar($id);

        if (! $questao) {
            return response()->json(['message' => 'Questão não encontrada.'], 404);
        }

        return response()->json(['data' => $questao]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $questao = $this->questaoService->atualizar($id, $this->validatedData($request));

        if (! $questao) {
            return response()->json(['message' => 'Questão não encontrada.'], 404);
        }

        return response()->json([
            'message' => 'Questão atualizada com sucesso.',
            'data' => $questao,
        ]);
    }

    public function arquivar(string $id): JsonResponse
    {
        $questao = $this->questaoService->arquivar($id);

        if (! $questao) {
            return response()->json(['message' => 'Questão não encontrada.'], 404);
        }

        return response()->json([
            'message' => 'Questão arquivada com sucesso.',
            'data' => $questao,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request): array
    {
        $validated = $request->validate([
            'disciplinaId' => ['required', 'string'],
            'assuntoId' => ['required', 'string'],
            'subassuntoId' => ['required', 'string'],
            'tipo' => ['required', 'string', Rule::in(QuestaoService::TIPOS_PERMITIDOS)],
            'enunciado' => ['required', 'string', 'min:3'],
            'alternativas' => ['nullable', 'array'],
            'alternativas.*.id' => ['nullable', 'string'],
            'alternativas.*.texto' => ['nullable', 'string'],
            'alternativas.*.correta' => ['nullable', 'boolean'],
            'respostaCorreta' => ['nullable', 'string'],
            'explicacao' => ['nullable', 'string'],
            'dificuldade' => ['nullable', 'string', Rule::in(QuestaoService::DIFICULDADES_PERMITIDAS)],
            'fonte' => ['nullable', 'string'],
            'competencia' => ['nullable', 'string'],
            'nivelBloom' => ['nullable', 'string', Rule::in(QuestaoService::NIVEIS_BLOOM_PERMITIDOS)],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string'],
            'tagsIds' => ['nullable', 'array'],
            'tagsNomes' => ['nullable', 'array'],
            'observacaoPedagogica' => ['nullable', 'string'],
            'status' => ['nullable', 'string', Rule::in(QuestaoService::STATUS_PERMITIDOS)],
            'anexos' => ['nullable', 'array'],
        ], [
            'disciplinaId.required' => 'Selecione uma disciplina.',
            'assuntoId.required' => 'Selecione um assunto.',
            'subassuntoId.required' => 'Selecione um subassunto.',
            'tipo.required' => 'Selecione o tipo da questão.',
            'tipo.in' => 'Selecione um tipo de questão válido.',
            'enunciado.required' => 'Informe o enunciado da questão.',
            'enunciado.min' => 'O enunciado precisa ter pelo menos :min caracteres.',
            'dificuldade.in' => 'Selecione uma dificuldade válida.',
            'nivelBloom.in' => 'Selecione um nível de Bloom válido.',
            'status.in' => 'Selecione um status válido.',
        ]);

        $this->validateRegrasPorTipo($validated);

        return $validated;
    }

    /**
     * @param array<string, mixed> $validated
     */
    private function validateRegrasPorTipo(array $validated): void
    {
        if (($validated['tipo'] ?? '') === 'multipla_escolha') {
            $alternativas = collect($validated['alternativas'] ?? [])
                ->filter(fn (mixed $alternativa): bool => is_array($alternativa) && filled($alternativa['texto'] ?? null))
                ->values();
            $corretas = $alternativas
                ->filter(fn (array $alternativa): bool => (bool) ($alternativa['correta'] ?? false))
                ->values();

            if ($alternativas->count() < 2) {
                throw ValidationException::withMessages([
                    'alternativas' => 'Informe pelo menos duas alternativas preenchidas.',
                ]);
            }

            if ($corretas->count() !== 1) {
                throw ValidationException::withMessages([
                    'alternativas' => 'Marque exatamente uma alternativa correta.',
                ]);
            }
        }

        if (($validated['tipo'] ?? '') === 'verdadeiro_falso' && filled($validated['respostaCorreta'] ?? null)) {
            $resposta = mb_strtolower((string) $validated['respostaCorreta'], 'UTF-8');

            if (! in_array($resposta, ['verdadeiro', 'falso', 'true', 'false'], true)) {
                throw ValidationException::withMessages([
                    'respostaCorreta' => 'Para verdadeiro ou falso, use Verdadeiro ou Falso.',
                ]);
            }
        }
    }
}
