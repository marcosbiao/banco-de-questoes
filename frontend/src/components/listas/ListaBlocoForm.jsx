import { ArrowDown, ArrowUp, GripVertical, RotateCcw, Trash2 } from 'lucide-react';
import { normalizarTexto } from '../../utils/textNormalizer.js';
import { dificuldadeOptions, tipoOptions } from '../questoes/QuestaoFilters.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
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

const filtrosLimpos = {
  disciplinaId: '',
  assuntoIds: [],
  subassuntoIds: [],
  tagIds: [],
  tipo: '',
  dificuldade: '',
  competencia: '',
  nivelBloom: '',
  status: 'ativa',
  search: '',
};

const statusBaseOptions = [
  { value: 'ativa', label: 'Ativa' },
  { value: 'em_revisao', label: 'Em revisão' },
  { value: 'inativa', label: 'Inativa' },
  { value: 'arquivada', label: 'Arquivada' },
];

function optionLabel(value = '') {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function uniqueOptions(options = []) {
  return options
    .filter((option) => option?.value)
    .filter((option, index, list) => list.findIndex((item) => item.value === option.value) === index)
    .sort((a, b) => String(a.label || '').localeCompare(String(b.label || ''), 'pt-BR', { sensitivity: 'base' }));
}

function valuesFrom(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function questaoTags(questao) {
  return questao.tagsNomes || questao.tags || [];
}

function questaoMatchesTag(questao, tagId) {
  const tagsIds = questao.tagsIds || [];
  const tagNames = questaoTags(questao).map((tag) => normalizarTexto(tag));
  const tagNormalizada = normalizarTexto(tagId);

  return tagsIds.includes(tagId) || tagNames.includes(tagNormalizada);
}

function filtrarQuestoesParaBloco(questoes, filtros) {
  const assuntoIds = valuesFrom(filtros.assuntoIds);
  const subassuntoIds = valuesFrom(filtros.subassuntoIds);
  const tagIds = valuesFrom(filtros.tagIds);
  const busca = normalizarTexto(filtros.search || '');

  return questoes.filter((questao) => {
    if (filtros.disciplinaId && questao.disciplinaId !== filtros.disciplinaId) return false;
    if (assuntoIds.length && !assuntoIds.includes(questao.assuntoId)) return false;
    if (subassuntoIds.length && !subassuntoIds.includes(questao.subassuntoId || '')) return false;
    if (filtros.tipo && questao.tipo !== filtros.tipo) return false;
    if (filtros.dificuldade && questao.dificuldade !== filtros.dificuldade) return false;
    if (filtros.competencia && questao.competencia !== filtros.competencia) return false;
    if (filtros.nivelBloom && questao.nivelBloom !== filtros.nivelBloom) return false;
    if (filtros.status && (questao.status || 'ativa') !== filtros.status) return false;
    if (tagIds.length && !tagIds.every((tagId) => questaoMatchesTag(questao, tagId))) return false;

    if (busca) {
      const texto = normalizarTexto([
        questao.enunciado,
        questao.assunto,
        questao.subassunto,
        questao.competencia,
        ...questaoTags(questao),
      ].filter(Boolean).join(' '));

      if (!texto.includes(busca)) return false;
    }

    return true;
  });
}

function limparFiltros() {
  return {
    ...filtrosLimpos,
    assuntoIds: [],
    subassuntoIds: [],
    tagIds: [],
  };
}

function statusOptionsFrom(opcoes) {
  return uniqueOptions([
    ...statusBaseOptions,
    ...(opcoes.statuses || []).map((status) => ({
      value: status.value,
      label: status.label || optionLabel(status.value),
    })),
  ]);
}

export default function ListaBlocoForm({ bloco, index, total, opcoes, questoesDisponiveis = [], onChange, onMove, onRemove }) {
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

  const questoesEncontradas = filtrarQuestoesParaBloco(questoesDisponiveis, filtros);
  const assuntoOptions = uniqueOptions(opcoes.assuntos.filter((assunto) => !filtros.disciplinaId || assunto.disciplinaId === filtros.disciplinaId));
  const subassuntoOptions = uniqueOptions(opcoes.subassuntos.filter((subassunto) => !filtros.assuntoIds?.length || filtros.assuntoIds.includes(subassunto.assuntoId)));
  const competenciaOptions = uniqueOptions(opcoes.competencias || []);
  const tagOptions = uniqueOptions(opcoes.tags || []);
  const statusOptions = statusOptionsFrom(opcoes);

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
      <div className="bloco-filter-status">
        <Badge variant={questoesEncontradas.length > 0 ? 'success' : 'warning'}>
          {questoesEncontradas.length} questões encontradas
        </Badge>
        {!questoesEncontradas.length ? <span>Nenhuma questão encontrada com os filtros selecionados.</span> : null}
      </div>

      <div className="form-grid compact">
        <Input label="Título do bloco" name={`titulo-${bloco.id}`} value={bloco.tituloBloco} onChange={(event) => update('tituloBloco', event.target.value)} />
        <Select
          label="Disciplina"
          name={`disciplina-${bloco.id}`}
          value={filtros.disciplinaId}
          options={uniqueOptions(opcoes.disciplinas)}
          onChange={(event) => updateFiltro('disciplinaId', event.target.value)}
        />
        <label className="field" htmlFor={`assuntos-${bloco.id}`}>
          <span>Assuntos opcionais</span>
          <select id={`assuntos-${bloco.id}`} className="input multi-select" multiple value={filtros.assuntoIds} onChange={(event) => updateFiltro('assuntoIds', multiValues(event))}>
            {assuntoOptions.map((assunto) => <option key={assunto.value} value={assunto.value}>{assunto.label}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`subassuntos-${bloco.id}`}>
          <span>Subassuntos opcionais</span>
          <select id={`subassuntos-${bloco.id}`} className="input multi-select" multiple value={filtros.subassuntoIds} onChange={(event) => updateFiltro('subassuntoIds', multiValues(event))}>
            {subassuntoOptions.map((subassunto) => <option key={subassunto.value} value={subassunto.value}>{subassunto.label}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`tags-${bloco.id}`}>
          <span>Tags opcionais</span>
          <select id={`tags-${bloco.id}`} className="input multi-select" multiple value={filtros.tagIds} onChange={(event) => updateFiltro('tagIds', multiValues(event))}>
            {tagOptions.map((tag) => <option key={tag.value} value={tag.value}>{tag.label}</option>)}
          </select>
        </label>
        <Select label="Tipo" name={`tipo-${bloco.id}`} value={filtros.tipo} options={tipoOptions} onChange={(event) => updateFiltro('tipo', event.target.value)} />
        <Select label="Dificuldade" name={`dificuldade-${bloco.id}`} value={filtros.dificuldade} options={dificuldadeOptions} onChange={(event) => updateFiltro('dificuldade', event.target.value)} />
        <Select label="Competência" name={`competencia-${bloco.id}`} value={filtros.competencia} options={competenciaOptions} onChange={(event) => updateFiltro('competencia', event.target.value)} />
        <Select label="Nível de Bloom" name={`bloom-${bloco.id}`} value={filtros.nivelBloom} options={bloomOptions} onChange={(event) => updateFiltro('nivelBloom', event.target.value)} />
        <Select label="Status" name={`status-${bloco.id}`} value={filtros.status} options={statusOptions} onChange={(event) => updateFiltro('status', event.target.value)} />
        <Input label="Busca no enunciado" name={`search-${bloco.id}`} value={filtros.search} onChange={(event) => updateFiltro('search', event.target.value)} />
      </div>

      <div className="card-actions">
        <Button type="button" variant="secondary" icon={RotateCcw} onClick={() => onChange(bloco.id, { ...bloco, filtros: limparFiltros() })}>
          Limpar filtros
        </Button>
      </div>
    </article>
  );
}
