import { FilePlus2, LibraryBig, ListChecks, ListPlus, Tags } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { listarDisciplinas, listarQuestoes, listarTags } from '../services/questoesService.js';

export default function Dashboard() {
  const [state, setState] = useState({
    loading: true,
    error: '',
    totalQuestoes: 0,
    totalDisciplinas: 0,
    totalTags: 0,
    totalAtivas: 0,
    totalArquivadas: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const [questoes, disciplinas, tags] = await Promise.all([
          listarQuestoes(),
          listarDisciplinas(),
          listarTags(),
        ]);

        setState({
          loading: false,
          error: '',
          totalQuestoes: questoes.length,
          totalDisciplinas: disciplinas.length,
          totalTags: tags.length,
          totalAtivas: questoes.filter((questao) => questao.status === 'ativa').length,
          totalArquivadas: questoes.filter((questao) => questao.status === 'arquivada').length,
        });
      } catch (error) {
        setState((current) => ({
          ...current,
          loading: false,
          error: error.message,
        }));
      }
    }

    load();
  }, []);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h2>Dashboard</h2>
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

      {state.loading ? <p className="status-message">Carregando indicadores...</p> : null}
      {state.error ? <EmptyState title="Não foi possível carregar os dados" description={state.error} /> : null}

      {!state.loading && !state.error ? (
        <section className="metrics-grid">
          <Card className="metric-card">
            <LibraryBig size={22} aria-hidden="true" />
            <span>Total de questões</span>
            <strong>{state.totalQuestoes}</strong>
          </Card>
          <Card className="metric-card">
            <ListChecks size={22} aria-hidden="true" />
            <span>Total de disciplinas</span>
            <strong>{state.totalDisciplinas}</strong>
          </Card>
          <Card className="metric-card">
            <Tags size={22} aria-hidden="true" />
            <span>Total de tags</span>
            <strong>{state.totalTags}</strong>
          </Card>
          <Card className="metric-card">
            <LibraryBig size={22} aria-hidden="true" />
            <span>Questões ativas</span>
            <strong>{state.totalAtivas}</strong>
          </Card>
          <Card className="metric-card">
            <LibraryBig size={22} aria-hidden="true" />
            <span>Questões arquivadas</span>
            <strong>{state.totalArquivadas}</strong>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
