import { Archive, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';

const tipoLabels = {
  multipla_escolha: 'Múltipla escolha',
  verdadeiro_falso: 'Verdadeiro ou falso',
  discursiva: 'Discursiva',
  codigo_analise: 'Código para analisar',
  problema_programacao: 'Problema de programação',
  imagem: 'Questão com imagem',
  arquivo_anexo: 'Questão com arquivo anexado',
};

const dificuldadeLabels = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
};

export default function QuestaoCard({ questao, onArquivar }) {
  const tags = questao.tagsNomes || questao.tags || [];
  const pathItems = [questao.disciplina, questao.assunto, questao.subassunto].filter(Boolean);

  return (
    <Card className="questao-card">
      <div className="questao-card-header">
        <div>
          <p className="questao-path">
            {pathItems.length ? pathItems.join(' / ') : 'Sem classificação'}
          </p>
          <h3>{questao.enunciado}</h3>
        </div>
        <Badge variant={questao.status === 'ativa' ? 'success' : 'warning'}>
          {questao.status === 'ativa' ? 'Ativa' : 'Arquivada'}
        </Badge>
      </div>

      <div className="meta-grid">
        <span>{tipoLabels[questao.tipo] || questao.tipo}</span>
        {questao.dificuldade ? <span>{dificuldadeLabels[questao.dificuldade] || questao.dificuldade}</span> : null}
      </div>

      <div className="tag-row">
        {tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>

      <div className="card-actions">
        <Link className="button button-ghost button-md" to={`/questoes/${questao.id}/editar`}>
          <Pencil size={18} aria-hidden="true" />
          <span>Editar</span>
        </Link>
        <Button type="button" variant="danger" icon={Archive} disabled={questao.status === 'arquivada'} onClick={() => onArquivar?.(questao.id)}>
          Arquivar
        </Button>
      </div>
    </Card>
  );
}
