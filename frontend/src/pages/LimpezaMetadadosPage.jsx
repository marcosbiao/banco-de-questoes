import { useMemo, useState } from 'react';
import { AlertTriangle, Database, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import {
  METADADOS_ATUALIZADOS_EVENT,
  analisarCatalogoFontes,
  analisarMetadadosOrfaos,
  atualizarCatalogoFontes,
  excluirMetadadosOrfaos,
} from '../services/firebase/limpezaMetadadosService.js';
import { temMetadadosOrfaos } from '../utils/limpezaMetadados.js';

function countLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function totalOrfaos(resultado) {
  if (!resultado) return 0;

  return (
    resultado.tagsSemUso.length
    + resultado.fontesSemUso.length
    + resultado.subassuntosSemUso.length
    + resultado.assuntosSemUso.length
  );
}

function metadataId(id) {
  return id || 'Sem identificador';
}

function ResumoAnalise({ resultado }) {
  const items = useMemo(() => [
    { label: 'Questões analisadas', value: resultado.totais.questoesAnalisadas },
    { label: 'Tags cadastradas', value: resultado.totais.tagsCadastradas },
    { label: 'Tags sem uso', value: resultado.totais.tagsSemUso },
    { label: 'Fontes cadastradas', value: resultado.totais.fontesCadastradas },
    { label: 'Fontes sem uso', value: resultado.totais.fontesSemUso },
    { label: 'Subassuntos cadastrados', value: resultado.totais.subassuntosCadastrados },
    { label: 'Subassuntos sem uso', value: resultado.totais.subassuntosSemUso },
    { label: 'Assuntos cadastrados', value: resultado.totais.assuntosCadastrados },
    { label: 'Assuntos sem uso', value: resultado.totais.assuntosSemUso },
  ], [resultado]);

  return (
    <section className="metrics-grid cleanup-summary-grid" aria-label="Resumo da análise">
      {items.map((item) => (
        <article className="card metric-card cleanup-metric-card" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}

function ResumoCatalogoFontes({ resultado }) {
  const items = useMemo(() => [
    { label: 'Questões analisadas', value: resultado.totais.questoesAnalisadas },
    { label: 'Questões com fonte', value: resultado.totais.questoesComFonte },
    { label: 'Questões sem fonte', value: resultado.totais.questoesSemFonte },
    { label: 'Fontes distintas', value: resultado.totais.fontesDistintasEncontradas },
    { label: 'Fontes já existentes', value: resultado.totais.fontesJaExistentes },
    { label: 'Fontes para criar', value: resultado.totais.fontesParaCriar },
    { label: 'Questões sem fonteId', value: resultado.totais.questoesSemFonteId },
    { label: 'fonteBusca desatualizada', value: resultado.totais.questoesComFonteBuscaDesatualizada },
    { label: 'Questões para atualizar', value: resultado.totais.questoesParaAtualizar },
  ], [resultado]);

  return (
    <section className="metrics-grid cleanup-summary-grid" aria-label="Resumo do catálogo de fontes">
      {items.map((item) => (
        <article className="card metric-card cleanup-metric-card" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}

function TabelaMetadados({ title, countLabelText, emptyText, columns, rows }) {
  return (
    <section className="card cleanup-section">
      <div className="cleanup-section-heading">
        <div>
          <h3>{title}</h3>
          <p className="status-message">{countLabelText}</p>
        </div>
      </div>

      {rows.length ? (
        <div className="dashboard-table-wrap">
          <table className="dashboard-table cleanup-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="status-message">{emptyText}</p>
      )}
    </section>
  );
}

function ReferenciasQuebradas({ referencias }) {
  if (!referencias.length) {
    return null;
  }

  return (
    <section className="card cleanup-section cleanup-broken-section">
      <div className="cleanup-section-heading">
        <div>
          <h3>Referências quebradas</h3>
          <p className="status-message">
            {countLabel(referencias.length, 'referência encontrada', 'referências encontradas')}. Essas ocorrências são apenas informadas nesta versão.
          </p>
        </div>
        <AlertTriangle size={20} aria-hidden="true" />
      </div>

      <ul className="diagnostic-list cleanup-diagnostic-list">
        {referencias.map((referencia) => (
          <li className="diagnostic-item" key={`${referencia.tipo}-${referencia.questaoId}-${referencia.referenciaId}`}>
            <strong>{referencia.mensagem}</strong>
            <span>Questão: {referencia.questaoId || 'sem identificador'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function descricaoConfirmacao(resultado, aviso) {
  const tags = resultado?.tagsSemUso.length || 0;
  const fontes = resultado?.fontesSemUso.length || 0;
  const subassuntos = resultado?.subassuntosSemUso.length || 0;
  const assuntos = resultado?.assuntosSemUso.length || 0;

  return (
    <>
      {aviso ? <div className="message-box message-box-warning">{aviso}</div> : null}
      <p>
        Esta ação excluirá permanentemente {tags} tags, {fontes} fontes, {subassuntos} subassuntos e {assuntos} assuntos sem vínculo com questões.
        A operação não poderá ser desfeita.
      </p>
      <p>Recomenda-se gerar um backup antes de executar a limpeza.</p>
    </>
  );
}

function descricaoConfirmacaoCatalogoFontes(resultado) {
  const fontes = resultado?.totais?.fontesParaCriar || 0;
  const questoes = resultado?.totais?.questoesParaAtualizar || 0;

  return (
    <>
      <p>
        Esta ação criará {fontes} fonte(s) no catálogo e atualizará somente os campos fonteId, fonte e fonteBusca em {questoes} questão(ões).
      </p>
      <p>Enunciado, respostas, rubricas, assuntos, tags, anexos e imagens não serão alterados.</p>
      <p>Recomenda-se gerar um backup antes de executar a atualização.</p>
    </>
  );
}

export default function LimpezaMetadadosPage() {
  const [resultado, setResultado] = useState(null);
  const [analiseConfirmacao, setAnaliseConfirmacao] = useState(null);
  const [catalogoFontes, setCatalogoFontes] = useState(null);
  const [catalogoFontesConfirmacao, setCatalogoFontesConfirmacao] = useState(null);
  const [catalogoFontesReport, setCatalogoFontesReport] = useState(null);
  const [confirmNotice, setConfirmNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analisandoCatalogoFontes, setAnalisandoCatalogoFontes] = useState(false);
  const [atualizandoCatalogoFontes, setAtualizandoCatalogoFontes] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const busy = loading || deleting || analisandoCatalogoFontes || atualizandoCatalogoFontes;
  const possuiOrfaos = temMetadadosOrfaos(resultado);
  const excluirDisabled = busy || !possuiOrfaos;
  const atualizarCatalogoFontesDisabled = busy || !catalogoFontes || (
    !catalogoFontes.totais.fontesParaCriar
    && !catalogoFontes.totais.questoesParaAtualizar
  );

  async function handleAnalyze() {
    if (busy) {
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    setConfirmNotice('');
    setAnaliseConfirmacao(null);

    try {
      const analise = await analisarMetadadosOrfaos();
      setResultado(analise);
    } catch (apiError) {
      console.error('Erro ao analisar metadados órfãos:', apiError);
      setError(apiError.message || 'Não foi possível analisar os metadados.');
    } finally {
      setLoading(false);
    }
  }

  function handleSolicitarExclusao() {
    if (!resultado || !possuiOrfaos || busy) {
      return;
    }

    setError('');
    setMessage('');
    setConfirmNotice('');
    setAnaliseConfirmacao(resultado);
  }

  async function handleConfirmarExclusao() {
    if (!analiseConfirmacao || deleting) {
      return;
    }

    setDeleting(true);
    setError('');
    setMessage('');

    try {
      const response = await excluirMetadadosOrfaos(analiseConfirmacao);

      if (response.requerConfirmacao) {
        setResultado(response.analise);

        if (!temMetadadosOrfaos(response.analise)) {
          setAnaliseConfirmacao(null);
          setConfirmNotice('');
          setMessage('A reanálise não encontrou metadados sem uso. Nenhum documento foi excluído.');
          return;
        }

        setAnaliseConfirmacao(response.analise);
        setConfirmNotice('A análise mudou desde a última confirmação. Confira os novos totais e confirme novamente para excluir.');
        return;
      }

      const { excluidos } = response;
      setAnaliseConfirmacao(null);
      setConfirmNotice('');
      setResultado(null);
      window.dispatchEvent(new Event(METADADOS_ATUALIZADOS_EVENT));
      setMessage(
        `Limpeza concluída: ${countLabel(excluidos.tags, 'tag', 'tags')}, `
        + `${countLabel(excluidos.fontes, 'fonte', 'fontes')}, `
        + `${countLabel(excluidos.subassuntos, 'subassunto', 'subassuntos')} e `
        + `${countLabel(excluidos.assuntos, 'assunto', 'assuntos')} foram excluídos.`,
      );

      try {
        const novaAnalise = await analisarMetadadosOrfaos();
        setResultado(novaAnalise);
      } catch (analysisError) {
        console.error('Erro ao atualizar análise após limpeza:', analysisError);
        setError('A limpeza foi concluída, mas não foi possível atualizar a análise automaticamente. Execute uma nova análise.');
      }
    } catch (apiError) {
      console.error('Erro ao excluir metadados órfãos:', apiError);
      setError(apiError.message || 'Não foi possível excluir os metadados sem uso. Execute uma nova análise antes de tentar novamente.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleAnalisarCatalogoFontes() {
    if (busy) {
      return;
    }

    setAnalisandoCatalogoFontes(true);
    setError('');
    setMessage('');
    setCatalogoFontesReport(null);
    setCatalogoFontesConfirmacao(null);

    try {
      const analise = await analisarCatalogoFontes();
      setCatalogoFontes(analise);
    } catch (apiError) {
      console.error('Erro ao analisar catálogo de fontes:', apiError);
      setError(apiError.message || 'Não foi possível analisar o catálogo de fontes.');
    } finally {
      setAnalisandoCatalogoFontes(false);
    }
  }

  function handleSolicitarAtualizacaoCatalogoFontes() {
    if (atualizarCatalogoFontesDisabled) {
      return;
    }

    setError('');
    setMessage('');
    setCatalogoFontesReport(null);
    setCatalogoFontesConfirmacao(catalogoFontes);
  }

  async function handleConfirmarAtualizacaoCatalogoFontes() {
    if (!catalogoFontesConfirmacao || atualizandoCatalogoFontes) {
      return;
    }

    setAtualizandoCatalogoFontes(true);
    setError('');
    setMessage('');

    try {
      const report = await atualizarCatalogoFontes();
      const novaAnalise = await analisarCatalogoFontes();

      setCatalogoFontesReport(report);
      setCatalogoFontes(novaAnalise);
      setCatalogoFontesConfirmacao(null);
      setMessage(
        `Catálogo de fontes processado: ${countLabel(report.fontesCriadas, 'fonte criada', 'fontes criadas')}, `
        + `${countLabel(report.questoesAtualizadas, 'questão atualizada', 'questões atualizadas')} e `
        + `${countLabel(report.questoesIgnoradas, 'questão ignorada', 'questões ignoradas')}.`,
      );

      if (report.erros.length) {
        setError('A atualização foi executada, mas alguns lotes falharam. Veja os detalhes do relatório.');
      }
    } catch (apiError) {
      console.error('Erro ao atualizar catálogo de fontes:', apiError);
      setError(apiError.message || 'Não foi possível atualizar o catálogo de fontes.');
    } finally {
      setAtualizandoCatalogoFontes(false);
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sistema</p>
          <h2>Limpeza de metadados</h2>
          <p className="muted-text">
            Identifique assuntos, subassuntos, tags e fontes que não estão mais relacionados a nenhuma questão cadastrada.
          </p>
        </div>

        <div className="page-actions">
          <Button type="button" icon={Search} onClick={handleAnalyze} disabled={busy}>
            Analisar banco de dados
          </Button>
          <Button type="button" variant="danger" icon={Trash2} onClick={handleSolicitarExclusao} disabled={excluirDisabled}>
            Excluir metadados sem uso
          </Button>
        </div>
      </div>

      <section className="notice-box cleanup-backup-notice">
        <AlertTriangle size={18} aria-hidden="true" />
        <p>Recomenda-se gerar um backup antes de executar a limpeza.</p>
        <Link className="button button-secondary button-md" to="/backup">
          <Database size={18} aria-hidden="true" />
          <span>Backup e restauração</span>
        </Link>
      </section>

      <section className="card cleanup-section">
        <div className="cleanup-section-heading">
          <div>
            <h3>Atualizar catálogo de fontes</h3>
            <p className="status-message">Identifica as fontes existentes nas questões, cria o catálogo de fontes e vincula cada questão à fonte correspondente.</p>
          </div>
        </div>
        <div className="card-actions">
          <Button type="button" variant="secondary" icon={Search} onClick={handleAnalisarCatalogoFontes} disabled={busy}>
            Analisar fontes
          </Button>
          <Button type="button" icon={RefreshCw} onClick={handleSolicitarAtualizacaoCatalogoFontes} disabled={atualizarCatalogoFontesDisabled}>
            Atualizar catálogo de fontes
          </Button>
        </div>
      </section>

      {loading ? <LoadingState message="Analisando banco de dados..." /> : null}
      {deleting ? <LoadingState message="Excluindo metadados..." /> : null}
      {analisandoCatalogoFontes ? <LoadingState message="Analisando catálogo de fontes..." /> : null}
      {atualizandoCatalogoFontes ? <LoadingState message="Atualizando catálogo de fontes..." /> : null}
      <ErrorMessage message={error} />
      {message ? <div className="message-box message-box-success">{message}</div> : null}

      {catalogoFontes ? (
        <>
          <ResumoCatalogoFontes resultado={catalogoFontes} />

          {!catalogoFontes.totais.fontesParaCriar && !catalogoFontes.totais.questoesParaAtualizar ? (
            <EmptyState title="Catálogo de fontes atualizado." description="Todas as questões analisadas já estão vinculadas ao catálogo de fontes." />
          ) : null}
        </>
      ) : null}

      {catalogoFontesReport ? (
        <section className="card cleanup-section">
          <div className="cleanup-section-heading">
            <div>
              <h3>Resultado da atualização das fontes</h3>
              <p className="status-message">
                {countLabel(catalogoFontesReport.fontesCriadas, 'fonte criada', 'fontes criadas')};
                {' '}
                {countLabel(catalogoFontesReport.questoesAtualizadas, 'questão atualizada', 'questões atualizadas')};
                {' '}
                {countLabel(catalogoFontesReport.questoesIgnoradas, 'questão ignorada', 'questões ignoradas')}.
              </p>
            </div>
          </div>

          {catalogoFontesReport.erros.length ? (
            <ul className="diagnostic-list cleanup-diagnostic-list">
              {catalogoFontesReport.erros.map((item) => (
                <li className="diagnostic-item" key={`fonte-lote-${item.lote}`}>
                  <strong>Lote {item.lote}: {item.mensagem}</strong>
                  <span>{countLabel(item.operacoes, 'operação afetada', 'operações afetadas')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="status-message">Nenhum erro encontrado.</p>
          )}
        </section>
      ) : null}

      {resultado ? (
        <>
          <ResumoAnalise resultado={resultado} />

          {!temMetadadosOrfaos(resultado) ? (
            <EmptyState title="Não foram encontrados metadados sem uso." description="Os filtros cadastrados estão vinculados às questões existentes ou preservados por subassuntos válidos." />
          ) : null}

          <TabelaMetadados
            title="Tags sem uso"
            countLabelText={countLabel(resultado.tagsSemUso.length, 'tag encontrada', 'tags encontradas')}
            emptyText="Nenhuma tag sem uso encontrada."
            rows={resultado.tagsSemUso}
            columns={[
              { key: 'nome', label: 'Nome', render: (tag) => tag.nome },
              { key: 'id', label: 'Identificador', render: (tag) => metadataId(tag.id) },
            ]}
          />

          <TabelaMetadados
            title="Fontes sem uso"
            countLabelText={countLabel(resultado.fontesSemUso.length, 'fonte encontrada', 'fontes encontradas')}
            emptyText="Nenhuma fonte sem uso encontrada."
            rows={resultado.fontesSemUso}
            columns={[
              { key: 'nome', label: 'Nome', render: (fonte) => fonte.nome },
              { key: 'id', label: 'Identificador', render: (fonte) => metadataId(fonte.id) },
            ]}
          />

          <TabelaMetadados
            title="Subassuntos sem uso"
            countLabelText={countLabel(resultado.subassuntosSemUso.length, 'subassunto encontrado', 'subassuntos encontrados')}
            emptyText="Nenhum subassunto sem uso encontrado."
            rows={resultado.subassuntosSemUso}
            columns={[
              { key: 'nome', label: 'Nome', render: (subassunto) => subassunto.nome },
              { key: 'assunto', label: 'Assunto', render: (subassunto) => subassunto.assuntoNome },
              { key: 'id', label: 'Identificador', render: (subassunto) => metadataId(subassunto.id) },
            ]}
          />

          <TabelaMetadados
            title="Assuntos sem uso"
            countLabelText={countLabel(resultado.assuntosSemUso.length, 'assunto encontrado', 'assuntos encontrados')}
            emptyText="Nenhum assunto sem uso encontrado."
            rows={resultado.assuntosSemUso}
            columns={[
              { key: 'nome', label: 'Nome', render: (assunto) => assunto.nome },
              { key: 'disciplina', label: 'Disciplina', render: (assunto) => assunto.disciplinaNome },
              { key: 'id', label: 'Identificador', render: (assunto) => metadataId(assunto.id) },
            ]}
          />

          <ReferenciasQuebradas referencias={resultado.referenciasQuebradas} />

          {totalOrfaos(resultado) ? (
            <div className="actions-row cleanup-bottom-actions">
              <Button type="button" variant="secondary" icon={RefreshCw} onClick={handleAnalyze} disabled={busy}>
                Reanalisar
              </Button>
              <Button type="button" variant="danger" icon={Trash2} onClick={handleSolicitarExclusao} disabled={excluirDisabled}>
                Excluir metadados sem uso
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={Boolean(analiseConfirmacao)}
        title="Excluir metadados sem uso?"
        description={descricaoConfirmacao(analiseConfirmacao, confirmNotice)}
        confirmLabel="Excluir permanentemente"
        danger
        loading={deleting}
        onCancel={() => {
          setAnaliseConfirmacao(null);
          setConfirmNotice('');
        }}
        onConfirm={handleConfirmarExclusao}
      />

      <ConfirmDialog
        open={Boolean(catalogoFontesConfirmacao)}
        title="Atualizar catálogo de fontes?"
        description={descricaoConfirmacaoCatalogoFontes(catalogoFontesConfirmacao)}
        confirmLabel="Atualizar catálogo"
        loading={atualizandoCatalogoFontes}
        onCancel={() => setCatalogoFontesConfirmacao(null)}
        onConfirm={handleConfirmarAtualizacaoCatalogoFontes}
      />
    </div>
  );
}
