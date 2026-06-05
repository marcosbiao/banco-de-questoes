import { Archive, Eye, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';

export default function ListaCard({ lista, onArquivar }) {
  return (
    <Card className="questao-card">
      <div className="questao-card-header">
        <div>
          <p className="questao-path">{lista.createdAt ? new Date(lista.createdAt).toLocaleDateString('pt-BR') : 'Sem data'}</p>
          <h3>{lista.titulo}</h3>
        </div>
        <Badge variant={lista.status === 'arquivada' ? 'warning' : 'success'}>{lista.status === 'arquivada' ? 'Arquivada' : 'Ativa'}</Badge>
      </div>
      <div className="meta-grid">
        <span>{lista.totalBlocos || lista.blocos?.length || 0} blocos</span>
        <span>{lista.totalQuestoes || 0} questões</span>
      </div>
      <div className="card-actions">
        <Link className="button button-ghost button-md" to={`/listas/${lista.id}/editar`}>
          <Pencil size={18} aria-hidden="true" />
          <span>Editar</span>
        </Link>
        <Link className="button button-ghost button-md" to={`/listas/${lista.id}/preview`}>
          <Eye size={18} aria-hidden="true" />
          <span>Prévia</span>
        </Link>
        <Button type="button" variant="danger" icon={Archive} disabled={lista.status === 'arquivada'} onClick={() => onArquivar(lista.id)}>
          Arquivar
        </Button>
      </div>
    </Card>
  );
}
