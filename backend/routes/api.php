<?php

use App\Http\Controllers\Api\AssuntoController;
use App\Http\Controllers\Api\DisciplinaController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\ListaController;
use App\Http\Controllers\Api\ListaPdfController;
use App\Http\Controllers\Api\QuestaoController;
use App\Http\Controllers\Api\SubassuntoController;
use App\Http\Controllers\Api\TagController;
use Illuminate\Support\Facades\Route;

Route::get('/health', [HealthController::class, 'show']);

Route::get('/disciplinas', [DisciplinaController::class, 'index']);
Route::post('/disciplinas', [DisciplinaController::class, 'store']);
Route::get('/disciplinas/{disciplinaId}/assuntos', [AssuntoController::class, 'porDisciplina']);

Route::get('/assuntos', [AssuntoController::class, 'index']);
Route::post('/assuntos', [AssuntoController::class, 'store']);
Route::get('/assuntos/{assuntoId}/subassuntos', [SubassuntoController::class, 'porAssunto']);

Route::get('/subassuntos', [SubassuntoController::class, 'index']);
Route::post('/subassuntos', [SubassuntoController::class, 'store']);

Route::get('/tags/sugestoes', [TagController::class, 'sugestoes']);
Route::get('/tags', [TagController::class, 'index']);
Route::post('/tags', [TagController::class, 'store']);

Route::get('/questoes', [QuestaoController::class, 'index']);
Route::get('/questoes/{id}', [QuestaoController::class, 'show']);
Route::post('/questoes', [QuestaoController::class, 'store']);
Route::put('/questoes/{id}', [QuestaoController::class, 'update']);
Route::patch('/questoes/{id}/arquivar', [QuestaoController::class, 'arquivar']);

Route::get('/listas', [ListaController::class, 'index']);
Route::post('/listas/montar', [ListaController::class, 'montar']);
Route::get('/listas/{id}/pdf', [ListaPdfController::class, 'show']);
Route::get('/listas/{id}', [ListaController::class, 'show']);
Route::post('/listas', [ListaController::class, 'store']);
Route::put('/listas/{id}', [ListaController::class, 'update']);
Route::patch('/listas/{id}/arquivar', [ListaController::class, 'arquivar']);
Route::delete('/listas/{id}', [ListaController::class, 'destroy']);
Route::post('/listas/{id}/remontar', [ListaController::class, 'remontar']);
Route::get('/listas/{id}/preview', [ListaController::class, 'preview']);
Route::post('/listas/gerar', [ListaController::class, 'gerar']);
