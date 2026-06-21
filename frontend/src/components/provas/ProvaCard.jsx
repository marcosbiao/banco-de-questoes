import { Archive, Eye, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('pt-BR') : 'Sem data';
}

function statusVariant(status = 'rascunho') {
  if (status === 'arquivada') return 'warning';
  if (status === 'rascunho') return 'neutral';
  return 'success';
}

function statusLabel(status = 'rascunho') {
  const labels = {
    rascunho: 'Rascunho',
    arquivada: 'Arquivada',
    publicada: 'Publicada',
  };

  return labels[status] || status;
}

export default function ProvaCard({ prova, onArquivar, onExcluir }) {
  const status = prova.status || 'rascunho';

  return (
    <Card className="questao-card">
      <div className="questao-card-header">
        <div>
          <p className="questao-path">{formatDate(prova.createdAt)} · {prova.disciplinaNome || 'Sem disciplina'}</p>
          <h3>{prova.titulo}</h3>
        </div>
        <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
      </div>

      <div className="meta-grid">
        <span>{prova.totalQuestoes || prova.totalItens || 0} questões</span>
        <span>{prova.tipoGeracao === 'balanceada' ? 'Geração balanceada' : prova.tipoGeracao || 'Manual'}</span>
      </div>

      <div className="card-actions">
        <Link className="button button-ghost button-md" to={`/provas/${prova.id}`}>
          <Eye size={18} aria-hidden="true" />
          <span>Abrir</span>
        </Link>
        {status === 'rascunho' ? (
          <Link className="button button-ghost button-md" to={`/provas/${prova.id}/editar`}>
            <Pencil size={18} aria-hidden="true" />
            <span>Editar</span>
          </Link>
        ) : null}
        <Button type="button" variant="warning" icon={Archive} disabled={status === 'arquivada'} onClick={() => onArquivar(prova.id)}>
          Arquivar
        </Button>
        <Button type="button" variant="danger" icon={Trash2} onClick={() => onExcluir(prova.id)}>
          Excluir
        </Button>
      </div>
    </Card>
  );
}
