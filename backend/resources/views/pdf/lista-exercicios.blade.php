<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>{{ $lista['titulo'] ?? 'Lista de Exercícios' }}</title>
    <style>
        @page {
            margin: 22mm 18mm 20mm 18mm;
        }

        body {
            color: #1f2933;
            font-family: "DejaVu Sans", Arial, sans-serif;
            font-size: 12px;
            line-height: 1.5;
        }

        h1,
        h2,
        h3,
        p {
            margin: 0;
        }

        .document-header {
            border-bottom: 1px solid #b7c2bd;
            margin-bottom: 18px;
            padding-bottom: 12px;
        }

        .header-table {
            border-collapse: collapse;
            margin-bottom: 14px;
            width: 100%;
        }

        .header-table td {
            padding: 2px 10px 2px 0;
            vertical-align: top;
        }

        .header-label {
            color: #4b5a66;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            width: 120px;
        }

        .title-area {
            text-align: center;
        }

        .title-area h1 {
            color: #111827;
            font-size: 20px;
            line-height: 1.25;
        }

        .version-label {
            border: 1px solid #9ca3af;
            border-radius: 3px;
            color: #374151;
            display: inline-block;
            font-size: 10px;
            font-weight: bold;
            margin-top: 8px;
            padding: 3px 8px;
            text-transform: uppercase;
        }

        .instructions {
            background: #f6f8f7;
            border: 1px solid #d9e0dc;
            margin-bottom: 18px;
            padding: 10px;
        }

        .instructions-title,
        .gabarito-title {
            color: #374151;
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 4px;
            text-transform: uppercase;
        }

        .block {
            margin-bottom: 18px;
        }

        .block-title {
            background: #eef3f1;
            border-left: 4px solid #0f766e;
            color: #143d39;
            font-size: 14px;
            margin-bottom: 10px;
            padding: 7px 9px;
        }

        .question {
            border: 1px solid #d9e0dc;
            margin-bottom: 12px;
            padding: 10px;
            page-break-inside: avoid;
        }

        .question-title {
            color: #111827;
            font-weight: bold;
            margin-bottom: 6px;
        }

        .enunciado {
            white-space: pre-wrap;
        }

        .code-block {
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            font-family: "DejaVu Sans Mono", "Courier New", monospace;
            font-size: 11px;
            line-height: 1.45;
            margin: 6px 0 0;
            padding: 8px;
            white-space: pre-wrap;
        }

        .alternatives {
            margin-top: 8px;
        }

        .alternative {
            margin-bottom: 4px;
        }

        .correct-mark {
            color: #0f766e;
            font-weight: bold;
        }

        .attachment-note {
            background: #fff8e6;
            border: 1px solid #ead28b;
            color: #725100;
            margin-top: 8px;
            padding: 6px 8px;
        }

        .answer-space {
            margin-top: 10px;
        }

        .answer-line {
            border-bottom: 1px solid #c5d0cb;
            height: 18px;
        }

        .gabarito {
            background: #f3fbf8;
            border: 1px solid #b8ddd3;
            color: #164e45;
            margin-top: 9px;
            padding: 8px;
        }

        .gabarito p {
            margin-bottom: 5px;
        }

        .meta {
            border-top: 1px solid #cce5de;
            color: #365f59;
            font-size: 10px;
            margin-top: 6px;
            padding-top: 6px;
        }

        .footer {
            bottom: -12mm;
            color: #6b7280;
            font-size: 9px;
            left: 0;
            position: fixed;
            right: 0;
            text-align: center;
        }
    </style>
</head>
<body>
@php
    $cabecalho = $lista['cabecalho'] ?? [];
    $camposCabecalho = [
        ['label' => 'Instituição', 'value' => $cabecalho['instituicao'] ?? ''],
        ['label' => 'Curso', 'value' => $cabecalho['curso'] ?? ''],
        ['label' => 'Disciplina', 'value' => $cabecalho['disciplinaTexto'] ?? ''],
        ['label' => 'Professor', 'value' => $cabecalho['professor'] ?? ''],
        ['label' => 'Turma', 'value' => $cabecalho['turma'] ?? ''],
        ['label' => 'Data', 'value' => $cabecalho['data'] ?? ''],
        ['label' => 'Título', 'value' => $cabecalho['tituloExibicao'] ?? ''],
    ];
    $camposCabecalho = array_values(array_filter($camposCabecalho, fn (array $campo): bool => filled($campo['value'])));
    $numeroQuestao = 0;
    $tiposComEspaco = ['discursiva', 'codigo_analise', 'problema_programacao'];
@endphp

<footer class="footer">
    Gerado em {{ $geradoEm }}
</footer>

<header class="document-header">
    @if (count($camposCabecalho) > 0)
        <table class="header-table">
            <tbody>
            @foreach ($camposCabecalho as $campo)
                <tr>
                    <td class="header-label">{{ $campo['label'] }}:</td>
                    <td>{{ $campo['value'] }}</td>
                </tr>
            @endforeach
            </tbody>
        </table>
    @endif

    <div class="title-area">
        <h1>Lista de Exercícios: {{ $lista['titulo'] ?? 'Sem título' }}</h1>
        <span class="version-label">{{ $comGabarito ? 'Versão com gabarito' : 'Versão sem gabarito' }}</span>
    </div>
</header>

@if (filled($lista['instrucoes'] ?? ''))
    <section class="instructions">
        <p class="instructions-title">Instruções</p>
        <div class="enunciado">{{ $lista['instrucoes'] }}</div>
    </section>
@endif

@foreach ($lista['blocos'] ?? [] as $bloco)
    <section class="block">
        <h2 class="block-title">{{ $bloco['ordem'] ?? $loop->iteration }}. {{ $bloco['tituloBloco'] ?? $bloco['titulo'] ?? 'Bloco' }}</h2>

        @foreach ($bloco['questoes'] ?? [] as $questao)
            @php
                $numeroQuestao++;
                $tipo = $questao['tipo'] ?? '';
                $alternativas = is_array($questao['alternativas'] ?? null) ? $questao['alternativas'] : [];
                $tags = $questao['tagsNomes'] ?? $questao['tags'] ?? [];
                $tags = is_array($tags) ? array_values(array_filter($tags)) : array_values(array_filter(array_map('trim', explode(',', (string) $tags))));
                $anexos = $questao['anexos'] ?? [];
                $totalAnexos = is_array($anexos) ? count($anexos) : (filled($anexos) ? 1 : 0);
                $temAnexo = in_array($tipo, ['imagem', 'arquivo_anexo'], true) || $totalAnexos > 0;
                $temGabarito = filled($questao['respostaCorreta'] ?? '')
                    || filled($questao['explicacao'] ?? '')
                    || filled($questao['observacaoPedagogica'] ?? '')
                    || filled($questao['fonte'] ?? '')
                    || filled($questao['dificuldade'] ?? '')
                    || count($tags) > 0;
            @endphp

            <article class="question">
                <p class="question-title">Questão {{ $numeroQuestao }}</p>

                @if (in_array($tipo, ['codigo_analise', 'problema_programacao'], true))
                    <pre class="code-block">{{ $questao['enunciado'] ?? '' }}</pre>
                @else
                    <div class="enunciado">{{ $questao['enunciado'] ?? '' }}</div>
                @endif

                @if (count($alternativas) > 0)
                    <div class="alternatives">
                        @foreach ($alternativas as $index => $alternativa)
                            @php
                                $alternativaCorreta = filter_var($alternativa['correta'] ?? false, FILTER_VALIDATE_BOOLEAN);
                            @endphp
                            <p class="alternative">
                                <strong>{{ chr(65 + $index) }}.</strong>
                                {{ $alternativa['texto'] ?? '' }}
                                @if ($comGabarito && $alternativaCorreta)
                                    <span class="correct-mark">(correta)</span>
                                @endif
                            </p>
                        @endforeach
                    </div>
                @elseif ($tipo === 'verdadeiro_falso')
                    <div class="alternatives">
                        <p class="alternative"><strong>( )</strong> Verdadeiro</p>
                        <p class="alternative"><strong>( )</strong> Falso</p>
                    </div>
                @endif

                @if ($temAnexo)
                    <div class="attachment-note">
                        @if ($tipo === 'imagem')
                            [Imagem/anexo associado à questão]
                        @elseif ($tipo === 'arquivo_anexo')
                            [Arquivo/anexo associado à questão]
                        @else
                            [Anexo associado à questão]
                        @endif
                    </div>
                @endif

                @if (! $comGabarito && in_array($tipo, $tiposComEspaco, true))
                    <div class="answer-space">
                        <div class="answer-line"></div>
                        <div class="answer-line"></div>
                        <div class="answer-line"></div>
                        <div class="answer-line"></div>
                    </div>
                @endif

                @if ($comGabarito && $temGabarito)
                    <div class="gabarito">
                        <p class="gabarito-title">Gabarito</p>

                        @if (filled($questao['respostaCorreta'] ?? ''))
                            <p><strong>Resposta correta:</strong> {{ $questao['respostaCorreta'] }}</p>
                        @endif

                        @if (filled($questao['explicacao'] ?? ''))
                            <p><strong>Explicação:</strong> {{ $questao['explicacao'] }}</p>
                        @endif

                        @if (filled($questao['observacaoPedagogica'] ?? ''))
                            <p><strong>Observação pedagógica:</strong> {{ $questao['observacaoPedagogica'] }}</p>
                        @endif

                        @if (filled($questao['fonte'] ?? '') || filled($questao['dificuldade'] ?? '') || count($tags) > 0)
                            <div class="meta">
                                @if (filled($questao['fonte'] ?? ''))
                                    Fonte: {{ $questao['fonte'] }}
                                @endif
                                @if (filled($questao['dificuldade'] ?? ''))
                                    {{ filled($questao['fonte'] ?? '') ? ' | ' : '' }}Dificuldade: {{ ucfirst(str_replace('_', ' ', $questao['dificuldade'])) }}
                                @endif
                                @if (count($tags) > 0)
                                    {{ filled($questao['fonte'] ?? '') || filled($questao['dificuldade'] ?? '') ? ' | ' : '' }}Tags: {{ implode(', ', $tags) }}
                                @endif
                            </div>
                        @endif
                    </div>
                @endif
            </article>
        @endforeach
    </section>
@endforeach
</body>
</html>
