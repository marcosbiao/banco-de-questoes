import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProvaCard from '../components/provas/ProvaCard.jsx';
import Button from '../components/ui/Button.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import Select from '../components/ui/Select.jsx';
import { arquivarProva, excluirProva, listarProvas } from '../services/provasService.js';

const filtrosIniciais = {
  search: '',
  status: '',
};

export default function ProvasPage() {
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [provas, setProvas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [arquivarId, setArquivarId] = useState('');
  const [arquivando, setArquivando] = useState(false);
  const [excluirId, setExcluirId] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  async function loadProvas(params = filtros) {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const data = await listarProvas(params);
      setProvas(data);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProvas();
  }, []);

  async function handleArquivar(id) {
    setArquivando(true);
    setError('');
    setMessage('');

    try {
      const provaArquivada = await arquivarProva(id);
      setProvas((current) => {
        if (filtros.status === 'rascunho') {
          return current.filter((prova) => prova.id !== id);
        }

        return current.map((prova) => (prova.id === id ? { ...prova, ...provaArquivada } : prova));
      });
      setArquivarId('');
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setArquivando(false);
    }
  }

  async function handleExcluir(id) {
    setExcluindo(true);
    setError('');
    setMessage('');

    try {
      await excluirProva(id);
      setProvas((current) => current.filter((prova) => prova.id !== id));
      setExcluirId('');
      setMessage('Prova excluída com sucesso.');
    } catch (apiError) {
      setError(apiError.message || 'Não foi possível excluir a prova.');
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Provas</p>
          <h2>Minhas provas</h2>
        </div>
        <Link className="button button-primary button-md" to="/provas/nova">
          <Plus size={18} aria-hidden="true" />
          <span>Gerar prova balanceada</span>
        </Link>
      </div>

      <section className="filters-panel">
        <Input label="Busca" name="search-provas" value={filtros.search} onChange={(event) => setFiltros((current) => ({ ...current, search: event.target.value }))} />
        <Select
          label="Status"
          name="status-provas"
          value={filtros.status}
          options={[
            { value: 'rascunho', label: 'Rascunho' },
            { value: 'arquivada', label: 'Arquivada' },
          ]}
          onChange={(event) => setFiltros((current) => ({ ...current, status: event.target.value }))}
        />
        <Button type="button" onClick={() => loadProvas(filtros)}>Aplicar</Button>
        <Button type="button" variant="secondary" onClick={() => { setFiltros(filtrosIniciais); loadProvas(filtrosIniciais); }}>Limpar</Button>
      </section>

      {!loading && !error ? <p className="status-message">{provas.length} provas encontradas.</p> : null}
      {loading ? <LoadingState message="Carregando provas..." /> : null}
      <ErrorMessage message={error} />
      {message ? <div className="message-box message-box-success">{message}</div> : null}
      {!loading && !error && provas.length === 0 ? <EmptyState title="Nenhuma prova encontrada" description="Gere uma prova balanceada para começar." /> : null}

      <section className="questoes-list">
        {provas.map((prova) => (
          <ProvaCard key={prova.id} prova={prova} onArquivar={setArquivarId} onExcluir={setExcluirId} />
        ))}
      </section>

      <ConfirmDialog
        open={Boolean(arquivarId)}
        title="Arquivar prova?"
        description="A prova ficará disponível pelo filtro de arquivadas."
        confirmLabel="Arquivar"
        confirmVariant="warning"
        loading={arquivando}
        onCancel={() => setArquivarId('')}
        onConfirm={() => handleArquivar(arquivarId)}
      />

      <ConfirmDialog
        open={Boolean(excluirId)}
        title="Excluir prova?"
        description="Tem certeza que deseja excluir esta prova? As questões e rubricas originais não serão excluídas."
        confirmLabel="Excluir"
        danger
        loading={excluindo}
        onCancel={() => setExcluirId('')}
        onConfirm={() => handleExcluir(excluirId)}
      />
    </div>
  );
}
