<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Tags\TagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TagController extends Controller
{
    public function __construct(private readonly TagService $tagService)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->tagService->listar(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome' => ['required', 'string', 'min:1'],
        ]);

        return response()->json([
            'message' => 'Tag criada ou reutilizada com sucesso.',
            'data' => $this->tagService->criar($validated),
        ], 201);
    }

    public function sugestoes(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->tagService->sugestoes((string) $request->query('query', '')),
        ]);
    }
}
