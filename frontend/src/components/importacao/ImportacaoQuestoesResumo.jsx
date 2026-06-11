import Card from '../ui/Card.jsx';

const labels = [
  ['total', 'Questões'],
  ['disciplinas', 'Disciplinas'],
  ['assuntos', 'Assuntos'],
  ['subassuntos', 'Subassuntos'],
  ['tags', 'Tags'],
  ['validas', 'Válidas'],
  ['selecionadas', 'Selecionadas'],
  ['desmarcadas', 'Desmarcadas'],
  ['comAlertas', 'Com alerta'],
  ['comErro', 'Com erro'],
  ['comRubrica', 'Com rubrica'],
  ['semRubrica', 'Sem rubrica'],
  ['possiveisDuplicidades', 'Duplicidades'],
];

export default function ImportacaoQuestoesResumo({ resumo }) {
  if (!resumo) return null;

  return (
    <section className="import-summary-grid" aria-label="Resumo da importação">
      {labels.map(([key, label]) => (
        <Card key={key} className="import-summary-card">
          <span>{label}</span>
          <strong>{resumo[key] || 0}</strong>
        </Card>
      ))}
    </section>
  );
}
