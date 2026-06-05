import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ListaForm from '../components/listas/ListaForm.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import { getListaById, montarLista, updateLista } from '../services/listasService.js';

export default function EditarListaPage() {
  const { id } = useParams();
  const [lista, setLista] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadLista() {
      setLoading(true);
      setError('');

      try {
        const data = await getListaById(id);
        setLista(data);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    }

    loadLista();
  }, [id]);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Listas</p>
          <h2>Editar lista</h2>
        </div>
      </div>

      {loading ? <LoadingState message="Carregando lista..." /> : null}
      <ErrorMessage message={error} />
      {!loading && !error && lista ? (
        <ListaForm
          mode="edit"
          initialData={lista}
          onMountList={montarLista}
          onSave={(payload) => updateLista(id, payload)}
        />
      ) : null}
    </div>
  );
}
