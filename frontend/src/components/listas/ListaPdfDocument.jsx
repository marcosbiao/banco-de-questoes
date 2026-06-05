function text(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value);
}

function isCodeType(tipo) {
  return tipo === 'codigo_analise' || tipo === 'problema_programacao';
}

function needsAnswerSpace(tipo) {
  return tipo === 'discursiva' || tipo === 'codigo_analise' || tipo === 'problema_programacao';
}

function headerFields(cabecalho = {}) {
  if (typeof cabecalho === 'string') {
    return cabecalho ? [{ label: 'Cabeçalho', value: cabecalho }] : [];
  }

  return [
    ['Instituição', cabecalho.instituicao],
    ['Curso', cabecalho.curso],
    ['Disciplina', cabecalho.disciplinaTexto],
    ['Professor', cabecalho.professor],
    ['Turma', cabecalho.turma],
    ['Data', cabecalho.data],
    ['Título', cabecalho.tituloExibicao],
  ]
    .map(([label, value]) => ({ label, value: text(value).trim() }))
    .filter((field) => field.value);
}

export default function ListaPdfDocument({ lista, incluirGabarito = false }) {
  const blocos = (lista?.blocos || [])
    .slice()
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
  let numeroQuestao = 0;

  return (
    <article className="lista-pdf-document" data-pdf-document>
      <style>
        {`
          .lista-pdf-document {
            width: 794px;
            min-height: 1123px;
            padding: 32px;
            box-sizing: border-box;
            background: #ffffff;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
            line-height: 1.5;
          }

          .lista-pdf-document * {
            box-sizing: border-box;
          }

          .pdf-header {
            padding-bottom: 14px;
            border-bottom: 1px solid #b7c2bd;
            margin-bottom: 18px;
          }

          .pdf-header-grid {
            display: table;
            width: 100%;
            margin-bottom: 14px;
            border-collapse: collapse;
          }

          .pdf-header-row {
            display: table-row;
          }

          .pdf-header-label,
          .pdf-header-value {
            display: table-cell;
            padding: 2px 10px 2px 0;
            vertical-align: top;
          }

          .pdf-header-label {
            width: 120px;
            color: #374151;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .pdf-title {
            margin: 0;
            text-align: center;
            color: #111827;
            font-size: 22px;
            line-height: 1.25;
          }

          .pdf-version {
            display: block;
            width: max-content;
            margin: 8px auto 0;
            padding: 3px 8px;
            border: 1px solid #9ca3af;
            border-radius: 3px;
            color: #374151;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .pdf-instructions {
            margin-bottom: 18px;
            padding: 10px;
            border: 1px solid #d9e0dc;
            background: #f6f8f7;
            white-space: pre-wrap;
          }

          .pdf-section-title {
            margin: 0 0 5px;
            color: #374151;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .pdf-block {
            margin-bottom: 18px;
            page-break-inside: avoid;
          }

          .pdf-block-title {
            margin: 0 0 10px;
            padding: 7px 9px;
            border-left: 4px solid #0f766e;
            background: #eef3f1;
            color: #143d39;
            font-size: 15px;
          }

          .pdf-question {
            margin-bottom: 12px;
            padding: 10px;
            border: 1px solid #d9e0dc;
            page-break-inside: avoid;
          }

          .pdf-question-title {
            margin: 0 0 6px;
            color: #111827;
            font-weight: 700;
          }

          .pdf-enunciado {
            margin: 0;
            white-space: pre-wrap;
          }

          .pdf-code {
            margin: 6px 0 0;
            padding: 8px;
            border: 1px solid #d1d5db;
            background: #f3f4f6;
            color: #111827;
            font-family: "Courier New", Courier, monospace;
            font-size: 12px;
            line-height: 1.45;
            white-space: pre-wrap;
          }

          .pdf-alternatives {
            margin-top: 8px;
          }

          .pdf-alternative {
            margin: 0 0 4px;
          }

          .pdf-correct {
            color: #0f766e;
            font-weight: 700;
          }

          .pdf-answer-space {
            margin-top: 10px;
          }

          .pdf-answer-line {
            height: 19px;
            border-bottom: 1px solid #c5d0cb;
          }

          .pdf-gabarito {
            margin-top: 9px;
            padding: 8px;
            border: 1px solid #b8ddd3;
            background: #f3fbf8;
            color: #164e45;
          }

          .pdf-gabarito p {
            margin: 0 0 5px;
          }

          .pdf-tags {
            margin-top: 6px;
            color: #365f59;
            font-size: 11px;
          }

          .pdf-attachment {
            margin-top: 8px;
            padding: 6px 8px;
            border: 1px solid #ead28b;
            background: #fff8e6;
            color: #725100;
          }
        `}
      </style>

      <header className="pdf-header">
        {headerFields(lista?.cabecalho).length ? (
          <div className="pdf-header-grid">
            {headerFields(lista.cabecalho).map((field) => (
              <div className="pdf-header-row" key={field.label}>
                <div className="pdf-header-label">{field.label}:</div>
                <div className="pdf-header-value">{field.value}</div>
              </div>
            ))}
          </div>
        ) : null}
        <h1 className="pdf-title">Lista de Exercícios: {text(lista?.titulo) || 'Sem título'}</h1>
        <span className="pdf-version">{incluirGabarito ? 'Versão com gabarito' : 'Versão sem gabarito'}</span>
      </header>

      {text(lista?.instrucoes).trim() ? (
        <section className="pdf-instructions">
          <p className="pdf-section-title">Instruções</p>
          {text(lista.instrucoes)}
        </section>
      ) : null}

      {blocos.map((bloco, blocoIndex) => (
        <section className="pdf-block" key={bloco.id || blocoIndex}>
          <h2 className="pdf-block-title">
            {blocoIndex + 1}. {text(bloco.tituloBloco || bloco.titulo) || `Bloco ${blocoIndex + 1}`}
          </h2>

          {(bloco.questoes || []).map((questao, questaoIndex) => {
            numeroQuestao += 1;
            const alternativas = Array.isArray(questao.alternativas) ? questao.alternativas : [];
            const tags = Array.isArray(questao.tagsNomes) ? questao.tagsNomes.filter(Boolean) : [];
            const hasGabarito = Boolean(questao.respostaCorreta || questao.explicacao || questao.observacaoPedagogica);

            return (
              <article className="pdf-question" key={questao.id || questaoIndex}>
                <p className="pdf-question-title">Questão {numeroQuestao}</p>

                {isCodeType(questao.tipo) ? (
                  <pre className="pdf-code">{text(questao.enunciado)}</pre>
                ) : (
                  <p className="pdf-enunciado">{text(questao.enunciado)}</p>
                )}

                {questao.tipo === 'multipla_escolha' && alternativas.length ? (
                  <div className="pdf-alternatives">
                    {alternativas.map((alternativa, index) => (
                      <p className="pdf-alternative" key={alternativa.id || index}>
                        <strong>{String.fromCharCode(65 + index)}.</strong> {text(alternativa.texto)}
                        {incluirGabarito && alternativa.correta ? <span className="pdf-correct"> (correta)</span> : null}
                      </p>
                    ))}
                  </div>
                ) : null}

                {questao.tipo === 'verdadeiro_falso' && !alternativas.length ? (
                  <div className="pdf-alternatives">
                    <p className="pdf-alternative"><strong>( )</strong> Verdadeiro</p>
                    <p className="pdf-alternative"><strong>( )</strong> Falso</p>
                  </div>
                ) : null}

                {(questao.tipo === 'imagem' || questao.tipo === 'arquivo_anexo') ? (
                  <div className="pdf-attachment">
                    {questao.tipo === 'imagem' ? '[Imagem/anexo associado à questão]' : '[Arquivo/anexo associado à questão]'}
                  </div>
                ) : null}

                {!incluirGabarito && needsAnswerSpace(questao.tipo) ? (
                  <div className="pdf-answer-space">
                    <div className="pdf-answer-line" />
                    <div className="pdf-answer-line" />
                    <div className="pdf-answer-line" />
                    <div className="pdf-answer-line" />
                  </div>
                ) : null}

                {incluirGabarito && hasGabarito ? (
                  <div className="pdf-gabarito">
                    <p className="pdf-section-title">Gabarito</p>
                    {text(questao.respostaCorreta).trim() ? (
                      <p><strong>Resposta correta:</strong> {text(questao.respostaCorreta)}</p>
                    ) : null}
                    {text(questao.explicacao).trim() ? (
                      <p><strong>Explicação:</strong> {text(questao.explicacao)}</p>
                    ) : null}
                    {text(questao.observacaoPedagogica).trim() ? (
                      <p><strong>Observação pedagógica:</strong> {text(questao.observacaoPedagogica)}</p>
                    ) : null}
                    {tags.length ? <div className="pdf-tags">Tags: {tags.join(', ')}</div> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ))}
    </article>
  );
}
