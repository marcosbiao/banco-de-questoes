<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('about:banco-questoes', function (): void {
    $this->info('Banco de Questões e Gerador de Listas');
})->purpose('Exibe informações básicas do projeto.');
