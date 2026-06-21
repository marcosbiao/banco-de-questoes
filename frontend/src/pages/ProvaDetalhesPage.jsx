import { ArrowLeft, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import QuestaoImagens from '../components/questoes/QuestaoImagens.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import { obterRotuloDificuldade } from '../constants/dificuldades.js';
import { obterProva } from '../services/provasService.js';

const tipoLabels = {
  multipla_escolha: 'Múltipla escolha',
  verdadeiro_falso: 'Verdadeiro ou falso',
  discursiva: 'Discursiva',
  codigo_analise: 'Código para analisar',
  problema_programacao: 'Problema de programação',
  imagem: 'Questão com imagem',
  arquivo_anexo: 'Questão com arquivo anexado',
};

function statusLabel(status = 'rascunho') {
  const labels = {
    rascunho: 'Rascunho',
    arquivada: 'Arquivada',
    publicada: 'Publicada',
  };

  return labels[status] || status;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : 'Sem data';
}

function resumoEntries(obj = {}) {
  return Object.entries(obj).filter(([, value]) => Number(value) > 0);
}

function ResumoBox({ title, children }) {
  return (
    <div className="prova-summary-box">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export default function ProvaDetalhesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prova, setProva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProva() {
      setLoading(true);
      setError('');

      try {
        const data = await obterProva(id);
        setProva(data);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    }

    loadProva();
  }, [id]);

  const itens = useMemo(() => (prova?.itens || []).slice().sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)), [prova]);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Provas</p>
          <h2>{prova?.titulo || 'Detalhes da prova'}</h2>
        </div>
        <div className="page-actions">
          <Button type="button" variant="secondary" icon={ArrowLeft} onClick={() => navigate('/provas')}>
            Voltar
          </Button>
          {prova && (prova.status || 'rascunho') === 'rascunho' ? (
            <Link className="button button-primary button-md" to={`/provas/${prova.id}/editar`}>
              <Pencil size={18} aria-hidden="true" />
              <span>Editar</span>
            </Link>
          ) : null}
        </div>
      </div>

      {loading ? <LoadingState message="Carregando prova..." /> : null}
      <ErrorMessage message={error} />
      {!loading && error ? (
        <div className="card-actions">
          <Link className="button button-secondary button-md" to="/provas">
            Voltar para provas
          </Link>
        </div>
      ) : null}

      {!loading && !error && prova ? (
        <>
          <section className="form-panel prova-details-header">
            <div>
              <p className="questao-path">{prova.disciplinaNome || 'Sem disciplina'} · {formatDate(prova.createdAt)}</p>
              {prova.descricao ? <p className="muted-text">{prova.descricao}</p> : null}
            </div>
            <div className="tag-row">
              <Badge>{statusLabel(prova.status)}</Badge>
              <Badge>{prova.tipoGeracao === 'balanceada' ? 'Geração balanceada' : prova.tipoGeracao}</Badge>
              <Badge>{prova.configuracao?.seed || 'Sem seed'}</Badge>
            </div>
          </section>

          <section className="prova-summary-grid">
            <ResumoBox title="Total">
              <span>{itens.length}</span>
            </ResumoBox>
            <ResumoBox title="Com rubrica">
              <span>{prova.resumo?.comRubrica || 0}</span>
            </ResumoBox>
            <ResumoBox title="Sem rubrica">
              <span>{prova.resumo?.semRubrica || 0}</span>
            </ResumoBox>
          </section>

          <section className="preview-panel">
            <div className="section-title">
              <p className="eyebrow">Resumo</p>
              <h3>Distribuições salvas</h3>
            </div>
            <div className="prova-summary-grid">
              <ResumoBox title="Competências">
                <div className="tag-row">
                  {resumoEntries(prova.resumo?.porCompetencia).map(([key, value]) => <Badge key={key}>{key}: {value}</Badge>)}
                </div>
              </ResumoBox>
              <ResumoBox title="Dificuldade">
                <div className="tag-row">
                  {resumoEntries(prova.resumo?.porDificuldade).map(([key, value]) => <Badge key={key}>{obterRotuloDificuldade(Number(key)) || key}: {value}</Badge>)}
                </div>
              </ResumoBox>
              <ResumoBox title="Tipos">
                <div className="tag-row">
                  {resumoEntries(prova.resumo?.porTipo).map(([key, value]) => <Badge key={key}>{tipoLabels[key] || key}: {value}</Badge>)}
                </div>
              </ResumoBox>
            </div>
          </section>

          <section className="lista-preview">
            <div className="lista-paper-header">
              <h2>{prova.titulo}</h2>
              {prova.descricao ? <p>{prova.descricao}</p> : null}
            </div>

            {itens.map((item, index) => {
              const questao = item.questaoSnapshot || {};
              const gabarito = item.gabaritoSnapshot || {};
              const rubrica = item.rubricaSnapshot;

              return (
                <article key={`${item.questaoId}-${index}`} className="preview-question">
                  <div className="preview-question-top">
                    <strong>{index + 1}.</strong>
                    {questao.textoAntesCodigo || questao.codigo ? (
                      <div className="question-code-composed">
                        {questao.textoAntesCodigo ? <p>{questao.textoAntesCodigo}</p> : <p>{questao.enunciado}</p>}
                        {questao.codigo ? <pre className="question-code">{questao.codigo}</pre> : null}
                      </div>
                    ) : (
                      <p>{questao.enunciado}</p>
                    )}
                  </div>

                  <QuestaoImagens imagens={questao.imagens} />

                  {questao.alternativas?.length ? (
                    <div className="preview-alternativas">
                      {questao.alternativas.map((alternativa, alternativaIndex) => (
                        <p key={alternativa.id || alternativaIndex}>
                          <strong>{String.fromCharCode(65 + alternativaIndex)}.</strong>
                          <span className="alternative-text">{alternativa.texto}</span>
                          {alternativa.correta ? <Badge variant="success">Correta</Badge> : null}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  <div className="meta-grid">
                    <span>{tipoLabels[questao.tipo] || questao.tipo || 'Sem tipo'}</span>
                    <span>{questao.assuntoNome || 'Sem assunto'}</span>
                    <span>{questao.subassuntoNome || 'Sem subassunto'}</span>
                    <span>{questao.competencia || 'Sem competência'}</span>
                    <span>{obterRotuloDificuldade(questao.dificuldade)}</span>
                    <span>Bloom: {questao.nivelBloom || 'Não informado'}</span>
                    <span>{rubrica ? 'Rubrica salva' : 'Sem rubrica salva'}</span>
                  </div>

                  {gabarito.respostaCorreta || gabarito.explicacao || gabarito.observacaoPedagogica ? (
                    <div className="gabarito-box">
                      {gabarito.respostaCorreta ? <p><strong>Resposta correta:</strong> {gabarito.respostaCorreta}</p> : null}
                      {gabarito.explicacao ? <p>{gabarito.explicacao}</p> : null}
                      {gabarito.observacaoPedagogica ? <p><strong>Observação pedagógica:</strong> {gabarito.observacaoPedagogica}</p> : null}
                    </div>
                  ) : null}

                  {rubrica ? (
                    <div className="rubrica-preview">
                      <h4>Rubrica snapshot</h4>
                      {rubrica.criterios?.length ? (
                        <ul className="simple-list">
                          {rubrica.criterios.map((criterio) => (
                            <li key={criterio.id || criterio.nome}>
                              <strong>{criterio.nome}</strong>: {criterio.descricao} ({criterio.pontuacao} pts)
                            </li>
                          ))}
                        </ul>
                      ) : <p className="muted-text">Rubrica salva sem critérios detalhados.</p>}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        </>
      ) : null}

      {!loading && !error && prova && !itens.length ? (
        <EmptyState title="Prova sem questões" description="Edite o rascunho e gere uma seleção antes de usar esta prova." />
      ) : null}
    </div>
  );
}
