import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { normalizarDificuldade } from '../../constants/dificuldades.js';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import { dificuldadeOptions, tipoOptions } from '../questoes/QuestaoFilters.jsx';

export default function ListaBlocoCard({
  bloco,
  index,
  total,
  opcoes,
  onChange,
  onMove,
  onRemove,
}) {
  const update = (field, value) => {
    const nextValue = field === 'dificuldade' ? normalizarDificuldade(value) : value;

    onChange(bloco.id, {
      ...bloco,
      [field]: nextValue,
      ...(field === 'disciplinaId' ? { assuntoId: '', subassuntoId: '' } : {}),
      ...(field === 'assuntoId' ? { subassuntoId: '' } : {}),
    });
  };

  const assuntoOptions = opcoes.assuntos
    .filter((assunto) => !bloco.disciplinaId || assunto.disciplinaId === bloco.disciplinaId)
    .map((assunto) => ({ value: assunto.id, label: assunto.nome }));

  const subassuntoOptions = opcoes.subassuntos
    .filter((subassunto) => !bloco.assuntoId || subassunto.assuntoId === bloco.assuntoId)
    .map((subassunto) => ({ value: subassunto.id, label: subassunto.nome }));

  return (
    <article className="bloco-card">
      <div className="bloco-header">
        <div className="bloco-title">
          <GripVertical size={18} aria-hidden="true" />
          <strong>Bloco {index + 1}</strong>
        </div>
        <div className="icon-actions">
          <button type="button" className="icon-button" disabled={index === 0} onClick={() => onMove(bloco.id, -1)} title="Subir bloco">
            <ArrowUp size={16} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" disabled={index === total - 1} onClick={() => onMove(bloco.id, 1)} title="Descer bloco">
            <ArrowDown size={16} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button danger" onClick={() => onRemove(bloco.id)} title="Remover bloco">
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="form-grid compact">
        <Select
          label="Disciplina"
          name={`disciplina-${bloco.id}`}
          value={bloco.disciplinaId}
          options={opcoes.disciplinas.map((disciplina) => ({ value: disciplina.id, label: disciplina.nome }))}
          onChange={(event) => update('disciplinaId', event.target.value)}
        />
        <Select
          label="Assunto"
          name={`assunto-${bloco.id}`}
          value={bloco.assuntoId}
          options={assuntoOptions}
          onChange={(event) => update('assuntoId', event.target.value)}
        />
        <Select
          label="Subassunto opcional"
          name={`subassunto-${bloco.id}`}
          value={bloco.subassuntoId}
          options={subassuntoOptions}
          placeholder="Sem subassunto"
          onChange={(event) => update('subassuntoId', event.target.value)}
        />
        <Input
          label="Tags"
          name={`tags-${bloco.id}`}
          placeholder="ENEM, revisão"
          value={bloco.tags}
          onChange={(event) => update('tags', event.target.value)}
        />
        <Select
          label="Tipo"
          name={`tipo-${bloco.id}`}
          value={bloco.tipo}
          options={tipoOptions}
          onChange={(event) => update('tipo', event.target.value)}
        />
        <Select
          label="Dificuldade"
          name={`dificuldade-${bloco.id}`}
          value={bloco.dificuldade}
          options={dificuldadeOptions}
          onChange={(event) => update('dificuldade', event.target.value)}
        />
      </div>
    </article>
  );
}
