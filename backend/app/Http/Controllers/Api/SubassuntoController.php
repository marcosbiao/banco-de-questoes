<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Subassuntos\SubassuntoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubassuntoController extends Controller
{
    public function __construct(private readonly SubassuntoService $subassuntoService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->subassuntoService->listar($request->query()),
        ]);
    }

    public function porAssunto(string $assuntoId): JsonResponse
    {
        return response()->json([
            'data' => $this->subassuntoService->listar(['assuntoId' => $assuntoId]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'disciplinaId' => ['required', 'string'],
            'assuntoId' => ['required', 'string'],
            'nome' => ['required', 'string', 'min:2'],
        ]);

        return response()->json([
            'message' => 'Subassunto criado com sucesso.',
            'data' => $this->subassuntoService->criar($validated),
        ], 201);
    }
}
