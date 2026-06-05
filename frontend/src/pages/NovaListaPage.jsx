import { RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ListaForm from '../components/listas/ListaForm.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { createLista, montarLista } from '../services/listasService.js';
import { carregarListaDraft, limparListaDraft } from '../utils/listaDraftStorage.js';

export default function NovaListaPage() {
  const location = useLocation();
  const draftInicial = useMemo(() => carregarListaDraft(), []);
  const restaurarAutomaticamente = Boolean(location.state?.restaurarDraft);
  const [draftRestaurado, setDraftRestaurado] = useState(restaurarAutomaticamente ? draftInicial : null);
  const [mostrarEscolhaDraft, setMostrarEscolhaDraft] = useState(Boolean(draftInicial && !restaurarAutomaticamente));

  function handleRestaurarDraft() {
    setDraftRestaurado(carregarListaDraft());
    setMostrarEscolhaDraft(false);
  }

  function handleDescartarDraft() {
    limparListaDraft();
    setDraftRestaurado(null);
    setMostrarEscolhaDraft(false);
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Listas</p>
          <h2>Nova lista</h2>
        </div>
      </div>

      {mostrarEscolhaDraft ? (
        <Card className="draft-card">
          <div>
            <p className="eyebrow">Rascunho encontrado</p>
            <h3>Continuar lista em edição?</h3>
            <p className="muted-text">Há uma lista temporária nesta aba. Você pode restaurar para continuar exatamente de onde parou ou descartar para começar uma nova.</p>
          </div>
          <div className="card-actions">
            <Button type="button" icon={RotateCcw} onClick={handleRestaurarDraft}>
              Restaurar rascunho
            </Button>
            <Button type="button" variant="danger" icon={Trash2} onClick={handleDescartarDraft}>
              Descartar rascunho
            </Button>
          </div>
        </Card>
      ) : (
        <ListaForm
          mode="create"
          initialDraft={draftRestaurado}
          onMountList={montarLista}
          onSave={createLista}
        />
      )}
    </div>
  );
}
