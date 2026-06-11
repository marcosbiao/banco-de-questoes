import QuestaoImagens from '../questoes/QuestaoImagens.jsx';
import { normalizarImagensQuestao } from '../../utils/questionImages.js';
import { montarItensComCabecalhosDoBloco } from '../../utils/ordenacaoQuestoes.js';

function text(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value);
}

function hasSeparatedCode(questao) {
  return questao.tipo === 'codigo_analise' && (questao.textoAntesCodigo || questao.codigo);
}

function isLegacyCodeAnalysis(questao) {
  return questao.tipo === 'codigo_analise' && !hasSeparatedCode(questao);
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
            max-width: 100%;
            min-height: 1123px;
            padding: 32px;
            box-sizing: border-box;
            overflow-x: hidden;
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
            max-width: 100%;
            overflow-x: hidden;
            padding-bottom: 14px;
            border-bottom: 1px solid #b7c2bd;
            margin-bottom: 18px;
          }

          .pdf-header-grid {
            display: table;
            width: 100%;
            max-width: 100%;
            table-layout: fixed;
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
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .pdf-header-label {
            width: 120px;
            color: #374151;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .pdf-title {
            max-width: 100%;
            margin: 0;
            text-align: center;
            color: #111827;
            font-size: 22px;
            line-height: 1.25;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .pdf-version {
            display: block;
            width: max-content;
            max-width: 100%;
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
            max-width: 100%;
            margin-bottom: 18px;
            padding: 10px;
            border: 1px solid #d9e0dc;
            background: #f6f8f7;
            white-space: pre-wrap;
            overflow-x: hidden;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .pdf-section-title {
            margin: 0 0 5px;
            color: #374151;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .pdf-block {
            max-width: 100%;
            min-width: 0;
            margin-bottom: 18px;
            overflow-x: hidden;
            page-break-inside: avoid;
          }

          .pdf-block-title {
            max-width: 100%;
            margin: 0 0 10px;
            padding: 7px 9px;
            border-left: 4px solid #0f766e;
            background: #eef3f1;
            color: #143d39;
            font-size: 15px;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .pdf-question {
            max-width: 100%;
            min-width: 0;
            margin-bottom: 12px;
            padding: 10px;
            border: 1px solid #d9e0dc;
            overflow-x: hidden;
            page-break-inside: avoid;
          }

          .pdf-group-heading {
            max-width: 100%;
            margin: 10px 0 6px;
            overflow-wrap: anywhere;
            word-break: break-word;
            page-break-after: avoid;
          }

          .pdf-group-heading-subject {
            padding: 6px 8px;
            border-left: 3px solid #9ca3af;
            background: #f3f4f6;
            color: #111827;
            font-size: 13px;
            font-weight: 700;
          }

          .pdf-group-heading-subtopic {
            color: #374151;
            font-size: 12px;
            font-weight: 700;
          }

          .pdf-question-title {
            margin: 0 0 6px;
            color: #111827;
            font-weight: 700;
          }

          .pdf-enunciado {
            max-width: 100%;
            margin: 0;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .pdf-code {
            max-width: 100%;
            margin: 6px 0 0;
            padding: 8px;
            border: 1px solid #d1d5db;
            background: #f3f4f6;
            color: #111827;
            font-family: "Courier New", Courier, monospace;
            font-size: 12px;
            line-height: 1.45;
            white-space: pre-wrap;
            overflow-x: hidden;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .question-images {
            max-width: 100%;
            margin: 8px 0;
            overflow-x: hidden;
          }

          .question-image-wrapper {
            width: 100%;
            max-width: 100%;
            margin: 9px 0;
            text-align: center;
            box-sizing: border-box;
            page-break-inside: avoid;
          }

          .question-image-wrapper img {
            max-width: 100%;
            height: auto;
            object-fit: contain;
            display: inline-block;
            page-break-inside: avoid;
          }

          .question-image-caption {
            max-width: 100%;
            margin: 5px 0 0;
            color: #4b5563;
            font-size: 11px;
            line-height: 1.35;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .pdf-alternatives {
            max-width: 100%;
            margin-top: 8px;
            overflow-x: hidden;
          }

          .pdf-alternative {
            max-width: 100%;
            margin: 0 0 4px;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .pdf-correct {
            color: #0f766e;
            font-weight: 700;
          }

          .pdf-gabarito {
            max-width: 100%;
            margin-top: 9px;
            padding: 8px;
            border: 1px solid #b8ddd3;
            background: #f3fbf8;
            color: #164e45;
            overflow-x: hidden;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .pdf-gabarito p {
            max-width: 100%;
            margin: 0 0 5px;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .pdf-tags {
            max-width: 100%;
            margin-top: 6px;
            color: #365f59;
            font-size: 11px;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .pdf-attachment {
            max-width: 100%;
            margin-top: 8px;
            padding: 6px 8px;
            border: 1px solid #ead28b;
            background: #fff8e6;
            color: #725100;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          @media print {
            .lista-pdf-document,
            .pdf-header,
            .pdf-instructions,
            .pdf-block,
            .pdf-group-heading,
            .pdf-question,
            .pdf-alternatives,
            .pdf-gabarito,
            .pdf-attachment {
              max-width: 100%;
              overflow-x: hidden;
              box-sizing: border-box;
            }

            .pdf-title,
            .pdf-header-value,
            .pdf-instructions,
            .pdf-block-title,
            .pdf-group-heading,
            .pdf-enunciado,
            .pdf-code,
            .pdf-alternative,
            .pdf-gabarito,
            .pdf-gabarito p,
            .pdf-tags,
            .pdf-attachment {
              max-width: 100%;
              overflow-wrap: anywhere;
              word-break: break-word;
            }

            .question-image-wrapper,
            .question-image-wrapper img {
              max-width: 100%;
              height: auto;
              page-break-inside: avoid;
            }

            .pdf-code {
              white-space: pre-wrap;
              overflow-x: hidden;
            }
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

          {montarItensComCabecalhosDoBloco(bloco.questoes || [], bloco).map((item, itemIndex) => {
            if (item.tipo === 'cabecalho_assunto') {
              return (
                <h3 className="pdf-group-heading pdf-group-heading-subject" key={item.key}>
                  Assunto: {item.titulo}
                </h3>
              );
            }

            if (item.tipo === 'cabecalho_subassunto') {
              return (
                <h4 className="pdf-group-heading pdf-group-heading-subtopic" key={item.key}>
                  Subassunto: {item.titulo}
                </h4>
              );
            }

            const questao = item.questao;
            numeroQuestao += 1;
            const alternativas = Array.isArray(questao.alternativas) ? questao.alternativas : [];
            const tags = Array.isArray(questao.tagsNomes) ? questao.tagsNomes.filter(Boolean) : [];
            const imagens = normalizarImagensQuestao(questao.imagens);
            const hasGabarito = Boolean(questao.respostaCorreta || questao.explicacao || questao.observacaoPedagogica);

            return (
              <article className="pdf-question" key={item.key || questao.id || itemIndex}>
                <p className="pdf-question-title">Questão {numeroQuestao}</p>

                {hasSeparatedCode(questao) ? (
                  <>
                    {text(questao.textoAntesCodigo).trim() ? (
                      <p className="pdf-enunciado">{text(questao.textoAntesCodigo)}</p>
                    ) : null}
                    {text(questao.codigo).trim() ? (
                      <pre className="pdf-code">{text(questao.codigo)}</pre>
                    ) : null}
                  </>
                ) : isLegacyCodeAnalysis(questao) ? (
                  <pre className="pdf-code">{text(questao.enunciado)}</pre>
                ) : (
                  <p className="pdf-enunciado">{text(questao.enunciado)}</p>
                )}

                <QuestaoImagens imagens={imagens} />

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

                {questao.tipo === 'imagem' && !imagens.length ? (
                  <div className="pdf-attachment">[Questão marcada como imagem, mas sem imagem associada]</div>
                ) : null}

                {questao.tipo === 'arquivo_anexo' ? (
                  <div className="pdf-attachment">
                    [Arquivo/anexo associado à questão]
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
