import Badge from '../ui/Badge.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { normalizarImagensQuestao } from '../../utils/questionImages.js';
import { montarItensComCabecalhosDoBloco } from '../../utils/ordenacaoQuestoes.js';
import QuestaoImagens from '../questoes/QuestaoImagens.jsx';

function headerLines(cabecalho) {
  if (!cabecalho) return [];
  if (typeof cabecalho === 'string') return [cabecalho].filter(Boolean);

  return [
    cabecalho.instituicao,
    [cabecalho.curso, cabecalho.disciplinaTexto].filter(Boolean).join(' | '),
    [cabecalho.professor, cabecalho.turma, cabecalho.data].filter(Boolean).join(' | '),
    cabecalho.tituloExibicao,
  ].filter(Boolean);
}

function hasSeparatedCode(questao) {
  return questao.tipo === 'codigo_analise' && (questao.textoAntesCodigo || questao.codigo);
}

function isLegacyCodeAnalysis(questao) {
  return questao.tipo === 'codigo_analise' && !hasSeparatedCode(questao);
}

export default function ListaPreview({ lista }) {
  if (!lista || !lista.blocos?.length) {
    return <EmptyState title="Nenhuma lista para exibir" description="Gere uma lista para visualizar a prévia." />;
  }

  let numeroQuestao = 0;

  return (
    <section className="lista-preview">
      <div className="lista-paper-header">
        {headerLines(lista.cabecalho).map((line) => <p key={line}>{line}</p>)}
        <h2>{lista.titulo}</h2>
        {lista.instrucoes ? <p>{lista.instrucoes}</p> : null}
      </div>

      {lista.blocos
        .slice()
        .sort((a, b) => a.ordem - b.ordem)
        .map((bloco) => (
          <section key={bloco.id} className="preview-bloco">
            <div className="preview-bloco-title">
              <h3>{bloco.tituloBloco || bloco.titulo || `Bloco ${bloco.ordem}`}</h3>
              <Badge>{bloco.questoes?.length || 0} questões</Badge>
            </div>

            {montarItensComCabecalhosDoBloco(bloco.questoes || [], bloco).map((item) => {
              if (item.tipo === 'cabecalho_assunto') {
                return <h4 key={item.key} className="preview-group-heading preview-group-heading-subject">Assunto: {item.titulo}</h4>;
              }

              if (item.tipo === 'cabecalho_subassunto') {
                return <h5 key={item.key} className="preview-group-heading preview-group-heading-subtopic">Subassunto: {item.titulo}</h5>;
              }

              const questao = item.questao;
              numeroQuestao += 1;
              const hasGabarito = Boolean(questao.respostaCorreta || questao.explicacao || questao.observacaoPedagogica);
              const imagens = normalizarImagensQuestao(questao.imagens);

              return (
                <article key={item.key} className="preview-question">
                  <div className="preview-question-top">
                    <strong>{numeroQuestao}.</strong>
                    {hasSeparatedCode(questao) ? (
                      <div className="question-code-composed">
                        {questao.textoAntesCodigo ? <p>{questao.textoAntesCodigo}</p> : null}
                        {questao.codigo ? <pre className="question-code">{questao.codigo}</pre> : null}
                      </div>
                    ) : isLegacyCodeAnalysis(questao) ? (
                      <pre className="question-code">{questao.enunciado}</pre>
                    ) : (
                      <p>{questao.enunciado}</p>
                    )}
                  </div>

                  <QuestaoImagens imagens={imagens} />

                  {questao.tipo === 'multipla_escolha' && questao.alternativas?.length ? (
                    <div className="preview-alternativas">
                      {questao.alternativas.map((alternativa, index) => (
                        <p key={alternativa.id || index}>
                          <strong>{String.fromCharCode(65 + index)}.</strong>
                          <span className="alternative-text">{alternativa.texto}</span>
                          {lista.incluirGabarito && alternativa.correta ? <Badge variant="success">Correta</Badge> : null}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {questao.tipo === 'verdadeiro_falso' && !questao.alternativas?.length ? (
                    <div className="preview-alternativas">
                      <p><strong>( )</strong> Verdadeiro</p>
                      <p><strong>( )</strong> Falso</p>
                    </div>
                  ) : null}

                  {questao.tipo === 'imagem' && !imagens.length ? (
                    <div className="notice-box">Questão marcada como imagem, mas sem imagem associada.</div>
                  ) : null}

                  {questao.tipo === 'arquivo_anexo' ? (
                    <div className="notice-box">Upload de arquivos será implementado em etapa futura.</div>
                  ) : null}

                  {lista.incluirGabarito && questao.tagsNomes?.length ? (
                    <div className="tag-row">
                      {questao.tagsNomes.map((tag) => <Badge key={tag}>{tag}</Badge>)}
                    </div>
                  ) : null}

                  {lista.incluirGabarito && hasGabarito ? (
                    <div className="gabarito-box">
                      {questao.respostaCorreta ? <p><strong>Resposta correta:</strong> {questao.respostaCorreta}</p> : null}
                      {questao.explicacao ? <p>{questao.explicacao}</p> : null}
                      {questao.observacaoPedagogica ? <p><strong>Observação pedagógica:</strong> {questao.observacaoPedagogica}</p> : null}
                    </div>
                  ) : null}

                </article>
              );
            })}
          </section>
        ))}
    </section>
  );
}
