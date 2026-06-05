<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Listas\ListaPdfService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ListaPdfController extends Controller
{
    public function __construct(private readonly ListaPdfService $listaPdfService)
    {
    }

    public function show(Request $request, string $id): Response|JsonResponse
    {
        $comGabarito = filter_var($request->query('gabarito', false), FILTER_VALIDATE_BOOLEAN);
        $dados = $this->listaPdfService->preparar($id, $comGabarito);

        if (! $dados) {
            return response()->json(['message' => 'Lista não encontrada.'], 404);
        }

        return Pdf::loadView('pdf.lista-exercicios', $dados)
            ->setPaper('a4')
            ->download($dados['filename']);
    }
}
