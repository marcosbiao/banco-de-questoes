<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Assuntos\AssuntoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssuntoController extends Controller
{
    public function __construct(private readonly AssuntoService $assuntoService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->assuntoService->listar($request->query()),
        ]);
    }

    public function porDisciplina(string $disciplinaId): JsonResponse
    {
        return response()->json([
            'data' => $this->assuntoService->listar(['disciplinaId' => $disciplinaId]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'disciplinaId' => ['required', 'string'],
            'nome' => ['required', 'string', 'min:2'],
        ]);

        return response()->json([
            'message' => 'Assunto criado com sucesso.',
            'data' => $this->assuntoService->criar($validated),
        ], 201);
    }
}
