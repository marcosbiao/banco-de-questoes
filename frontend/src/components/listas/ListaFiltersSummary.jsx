import Badge from '../ui/Badge.jsx';

export default function ListaFiltersSummary({ bloco, opcoes }) {
  const filtros = bloco.filtros || {};
  const disciplina = opcoes.disciplinas.find((item) => item.id === filtros.disciplinaId)?.nome;
  const assuntoNomes = (filtros.assuntoIds || []).map((id) => opcoes.assuntos.find((item) => item.id === id)?.nome).filter(Boolean);
  const subassuntoNomes = (filtros.subassuntoIds || []).map((id) => opcoes.subassuntos.find((item) => item.id === id)?.nome).filter(Boolean);
  const tagNomes = (filtros.tagIds || []).map((id) => opcoes.tags.find((item) => item.id === id)?.nome).filter(Boolean);
  const labels = [
    disciplina,
    ...assuntoNomes,
    ...subassuntoNomes,
    ...tagNomes,
    filtros.tipo,
    filtros.dificuldade,
    filtros.nivelBloom,
    filtros.competencia,
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
