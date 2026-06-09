import Badge from '../ui/Badge.jsx';

const statusLabels = {
  ativa: 'Ativa',
  em_revisao: 'Em revisão',
  inativa: 'Inativa',
  arquivada: 'Arquivada',
};

export default function ListaFiltersSummary({ bloco, opcoes }) {
  const filtros = bloco.filtros || {};
  const disciplina = opcoes.disciplinas.find((item) => item.value === filtros.disciplinaId)?.label;
  const assuntoNomes = (filtros.assuntoIds || []).map((id) => opcoes.assuntos.find((item) => item.value === id)?.label).filter(Boolean);
  const subassuntoNomes = (filtros.subassuntoIds || []).map((id) => opcoes.subassuntos.find((item) => item.value === id)?.label).filter(Boolean);
  const tagNomes = (filtros.tagIds || []).map((id) => opcoes.tags.find((item) => item.value === id)?.label).filter(Boolean);
  const status = statusLabels[filtros.status] || (opcoes.statuses || []).find((item) => item.value === filtros.status)?.label || filtros.status;
  const labels = [
    disciplina,
    ...assuntoNomes,
    ...subassuntoNomes,
    ...tagNomes,
    filtros.tipo,
    filtros.dificuldade,
    filtros.nivelBloom,
    filtros.competencia,
    status,
    filtros.search,
  ].filter(Boolean);

  if (!labels.length) {
    return <p className="muted-text">Sem filtros definidos.</p>;
  }

  return (
    <div className="tag-row">
      {labels.map((label) => (
        <Badge key={label}>{label}</Badge>
      ))}
    </div>
  );
}
