import { Trash2 } from 'lucide-react';
import { dificuldadeOptions, tipoOptions } from '../questoes/QuestaoFilters.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import QuestaoImagens from '../questoes/QuestaoImagens.jsx';

const bloomOptions = [
  { value: 'lembrar', label: 'Lembrar' },
  { value: 'compreender', label: 'Compreender' },
  { value: 'aplicar', label: 'Aplicar' },
  { value: 'analisar', label: 'Analisar' },
  { value: 'avaliar', label: 'Avaliar' },
  { value: 'criar', label: 'Criar' },
];

const tipoLabels = Object.fromEntries(tipoOptions.map((option) => [option.value, option.label]));
const dificuldadeLabels = Object.fromEntries(dificuldadeOptions.map((option) => [option.value, option.label]));

function tagsFromText(value) {
  return value.split(',').map((tag) => tag.trim()).filter(Boolean);
}

export default function ImportacaoQuestaoCard({ questao, numero, onChange, onRemove }) {
  const hasErro = (questao.alertas || []).some((alerta) => alerta.nivel === 'erro');

  return (
    <Card className={`import-question-card ${hasErro ? 'import-question-card-error' : ''}`}>
      <div className="questao-card-header">
        <div>
          <p className="questao-path">
            Questão {numero} · {questao.disciplina || 'Sem disciplina'} / {questao.assunto || 'Sem assunto'}
            {questao.subassunto ? ` / ${questao.subassunto}` : ''}
          </p>
          <h3>{questao.enunciado || 'Sem enunciado'}</h3>
        </div>
        <div className="tag-row">
          <Badge variant={questao.valida ? 'success' : 'warning'}>{questao.valida ? 'Válida' : 'Com erro'}</Badge>
          {questao.possivelDuplicidade ? <Badge variant="warning">Possível duplicidade</Badge> : null}
        </div>
      </div>

      <div className="form-grid compact">
        <Input label="Disciplina" name={`disciplina-${questao.uid}`} value={questao.disciplina} onChange={(event) => onChange(questao.uid, 'disciplina', event.target.value)} />
        <Input label="Assunto" name={`assunto-${questao.uid}`} value={questao.assunto} onChange={(event) => onChange(questao.uid, 'assunto', event.target.value)} />
        <Input label="Subassunto" name={`subassunto-${questao.uid}`} value={questao.subassunto} onChange={(event) => onChange(questao.uid, 'subassunto', event.target.value)} />
        <Select label="Tipo" name={`tipo-${questao.uid}`} value={questao.tipo} options={tipoOptions} onChange={(event) => onChange(questao.uid, 'tipo', event.target.value)} />
        <Select label="Dificuldade" name={`dificuldade-${questao.uid}`} value={questao.dificuldade} options={dificuldadeOptions} onChange={(event) => onChange(questao.uid, 'dificuldade', event.target.value)} />
        <Input label="Competência" name={`competencia-${questao.uid}`} value={questao.competencia} onChange={(event) => onChange(questao.uid, 'competencia', event.target.value)} />
        <Select label="Nível de Bloom" name={`bloom-${questao.uid}`} value={questao.nivelBloom} options={bloomOptions} onChange={(event) => onChange(questao.uid, 'nivelBloom', event.target.value)} />
        <Input label="Tags" name={`tags-${questao.uid}`} value={(questao.tags || []).join(', ')} onChange={(event) => onChange(questao.uid, 'tags', tagsFromText(event.target.value))} />
        <Textarea label="Enunciado" name={`enunciado-${questao.uid}`} className="span-2" rows={4} value={questao.enunciado} onChange={(event) => onChange(questao.uid, 'enunciado', event.target.value)} />
        <Textarea label="Resposta correta" name={`resposta-${questao.uid}`} rows={3} value={questao.respostaCorreta} onChange={(event) => onChange(questao.uid, 'respostaCorreta', event.target.value)} />
        <Textarea label="Explicação" name={`explicacao-${questao.uid}`} rows={3} value={questao.explicacao} onChange={(event) => onChange(questao.uid, 'explicacao', event.target.value)} />
        <Textarea label="Observação pedagógica" name={`observacao-${questao.uid}`} className="span-2" rows={3} value={questao.observacaoPedagogica} onChange={(event) => onChange(questao.uid, 'observacaoPedagogica', event.target.value)} />
      </div>

      <div className="meta-grid">
        <span>{tipoLabels[questao.tipo] || questao.tipo || 'Sem tipo'}</span>
        {questao.dificuldade ? <span>{dificuldadeLabels[questao.dificuldade] || questao.dificuldade}</span> : null}
        {questao.competencia ? <span>{questao.competencia}</span> : null}
        {questao.nivelBloom ? <span>Bloom: {questao.nivelBloom}</span> : null}
      </div>

      <QuestaoImagens imagens={questao.imagens} />

      {questao.alternativas?.length ? (
        <div className="import-alternatives">
          {questao.alternativas.map((alternativa, index) => (
            <p key={`${questao.uid}-alt-${index}`}>
              <strong>{alternativa.id || String.fromCharCode(65 + index)}.</strong> {alternativa.texto || 'Sem texto'}
              {alternativa.correta ? <Badge variant="success">Correta</Badge> : null}
            </p>
          ))}
        </div>
      ) : null}

      {questao.alertas?.length ? (
        <div className="import-alert-list">
          {questao.alertas.map((alerta, index) => (
            <p key={`${questao.uid}-alert-${index}`} className={alerta.nivel === 'erro' ? 'error-message' : 'status-message'}>
              <strong>{alerta.nivel === 'erro' ? 'Erro:' : 'Alerta:'}</strong> {alerta.mensagem}
            </p>
          ))}
        </div>
      ) : null}

      <div className="card-actions">
        <Button type="button" variant="danger" icon={Trash2} onClick={() => onRemove(questao.uid)}>
          Remover da importação
        </Button>
      </div>
    </Card>
  );
}
