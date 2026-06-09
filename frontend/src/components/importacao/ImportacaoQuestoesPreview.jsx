import EmptyState from '../ui/EmptyState.jsx';
import ImportacaoQuestaoCard from './ImportacaoQuestaoCard.jsx';

export default function ImportacaoQuestoesPreview({ questoes, onChangeQuestao, onRemoveQuestao }) {
  if (!questoes.length) {
    return <EmptyState title="Nenhuma questão na prévia" description="Carregue um JSON ou ajuste o filtro visual." />;
  }

  return (
    <section className="import-preview-list">
      {questoes.map((questao, index) => (
        <ImportacaoQuestaoCard
          key={questao.uid}
          questao={questao}
          numero={index + 1}
          onChange={onChangeQuestao}
          onRemove={onRemoveQuestao}
        />
      ))}
    </section>
  );
}
