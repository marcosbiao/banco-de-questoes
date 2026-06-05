import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ListaCard from '../components/listas/ListaCard.jsx';
import Button from '../components/ui/Button.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import Select from '../components/ui/Select.jsx';
import { arquivarLista, getListas } from '../services/listasService.js';

const filtrosIniciais = {
  search: '',
  status: '',
};

export default function ListasPage() {
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [listas, setListas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [arquivarId, setArquivarId] = useState('');
  const [arquivando, setArquivando] = useState(false);

  async function loadListas(params = filtros) {
    setLoading(true);
    setError('');

    try {
      const data = await getListas(params);
      setListas(data);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListas();
  }, []);

  async function handleArquivar(id) {
    setArquivando(true);
    setError('');

    try {
      const listaArquivada = await arquivarLista(id);
      setListas((current) => {
        if (filtros.status === 'ativa') {
          return current.filter((lista) => lista.id !== id);
        }

        return current.map((lista) => (lista.id === id ? { ...lista, ...listaArquivada } : lista));
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
          <p className="eyebrow">Listas</p>
          <h2>Listas criadas</h2>
        </div>
        <Link className="button button-primary button-md" to="/listas/nova">
          <Plus size={18} aria-hidden="true" />
          <span>Criar lista</span>
        </Link>
      </div>

      <section className="filters-panel">
        <Input label="Busca" name="search-listas" value={filtros.search} onChange={(event) => setFiltros((current) => ({ ...current, search: event.target.value }))} />
        <Select
          label="Status"
          name="status-listas"
          value={filtros.status}
          options={[
            { value: 'ativa', label: 'Ativa' },
            { value: 'arquivada', label: 'Arquivada' },
          ]}
          onChange={(event) => setFiltros((current) => ({ ...current, status: event.target.value }))}
        />
        <Button type="button" onClick={() => loadListas(filtros)}>Aplicar</Button>
        <Button type="button" variant="secondary" onClick={() => { setFiltros(filtrosIniciais); loadListas(filtrosIniciais); }}>Limpar</Button>
      </section>

      {!loading && !error ? <p className="status-message">{listas.length} listas encontradas.</p> : null}
      {loading ? <LoadingState message="Carregando listas..." /> : null}
      <ErrorMessage message={error} />
      {!loading && !error && listas.length === 0 ? <EmptyState title="Nenhuma lista encontrada" description="Crie uma lista para começar a montar exercícios." /> : null}

      <section className="questoes-list">
        {listas.map((lista) => (
          <ListaCard key={lista.id} lista={lista} onArquivar={setArquivarId} />
        ))}
      </section>

      <ConfirmDialog
        open={Boolean(arquivarId)}
        title="Arquivar lista?"
        description="A lista sairá da visualização de ativas, mas poderá ser consultada pelo filtro de arquivadas."
        confirmLabel="Arquivar"
        danger
        loading={arquivando}
        onCancel={() => setArquivarId('')}
        onConfirm={() => handleArquivar(arquivarId)}
      />
    </div>
  );
}
