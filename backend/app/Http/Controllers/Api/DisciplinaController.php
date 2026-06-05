<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Disciplinas\DisciplinaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DisciplinaController extends Controller
{
    public function __construct(private readonly DisciplinaService $disciplinaService)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->disciplinaService->listar(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome' => ['required', 'string', 'min:2'],
            'descricao' => ['nullable', 'string'],
        ]);

        return response()->json([
            'message' => 'Disciplina criada com sucesso.',
            'data' => $this->disciplinaService->criar($validated),
        ], 201);
    }
}
