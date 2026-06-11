import { Archive, ListChecks, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { obterRotuloDificuldade } from '../../constants/dificuldades.js';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import QuestaoImagens from './QuestaoImagens.jsx';

const tipoLabels = {
  multipla_escolha: 'Múltipla escolha',
  verdadeiro_falso: 'Verdadeiro ou falso',
  discursiva: 'Discursiva',
  codigo_analise: 'Código para analisar',
  problema_programacao: 'Problema de programação',
  imagem: 'Questão com imagem',
  arquivo_anexo: 'Questão com arquivo anexado',
};

const statusLabels = {
  ativa: 'Ativa',
  em_revisao: 'Em revisão',
  arquivada: 'Arquivada',
};

const statusVariants = {
  ativa: 'success',
  em_revisao: 'warning',
  arquivada: 'neutral',
};

export default function QuestaoCard({ questao, onArquivar, onExcluir, onRubrica }) {
  const tags = questao.tagsNomes || questao.tags || [];
  const pathItems = [questao.disciplina, questao.assunto, questao.subassunto].filter(Boolean);
  const status = questao.status || 'ativa';
  const dificuldadeLabel = obterRotuloDificuldade(questao.dificuldade);
  const temRubrica = questao.temRubrica === true;

  return (
    <Card className="questao-card">
      <div className="questao-card-header">
        <div>
          <p className="questao-path">
            {pathItems.length ? pathItems.join(' / ') : 'Sem classificação'}
          </p>
          <h3>{questao.enunciado}</h3>
        </div>
        <div className="tag-row">
          <Badge variant={statusVariants[status] || 'neutral'}>
            {statusLabels[status] || status}
          </Badge>
          <Badge variant={temRubrica ? 'success' : 'neutral'}>
            {temRubrica ? 'Com rubrica' : 'Sem rubrica'}
          </Badge>
        </div>
      </div>

      <QuestaoImagens imagens={questao.imagens} />

      <div className="meta-grid">
        <span>{tipoLabels[questao.tipo] || questao.tipo}</span>
        {dificuldadeLabel ? <span>{dificuldadeLabel}</span> : null}
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
        <Button type="button" variant="secondary" icon={ListChecks} onClick={() => onRubrica?.(questao)}>
          Rubrica
        </Button>
        <Button type="button" variant="warning" icon={Archive} disabled={questao.status === 'arquivada'} onClick={() => onArquivar?.(questao.id)}>
          Arquivar
        </Button>
        <Button type="button" variant="danger" icon={Trash2} onClick={() => onExcluir?.(questao.id)}>
          Excluir
        </Button>
      </div>
    </Card>
  );
}
