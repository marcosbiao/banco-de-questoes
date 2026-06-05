import { ArrowDown, ArrowUp, RotateCcw, X } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import EmptyState from '../ui/EmptyState.jsx';

export default function ListaQuestoesSelecionadas({ lista, onRemoveQuestao, onRestoreQuestao, onMoveQuestao }) {
  if (!lista?.blocos?.length) {
    return <EmptyState title="Lista ainda não montada" description="Monte a lista para revisar as questões selecionadas." />;
  }

  let numeroQuestao = 0;

  return (
    <div className="lista-review">
      {lista.duplicadasIgnoradasTotal > 0 ? (
        <p className="status-message">{lista.duplicadasIgnoradasTotal} questões duplicadas foram ignoradas nesta lista.</p>
      ) : null}
      {lista.blocos.map((bloco) => (
        <section key={bloco.id} className="review-bloco">
          <div className="preview-bloco-title">
            <h3>{bloco.tituloBloco}</h3>
            <div className="tag-row">
              <Badge>{bloco.questoes?.length || 0} selecionadas</Badge>
              {bloco.totalDuplicadasIgnoradas ? <Badge variant="warning">{bloco.totalDuplicadasIgnoradas} duplicadas ignoradas</Badge> : null}
            </div>
          </div>
          {bloco.questoes?.length ? bloco.questoes.map((questao, index) => {
            numeroQuestao += 1;

            return (
              <article key={questao.id} className="review-question">
                <strong>{numeroQuestao}.</strong>
                <p className="review-question-text">{questao.enunciado}</p>
                <div className="icon-actions">
                  <button type="button" className="icon-button" disabled={index === 0} onClick={() => onMoveQuestao(bloco.id, questao.id, -1)} title="Subir questão">
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button type="button" className="icon-button" disabled={index === bloco.questoes.length - 1} onClick={() => onMoveQuestao(bloco.id, questao.id, 1)} title="Descer questão">
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <button type="button" className="icon-button danger" onClick={() => onRemoveQuestao(bloco.id, questao.id)} title="Remover questão">
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          }) : <p className="muted-text">Nenhuma questão encontrada para este bloco.</p>}
          {bloco.questoesRemovidas?.length ? (
            <div className="removed-stack">
              {bloco.questoesRemovidas.map((questao) => (
                <div key={questao.id} className="removed-question">
                  <span>{questao.enunciado}</span>
                  <Button type="button" variant="ghost" size="sm" icon={RotateCcw} onClick={() => onRestoreQuestao(bloco.id, questao.id)}>
                    Restaurar
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
