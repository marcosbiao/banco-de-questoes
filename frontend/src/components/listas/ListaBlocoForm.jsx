import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { dificuldadeOptions, tipoOptions } from '../questoes/QuestaoFilters.jsx';
import Badge from '../ui/Badge.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import ListaFiltersSummary from './ListaFiltersSummary.jsx';

const bloomOptions = [
  { value: 'lembrar', label: 'Lembrar' },
  { value: 'compreender', label: 'Compreender' },
  { value: 'aplicar', label: 'Aplicar' },
  { value: 'analisar', label: 'Analisar' },
  { value: 'avaliar', label: 'Avaliar' },
  { value: 'criar', label: 'Criar' },
];

function multiValues(event) {
  return Array.from(event.target.selectedOptions).map((option) => option.value);
}

export default function ListaBlocoForm({ bloco, index, total, opcoes, onChange, onMove, onRemove }) {
  const filtros = bloco.filtros;
  const update = (field, value) => onChange(bloco.id, { ...bloco, [field]: value });
  const updateFiltro = (field, value) => {
    onChange(bloco.id, {
      ...bloco,
      filtros: {
        ...filtros,
        [field]: value,
        ...(field === 'disciplinaId' ? { assuntoIds: [], subassuntoIds: [] } : {}),
        ...(field === 'assuntoIds' ? { subassuntoIds: [] } : {}),
      },
    });
  };

  const assuntos = opcoes.assuntos.filter((assunto) => !filtros.disciplinaId || assunto.disciplinaId === filtros.disciplinaId);
  const subassuntos = opcoes.subassuntos.filter((subassunto) => !filtros.assuntoIds?.length || filtros.assuntoIds.includes(subassunto.assuntoId));

  return (
    <article className="bloco-card">
      <div className="bloco-header">
        <div className="bloco-title">
          <GripVertical size={18} aria-hidden="true" />
          <strong>Bloco {index + 1}</strong>
          {typeof bloco.totalEncontradas === 'number' ? <Badge>{bloco.totalEncontradas} encontradas</Badge> : null}
          {typeof bloco.totalSelecionadas === 'number' ? <Badge variant={bloco.totalSelecionadas > 0 ? 'success' : 'warning'}>{bloco.totalSelecionadas} selecionadas</Badge> : null}
        </div>
        <div className="icon-actions">
          <button type="button" className="icon-button" disabled={index === 0} onClick={() => onMove(bloco.id, -1)} title="Subir bloco">
            <ArrowUp size={16} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" disabled={index === total - 1} onClick={() => onMove(bloco.id, 1)} title="Descer bloco">
            <ArrowDown size={16} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button danger" disabled={total === 1} onClick={() => onRemove(bloco.id)} title="Remover bloco">
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="muted-text">Escolha uma disciplina inteira ou refine por assunto, subassunto, tags e outros filtros.</p>
      <ListaFiltersSummary bloco={bloco} opcoes={opcoes} />

      <div className="form-grid compact">
        <Input label="Título do bloco" name={`titulo-${bloco.id}`} value={bloco.tituloBloco} onChange={(event) => update('tituloBloco', event.target.value)} />
        <Select
          label="Disciplina"
          name={`disciplina-${bloco.id}`}
          value={filtros.disciplinaId}
          options={opcoes.disciplinas.map((disciplina) => ({ value: disciplina.id, label: disciplina.nome }))}
          onChange={(event) => updateFiltro('disciplinaId', event.target.value)}
        />
        <label className="field" htmlFor={`assuntos-${bloco.id}`}>
          <span>Assuntos opcionais</span>
          <select id={`assuntos-${bloco.id}`} className="input multi-select" multiple value={filtros.assuntoIds} onChange={(event) => updateFiltro('assuntoIds', multiValues(event))}>
            {assuntos.map((assunto) => <option key={assunto.id} value={assunto.id}>{assunto.nome}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`subassuntos-${bloco.id}`}>
          <span>Subassuntos opcionais</span>
          <select id={`subassuntos-${bloco.id}`} className="input multi-select" multiple value={filtros.subassuntoIds} onChange={(event) => updateFiltro('subassuntoIds', multiValues(event))}>
            {subassuntos.map((subassunto) => <option key={subassunto.id} value={subassunto.id}>{subassunto.nome}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`tags-${bloco.id}`}>
          <span>Tags opcionais</span>
          <select id={`tags-${bloco.id}`} className="input multi-select" multiple value={filtros.tagIds} onChange={(event) => updateFiltro('tagIds', multiValues(event))}>
            {opcoes.tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.nome}</option>)}
          </select>
        </label>
        <Select label="Tipo" name={`tipo-${bloco.id}`} value={filtros.tipo} options={tipoOptions} onChange={(event) => updateFiltro('tipo', event.target.value)} />
        <Select label="Dificuldade" name={`dificuldade-${bloco.id}`} value={filtros.dificuldade} options={dificuldadeOptions} onChange={(event) => updateFiltro('dificuldade', event.target.value)} />
        <Input label="Competência" name={`competencia-${bloco.id}`} value={filtros.competencia} onChange={(event) => updateFiltro('competencia', event.target.value)} />
        <Select label="Nível de Bloom" name={`bloom-${bloco.id}`} value={filtros.nivelBloom} options={bloomOptions} onChange={(event) => updateFiltro('nivelBloom', event.target.value)} />
        <Input label="Busca no enunciado" name={`search-${bloco.id}`} value={filtros.search} onChange={(event) => updateFiltro('search', event.target.value)} />
      </div>
    </article>
  );
}
