import { useEffect, useState } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import QuestaoCard from '../components/questoes/QuestaoCard.jsx';
import QuestaoFilters from '../components/questoes/QuestaoFilters.jsx';
import {
  arquivarQuestao,
  listarAssuntos,
  listarDisciplinas,
  listarQuestoes,
  listarSubassuntos,
  listarTags,
} from '../services/questoesService.js';

const filtrosIniciais = {
  search: '',
  disciplinaId: '',
  assuntoId: '',
  subassuntoId: '',
  tipo: '',
  dificuldade: '',
  status: '',
  tagIds: [],
};

export default function QuestoesPage() {
  const [filtrosDraft, setFiltrosDraft] = useState(filtrosIniciais);
  const [filtrosAplicados, setFiltrosAplicados] = useState(filtrosIniciais);
  const [opcoes, setOpcoes] = useState({ disciplinas: [], assuntos: [], subassuntos: [], tags: [] });
  const [questoes, setQuestoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [arquivarId, setArquivarId] = useState('');
  const [arquivando, setArquivando] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      const [disciplinas, assuntos, subassuntos, tags] = await Promise.all([
        listarDisciplinas(),
        listarAssuntos(),
        listarSubassuntos(),
        listarTags(),
      ]);

      setOpcoes({ disciplinas, assuntos, subassuntos, tags });
    }

    loadOptions().catch((apiError) => setError(apiError.message));
  }, []);

  useEffect(() => {
    async function loadQuestoes(params) {
      setLoading(true);
      setError('');

      try {
        const data = await listarQuestoes(params);
        setQuestoes(data);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    }

    loadQuestoes(filtrosAplicados);
  }, [filtrosAplicados]);

  async function handleArquivar(id) {
    setError('');
    setArquivando(true);

    try {
      const questaoArquivada = await arquivarQuestao(id);
      setQuestoes((current) => {
        if (filtrosAplicados.status === 'ativa') {
          return current.filter((questao) => questao.id !== id);
        }

        return current.map((questao) => (questao.id === id ? { ...questao, ...questaoArquivada } : questao));
      });
      setArquivarId('');
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setArquivando(false);
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Acervo</p>
          <h2>Banco de questões</h2>
        </div>
      </div>

      <QuestaoFilters
        filtros={filtrosDraft}
        opcoes={opcoes}
        onChange={setFiltrosDraft}
        onApply={() => setFiltrosAplicados(filtrosDraft)}
        onClear={() => {
          setFiltrosDraft(filtrosIniciais);
          setFiltrosAplicados(filtrosIniciais);
        }}
      />

      {!loading && !error ? <p className="status-message">{questoes.length} questões encontradas.</p> : null}
      {loading ? <LoadingState message="Carregando questões..." /> : null}
      <ErrorMessage message={error} />

      {!loading && !error && questoes.length === 0 ? (
        <EmptyState title="Nenhuma questão encontrada" description="Ajuste os filtros para ampliar a busca." />
      ) : null}

      <section className="questoes-list">
        {questoes.map((questao) => (
          <QuestaoCard key={questao.id} questao={questao} onArquivar={setArquivarId} />
        ))}
      </section>

      <ConfirmDialog
        open={Boolean(arquivarId)}
        title="Arquivar questão?"
        description="A questão deixará de aparecer nas listas ativas, mas continuará disponível no filtro de arquivadas."
        confirmLabel="Arquivar"
        danger
        loading={arquivando}
        onCancel={() => setArquivarId('')}
        onConfirm={() => handleArquivar(arquivarId)}
      />
    </div>
  );
}
