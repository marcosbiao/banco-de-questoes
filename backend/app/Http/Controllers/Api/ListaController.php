<?php

namespace App\Http\Controllers\Api;

use App\DTO\ListaFiltroDTO;
use App\Http\Controllers\Controller;
use App\Services\Listas\ListaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ListaController extends Controller
{
    public function __construct(private readonly ListaService $listaService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->listaService->listar($request->query()),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $lista = $this->listaService->buscar($id);

        if (! $lista) {
            return response()->json(['message' => 'Lista não encontrada.'], 404);
        }

        return response()->json(['data' => $lista]);
    }

    public function montar(Request $request): JsonResponse
    {
        $validated = $this->validatedData($request, requireMontagem: true);

        return response()->json([
            'message' => 'Lista montada com sucesso.',
            'data' => $this->listaService->montar($validated),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatedData($request);

        return response()->json([
            'message' => 'Lista salva com sucesso.',
            'data' => $this->listaService->criar($validated),
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $this->validatedData($request);
        $lista = $this->listaService->atualizar($id, $validated);

        if (! $lista) {
            return response()->json(['message' => 'Lista não encontrada.'], 404);
        }

        return response()->json([
            'message' => 'Lista atualizada com sucesso.',
            'data' => $lista,
        ]);
    }

    public function arquivar(string $id): JsonResponse
    {
        $lista = $this->listaService->arquivar($id);

        if (! $lista) {
            return response()->json(['message' => 'Lista não encontrada.'], 404);
        }

        return response()->json([
            'message' => 'Lista arquivada com sucesso.',
            'data' => $lista,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        if (! $this->listaService->excluir($id)) {
            return response()->json(['message' => 'Lista não encontrada.'], 404);
        }

        return response()->json(['message' => 'Lista excluída com sucesso.']);
    }

    public function remontar(string $id): JsonResponse
    {
        $lista = $this->listaService->remontar($id);

        if (! $lista) {
            return response()->json(['message' => 'Lista não encontrada.'], 404);
        }

        return response()->json([
            'message' => 'Lista remontada com sucesso.',
            'data' => $lista,
        ]);
    }

    public function preview(string $id): JsonResponse
    {
        $lista = $this->listaService->preview($id);

        if (! $lista) {
            return response()->json(['message' => 'Lista não encontrada.'], 404);
        }

        return response()->json(['data' => $lista]);
    }

    public function gerar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => ['nullable', 'string'],
            'cabecalho' => ['nullable'],
            'instrucoes' => ['nullable', 'string'],
            'incluirGabarito' => ['nullable', 'boolean'],
            'blocos' => ['nullable', 'array'],
        ]);

        return response()->json([
            'message' => 'Lista montada com sucesso.',
            'data' => $this->listaService->gerar(ListaFiltroDTO::fromArray($validated)),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request, bool $requireMontagem = false): array
    {
        $validated = $request->validate([
            'id' => ['nullable', 'string'],
            'titulo' => ['required', 'string', 'min:2'],
            'cabecalho' => ['nullable', 'array'],
            'cabecalho.instituicao' => ['nullable', 'string'],
            'cabecalho.curso' => ['nullable', 'string'],
            'cabecalho.disciplinaTexto' => ['nullable', 'string'],
            'cabecalho.professor' => ['nullable', 'string'],
            'cabecalho.turma' => ['nullable', 'string'],
            'cabecalho.data' => ['nullable', 'string'],
            'cabecalho.tituloExibicao' => ['nullable', 'string'],
            'instrucoes' => ['nullable', 'string'],
            'incluirGabarito' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', Rule::in(['ativa', 'arquivada'])],
            'blocos' => ['required', 'array', 'min:1'],
            'blocos.*.id' => ['nullable', 'string'],
            'blocos.*.ordem' => ['required', 'integer', 'min:1'],
            'blocos.*.tituloBloco' => ['required', 'string', 'min:1'],
            'blocos.*.filtros' => ['required', 'array'],
            'blocos.*.filtros.disciplinaId' => ['nullable', 'string'],
            'blocos.*.filtros.assuntoIds' => ['nullable', 'array'],
            'blocos.*.filtros.assuntoIds.*' => ['string'],
            'blocos.*.filtros.subassuntoIds' => ['nullable', 'array'],
            'blocos.*.filtros.subassuntoIds.*' => ['string'],
            'blocos.*.filtros.tagIds' => ['nullable', 'array'],
            'blocos.*.filtros.tagIds.*' => ['string'],
            'blocos.*.filtros.tipo' => ['nullable', 'string'],
            'blocos.*.filtros.dificuldade' => ['nullable', 'string'],
            'blocos.*.filtros.competencia' => ['nullable', 'string'],
            'blocos.*.filtros.nivelBloom' => ['nullable', 'string'],
            'blocos.*.filtros.search' => ['nullable', 'string'],
            'blocos.*.questoesIds' => ['nullable', 'array'],
            'blocos.*.questoesIds.*' => ['string'],
            'blocos.*.questoesRemovidasIds' => ['nullable', 'array'],
            'blocos.*.questoesRemovidasIds.*' => ['string'],
            'blocos.*.duplicadasIgnoradasIds' => ['nullable', 'array'],
            'blocos.*.duplicadasIgnoradasIds.*' => ['string'],
            'blocos.*.questoes' => ['nullable', 'array'],
            'questoesSelecionadas' => ['nullable', 'array'],
            'duplicadasIgnoradasTotal' => ['nullable', 'integer'],
        ]);

        $this->validateFiltroMinimo($validated, $requireMontagem);

        return $validated;
    }

    /**
     * @param array<string, mixed> $validated
     */
    private function validateFiltroMinimo(array $validated, bool $requireMontagem): void
    {
        foreach ($validated['blocos'] ?? [] as $index => $bloco) {
            $filtros = $bloco['filtros'] ?? [];
            $hasFilter = collect([
                $filtros['disciplinaId'] ?? '',
                $filtros['assuntoIds'] ?? [],
                $filtros['subassuntoIds'] ?? [],
                $filtros['tagIds'] ?? [],
                $filtros['tipo'] ?? '',
                $filtros['dificuldade'] ?? '',
                $filtros['competencia'] ?? '',
                $filtros['nivelBloom'] ?? '',
                $filtros['search'] ?? '',
            ])->contains(fn (mixed $value): bool => is_array($value) ? count(array_filter($value)) > 0 : filled($value));

            if (! $hasFilter) {
                throw ValidationException::withMessages([
                    "blocos.$index.filtros" => 'Selecione pelo menos um filtro para montar este bloco.',
                ]);
            }
        }
    }
}
