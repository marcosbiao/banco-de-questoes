import { ArrowLeft, Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ListaPreview from '../components/listas/ListaPreview.jsx';
import Button from '../components/ui/Button.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import { exportarPdfLista, getListaPreview } from '../services/listasService.js';
import { listaTemporariaFromDraft } from '../utils/listaDraftStorage.js';

const PDF_ERROR_MESSAGE = 'Não foi possível gerar o PDF. A lista parece estar vazia ou não foi carregada corretamente.';

function getListaTemporaria(routeState) {
  return routeState?.lista || listaTemporariaFromDraft();
}

export default function ListaPreviewPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isTemporaryPreview = !id;
  const listaTemporaria = useMemo(() => (isTemporaryPreview ? getListaTemporaria(location.state) : null), [isTemporaryPreview, location.state]);
  const [lista, setLista] = useState(listaTemporaria);
  const [loading, setLoading] = useState(Boolean(id));
  const [exportLoading, setExportLoading] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isTemporaryPreview) return;
    setLista(listaTemporaria);
    setLoading(false);
  }, [isTemporaryPreview, listaTemporaria]);

  useEffect(() => {
    if (!id) return;

    async function loadPreview() {
      setLoading(true);
      setError('');

      try {
        const data = await getListaPreview(id);
        setLista(data);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    }

    loadPreview();
  }, [id]);

  async function handleExportarPdf(incluirGabarito) {
    const listaParaExportar = lista?.blocos?.length ? lista : id;

    if (!listaParaExportar) {
      setError(PDF_ERROR_MESSAGE);
      return;
    }

    setExportLoading(incluirGabarito ? 'com' : 'sem');
    setError('');
    setMessage('');

    try {
      await exportarPdfLista(listaParaExportar, incluirGabarito);
      setMessage('Download do PDF iniciado.');
    } catch {
      setError(PDF_ERROR_MESSAGE);
    } finally {
      setExportLoading('');
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PDF</p>
          <h2>Prévia da lista</h2>
        </div>
        <div className="page-actions">
          {isTemporaryPreview ? (
            <Button
              type="button"
              icon={ArrowLeft}
              variant="secondary"
              onClick={() => navigate('/listas/nova', { state: { restaurarDraft: true } })}
            >
              Voltar para edição
            </Button>
          ) : null}
          <Button
            type="button"
            icon={Download}
            variant="secondary"
            disabled={!lista || loading || Boolean(exportLoading)}
            onClick={() => handleExportarPdf(false)}
          >
            {exportLoading === 'sem' ? 'Gerando PDF...' : 'Exportar PDF sem gabarito'}
          </Button>
          <Button
            type="button"
            icon={Download}
            disabled={!lista || loading || Boolean(exportLoading)}
            onClick={() => handleExportarPdf(true)}
          >
            {exportLoading === 'com' ? 'Gerando PDF...' : 'Exportar PDF com gabarito'}
          </Button>
        </div>
      </div>

      {message ? <p className="success-message">{message}</p> : null}
      {loading ? <LoadingState message="Carregando prévia..." /> : null}
      <ErrorMessage message={error} />
      {!loading && error && !isTemporaryPreview ? (
        <div className="card-actions">
          <Button type="button" variant="secondary" onClick={() => navigate('/listas')}>
            Voltar para listas
          </Button>
        </div>
      ) : null}
      {!loading && !error && lista ? <ListaPreview lista={lista} /> : null}
      {!loading && !error && !lista ? (
        <EmptyState
          title={isTemporaryPreview ? 'Nenhuma lista temporária encontrada' : 'Nenhuma lista para exibir'}
          description={isTemporaryPreview ? 'Volte para a edição e monte uma lista antes de abrir a prévia.' : 'Monte ou salve uma lista para abrir a prévia.'}
        />
      ) : null}
    </div>
  );
}
