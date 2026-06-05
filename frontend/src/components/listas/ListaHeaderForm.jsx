import Input from '../ui/Input.jsx';

export default function ListaHeaderForm({ value, onChange }) {
  const update = (field, nextValue) => {
    onChange({
      ...value,
      [field]: nextValue,
    });
  };

  return (
    <div className="form-grid">
      <Input label="Instituição" name="instituicao" value={value.instituicao} onChange={(event) => update('instituicao', event.target.value)} />
      <Input label="Curso" name="curso" value={value.curso} onChange={(event) => update('curso', event.target.value)} />
      <Input label="Disciplina no cabeçalho" name="disciplinaTexto" value={value.disciplinaTexto} onChange={(event) => update('disciplinaTexto', event.target.value)} />
      <Input label="Professor" name="professor" value={value.professor} onChange={(event) => update('professor', event.target.value)} />
      <Input label="Turma" name="turma" value={value.turma} onChange={(event) => update('turma', event.target.value)} />
      <Input label="Data" name="data" value={value.data} onChange={(event) => update('data', event.target.value)} />
      <Input label="Título exibido" name="tituloExibicao" className="span-2" value={value.tituloExibicao} onChange={(event) => update('tituloExibicao', event.target.value)} />
    </div>
  );
}
