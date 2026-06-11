import {
  AlertTriangle,
  Archive,
  CheckCircle,
  FilePlus2,
  LibraryBig,
  ListChecks,
  ListPlus,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import Select from '../components/ui/Select.jsx';
import { listarDisciplinas, listarQuestoes } from '../services/questoesService.js';
import {
  calcularDistribuicaoPorAssunto,
  calcularDistribuicaoPorBloom,
  calcularDistribuicaoPorCompetencia,
  calcularDistribuicaoPorDificuldade,
  calcularDistribuicaoPorTipo,
  calcularMatrizCompetenciaDificuldade,
  calcularResumoQuestoes,
  gerarAlertasPedagogicos,
} from '../utils/dashboardPedagogico.js';

const statusOptions = [
  { value: 'ativa', label: 'Ativas' },
  { value: 'todas', label: 'Todas' },
  { value: 'em_revisao', label: 'Em revisão' },
  { value: 'arquivada', label: 'Arquivadas' },
];

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  })}%`;
}

function filtrarQuestoesDashboard(questoes, filtros) {
  return questoes.filter((questao) => {
    if (filtros.status && filtros.status !== 'todas' && (questao.status || 'ativa') !== filtros.status) {
      return false;
    }

    if (filtros.disciplinaId && questao.disciplinaId !== filtros.disciplinaId) {
      return false;
    }

    return true;
  });
}

function SummaryCard({ icon: Icon, title, value, description }) {
  return (
    <Card className="metric-card dashboard-summary-card">
      <Icon size={22} aria-hidden="true" />
      <span>{title}</span>
      <strong>{value}</strong>
      {description ? <small>{description}</small> : null}
    </Card>
  );
}

function BarRow({ item, showDescription = false }) {
  return (
    <li className="dashboard-bar-row">
      <div className="dashboard-bar-row-top">
        <div>
          <strong>{item.label}</strong>
          {showDescription && item.descricao ? <span>{item.descricao}</span> : null}
        </div>
        <p>
          {item.quantidade}
          <span>{formatPercent(item.percentual)}</span>
        </p>
      </div>
      <div className="dashboard-bar-track" aria-hidden="true">
        <div className="dashboard-bar-fill" style={{ width: `${Math.min(item.percentual, 100)}%` }} />
      </div>
    </li>
  );
}

function DistributionPanel({ title, items, showDescription = false, emptyText = 'Nenhum dado no recorte atual.' }) {
  return (
    <Card className="dashboard-panel">
      <div className="inline-title">
        <div>
          <p className="eyebrow">Distribuição</p>
          <h3>{title}</h3>
        </div>
      </div>
      {items.length ? (
        <ul className="dashboard-bar-list">
          {items.map((item) => (
            <BarRow key={item.value || item.codigo || item.label} item={item} showDescription={showDescription} />
          ))}
        </ul>
      ) : (
        <p className="status-message">{emptyText}</p>
      )}
    </Card>
  );
}

function AssuntosPanel({ assuntos }) {
  const principais = assuntos.slice(0, 10);
  const restantes = assuntos.length - principais.length;

  return (
    <Card className="dashboard-panel">
      <div className="inline-title">
        <div>
          <p className="eyebrow">Distribuição</p>
          <h3>Questões por assunto</h3>
        </div>
      </div>
      {principais.length ? (
        <>
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Assunto</th>
                  <th>Quantidade</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {principais.map((assunto) => (
                  <tr key={assunto.value}>
                    <td>{assunto.label}</td>
                    <td>{assunto.quantidade}</td>
                    <td>{formatPercent(assunto.percentual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {restantes > 0 ? <p className="status-message">Há mais {restantes} assunto(s) no recorte atual.</p> : null}
        </>
      ) : (
        <p className="status-message">Nenhum assunto encontrado no recorte atual.</p>
      )}
    </Card>
  );
}

function MatrizCobertura({ matriz }) {
  return (
    <Card className="dashboard-panel dashboard-matrix-card">
      <div className="inline-title">
        <div>
          <p className="eyebrow">Matriz</p>
          <h3>Matriz de cobertura por competência e dificuldade</h3>
        </div>
      </div>
      <div className="dashboard-table-wrap dashboard-matrix-wrap">
        <table className="dashboard-table dashboard-matrix-table">
          <thead>
            <tr>
              <th>Competência</th>
              {matriz.colunas.map((coluna) => (
                <th key={coluna.value}>{coluna.label}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {matriz.linhas.map((linha) => (
              <tr key={linha.codigo}>
                <th scope="row">
                  <strong>{linha.codigo}</strong>
                  <span>{linha.descricao}</span>
                </th>
                {matriz.colunas.map((coluna) => (
                  <td key={`${linha.codigo}-${coluna.value}`}>{linha.counts[coluna.value] || 0}</td>
                ))}
                <td>{linha.total}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Total</th>
              {matriz.colunas.map((coluna) => (
                <td key={`total-${coluna.value}`}>{matriz.totais[coluna.value] || 0}</td>
              ))}
              <td>{matriz.totais.total || 0}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function AlertasPedagogicos({ alertas }) {
  return (
    <Card className="dashboard-panel">
      <div className="inline-title">
        <div>
          <p className="eyebrow">Diagnóstico</p>
          <h3>Alertas pedagógicos</h3>
        </div>
        <AlertTriangle size={22} aria-hidden="true" />
      </div>
      {alertas.length ? (
        <ul className="dashboard-alert-list">
          {alertas.map((alerta, index) => (
            <li key={`${alerta.tipo}-${index}`}>{alerta.mensagem}</li>
          ))}
        </ul>
      ) : (
        <p className="status-message">Nenhuma lacuna relevante encontrada no recorte atual.</p>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const [questoes, setQuestoes] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [filtros, setFiltros] = useState({ status: 'ativa', disciplinaId: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');

      try {
        const [questoesData, disciplinasData] = await Promise.all([
          listarQuestoes(),
          listarDisciplinas(),
        ]);

        setQuestoes(questoesData);
        setDisciplinas(disciplinasData);
      } catch (apiError) {
        setError(apiError.message || 'Não foi possível carregar os indicadores.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const questoesFiltradas = useMemo(() => filtrarQuestoesDashboard(questoes, filtros), [questoes, filtros]);
  const resumoGeral = useMemo(() => calcularResumoQuestoes(questoes), [questoes]);
  const resumoRecorte = useMemo(() => calcularResumoQuestoes(questoesFiltradas), [questoesFiltradas]);
  const dificuldade = useMemo(() => calcularDistribuicaoPorDificuldade(questoesFiltradas), [questoesFiltradas]);
  const competencia = useMemo(() => calcularDistribuicaoPorCompetencia(questoesFiltradas), [questoesFiltradas]);
  const bloom = useMemo(() => calcularDistribuicaoPorBloom(questoesFiltradas), [questoesFiltradas]);
  const tipo = useMemo(() => calcularDistribuicaoPorTipo(questoesFiltradas), [questoesFiltradas]);
  const assunto = useMemo(() => calcularDistribuicaoPorAssunto(questoesFiltradas), [questoesFiltradas]);
  const matriz = useMemo(() => calcularMatrizCompetenciaDificuldade(questoesFiltradas), [questoesFiltradas]);
  const alertas = useMemo(() => gerarAlertasPedagogicos(questoesFiltradas), [questoesFiltradas]);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Visão pedagógica</p>
          <h2>Dashboard</h2>
          <p className="status-message">Cobertura do banco por status, rubrica, competência, dificuldade, Bloom, assunto e tipo.</p>
        </div>
        <div className="page-actions">
          <Link className="button button-secondary button-md" to="/questoes/nova">
            <FilePlus2 size={18} aria-hidden="true" />
            <span>Nova questão</span>
          </Link>
          <Link className="button button-primary button-md" to="/listas/nova">
            <ListPlus size={18} aria-hidden="true" />
            <span>Criar lista</span>
          </Link>
        </div>
      </div>

      {loading ? <LoadingState message="Carregando indicadores pedagógicos..." /> : null}
      <ErrorMessage message={error} />

      {!loading && !error && !questoes.length ? (
        <EmptyState title="Nenhuma questão cadastrada" description="Cadastre ou importe questões para visualizar a cobertura pedagógica." />
      ) : null}

      {!loading && !error && questoes.length ? (
        <>
          <section className="filters-panel dashboard-filters">
            <Select
              label="Status"
              name="dashboard-status"
              value={filtros.status}
              options={statusOptions}
              onChange={(event) => setFiltros((current) => ({ ...current, status: event.target.value || 'todas' }))}
            />
            <Select
              label="Disciplina"
              name="dashboard-disciplina"
              value={filtros.disciplinaId}
              options={disciplinas.map((disciplina) => ({ value: disciplina.id, label: disciplina.nome }))}
              placeholder="Todas"
              onChange={(event) => setFiltros((current) => ({ ...current, disciplinaId: event.target.value }))}
            />
            <div className="dashboard-filter-summary">
              <span>Recorte atual</span>
              <strong>{resumoRecorte.total}</strong>
              <small>{filtros.status === 'todas' || !filtros.status ? 'Todas as questões' : statusOptions.find((option) => option.value === filtros.status)?.label}</small>
            </div>
          </section>

          <section className="metrics-grid dashboard-summary-grid">
            <SummaryCard icon={LibraryBig} title="Total de questões" value={resumoGeral.total} description="Itens cadastrados no banco." />
            <SummaryCard icon={CheckCircle} title="Ativas" value={resumoGeral.ativas} description="Disponíveis para listas." />
            <SummaryCard icon={Archive} title="Arquivadas" value={resumoGeral.arquivadas} description="Fora do uso corrente." />
            <SummaryCard icon={ListChecks} title="Com rubrica" value={resumoGeral.comRubrica} description="Com critérios associados." />
            <SummaryCard icon={ListChecks} title="Sem rubrica" value={resumoGeral.semRubrica} description="Ainda sem critérios." />
            <SummaryCard icon={CheckCircle} title="Em revisão" value={resumoGeral.emRevisao} description="Aguardando validação." />
          </section>

          <section className="dashboard-panels-grid">
            <DistributionPanel title="Questões por dificuldade" items={dificuldade} />
            <DistributionPanel title="Questões por Bloom" items={bloom} />
            <DistributionPanel title="Questões por tipo" items={tipo} />
            <AssuntosPanel assuntos={assunto} />
          </section>

          <DistributionPanel title="Questões por competência CCI" items={competencia} showDescription />

          <MatrizCobertura matriz={matriz} />

          <AlertasPedagogicos alertas={alertas} />
        </>
      ) : null}
    </div>
  );
}
