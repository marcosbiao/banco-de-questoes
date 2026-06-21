import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProvaBalanceadaForm from '../components/provas/ProvaBalanceadaForm.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import { atualizarProva, obterProva } from '../services/provasService.js';

export default function EditarProvaPage() {
  const { id } = useParams();
  const [prova, setProva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProva() {
      setLoading(true);
      setError('');

      try {
        const data = await obterProva(id);
        if ((data.status || 'rascunho') !== 'rascunho') {
          throw new Error('Somente provas em rascunho podem ser editadas.');
        }
        setProva(data);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    }

    loadProva();
  }, [id]);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Provas</p>
          <h2>Editar prova</h2>
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
        <ProvaBalanceadaForm
          mode="edit"
          initialData={prova}
          onSave={(payload) => atualizarProva(id, payload)}
        />
      ) : null}
    </div>
  );
}
