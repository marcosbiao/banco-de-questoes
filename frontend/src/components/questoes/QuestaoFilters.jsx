import { RotateCcw, Search } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';

export const tipoOptions = [
  { value: 'multipla_escolha', label: 'Múltipla escolha' },
  { value: 'verdadeiro_falso', label: 'Verdadeiro ou falso' },
  { value: 'discursiva', label: 'Discursiva' },
  { value: 'codigo_analise', label: 'Código para analisar' },
  { value: 'problema_programacao', label: 'Problema de programação' },
  { value: 'imagem', label: 'Questão com imagem' },
  { value: 'arquivo_anexo', label: 'Questão com arquivo anexado' },
];

export const dificuldadeOptions = [
  { value: 'facil', label: 'Fácil' },
  { value: 'medio', label: 'Médio' },
  { value: 'dificil', label: 'Difícil' },
];

export const statusOptions = [
  { value: 'ativa', label: 'Ativa' },
  { value: 'arquivada', label: 'Arquivada' },
];

export default function QuestaoFilters({ filtros, onChange, onApply, onClear, opcoes }) {
  const update = (field, value) => {
    onChange({
      ...filtros,
      [field]: value,
      ...(field === 'disciplinaId' ? { assuntoId: '', subassuntoId: '' } : {}),
      ...(field === 'assuntoId' ? { subassuntoId: '' } : {}),
    });
  };

  const assuntoOptions = opcoes.assuntos
    .filter((assunto) => !filtros.disciplinaId || assunto.disciplinaId === filtros.disciplinaId)
    .map((assunto) => ({ value: assunto.id, label: assunto.nome }));

  const subassuntoOptions = opcoes.subassuntos
    .filter((subassunto) => !filtros.assuntoId || subassunto.assuntoId === filtros.assuntoId)
    .map((subassunto) => ({ value: subassunto.id, label: subassunto.nome }));

  return (
    <section className="filters-panel">
      <Input
        label="Busca"
        name="search"
        placeholder="Enunciado ou tag"
        value={filtros.search}
        onChange={(event) => update('search', event.target.value)}
      />
      <Select
        label="Disciplina"
        name="disciplinaId"
        value={filtros.disciplinaId}
        options={opcoes.disciplinas.map((disciplina) => ({ value: disciplina.id, label: disciplina.nome }))}
        onChange={(event) => update('disciplinaId', event.target.value)}
      />
      <Select
        label="Assunto"
        name="assuntoId"
        value={filtros.assuntoId}
        options={assuntoOptions}
        onChange={(event) => update('assuntoId', event.target.value)}
      />
      <Select
        label="Subassunto"
        name="subassuntoId"
        value={filtros.subassuntoId}
        options={subassuntoOptions}
        onChange={(event) => update('subassuntoId', event.target.value)}
      />
      <Select
        label="Tipo"
        name="tipo"
        value={filtros.tipo}
        options={tipoOptions}
        onChange={(event) => update('tipo', event.target.value)}
      />
      <Select
        label="Dificuldade"
        name="dificuldade"
        value={filtros.dificuldade}
        options={dificuldadeOptions}
        onChange={(event) => update('dificuldade', event.target.value)}
      />
      <Select
        label="Status"
        name="status"
        value={filtros.status}
        options={statusOptions}
        onChange={(event) => update('status', event.target.value)}
      />
      <label className="field" htmlFor="tagIds">
        <span>Tags</span>
        <select
          id="tagIds"
          className="input multi-select"
          multiple
          value={filtros.tagIds}
          onChange={(event) => update('tagIds', Array.from(event.target.selectedOptions).map((option) => option.value))}
        >
          {(opcoes.tags || []).map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.nome}
            </option>
          ))}
        </select>
      </label>
      <Button type="button" icon={Search} onClick={onApply}>
        Aplicar
      </Button>
      <Button type="button" variant="secondary" icon={RotateCcw} onClick={onClear}>
        Limpar
      </Button>
    </section>
  );
}
