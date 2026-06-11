import { AlertTriangle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { normalizarDificuldade, obterRotuloDificuldade } from '../../constants/dificuldades.js';
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

function tagsFromText(value) {
  return value.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function criterioVazio(index) {
  return {
    id: `criterio_${index + 1}`,
    nome: '',
    descricao: '',
    pontuacao: 0,
  };
}

function numberValue(value) {
  const numero = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : 0;
}

function valorOuNaoInformado(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'Não informado';
  }

  if (value === undefined || value === null || value === '') {
    return 'Não informado';
  }

  return String(value);
}

function resumirTexto(value = '', limite = 280) {
  const texto = valorOuNaoInformado(value);

  if (texto.length <= limite) {
    return texto;
  }

  return `${texto.slice(0, limite).trim()}...`;
}

function formatarData(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function rotuloTipo(value) {
  return tipoLabels[value] || value || '';
}

function rotuloDificuldade(value) {
  return obterRotuloDificuldade(value) || value || '';
}

function CampoComparacao({ label, value }) {
  return (
    <p>
      <strong>{label}:</strong>
      <span>{valorOuNaoInformado(value)}</span>
    </p>
  );
}

function PainelComparacao({ title, questao }) {
  return (
    <div className="duplicate-comparison-panel">
      <h4>{title}</h4>
      <CampoComparacao label="Enunciado" value={resumirTexto(questao.enunciado)} />
      <CampoComparacao label="Tipo" value={rotuloTipo(questao.tipo)} />
      <CampoComparacao label="Assunto" value={questao.assunto} />
      <CampoComparacao label="Subassunto" value={questao.subassunto} />
      <CampoComparacao label="Dificuldade" value={rotuloDificuldade(questao.dificuldade)} />
      <CampoComparacao label="Competência" value={questao.competencia} />
      <CampoComparacao label="Tags" value={questao.tags || questao.tagsNomes || []} />
    </div>
  );
}

export default function ImportacaoQuestaoCard({ questao, numero, onChange, onRemove }) {
  const hasErro = (questao.alertas || []).some((alerta) => alerta.nivel === 'erro');
  const selecionada = Boolean(questao.valida && questao.selecionada !== false);
  const dificuldadeLabel = obterRotuloDificuldade(questao.dificuldade);
  const rubrica = questao.rubrica || null;
  const duplicidade = questao.duplicidade || null;
  const duplicidadeDecisao = questao.duplicidadeDecisao || '';
  const duplicidadeData = formatarData(duplicidade?.updatedAt || duplicidade?.createdAt);
  const alertasVisiveis = (questao.alertas || []).filter((alerta) => (
    alerta.codigo !== 'possivel_duplicidade' || !questao.possivelDuplicidade
  ));

  const updateRubrica = (field, value) => {
    onChange(questao.uid, 'rubrica', {
      ...(rubrica || { pontuacaoTotal: 10, criterios: [], respostaModelo: '', observacoesCorrecao: '' }),
      [field]: value,
    });
  };

  const updateCriterio = (index, field, value) => {
    const criterios = rubrica?.criterios || [];
    updateRubrica('criterios', criterios.map((criterio, criterioIndex) => (
      criterioIndex === index
        ? { ...criterio, [field]: field === 'pontuacao' ? numberValue(value) : value }
        : criterio
    )));
  };

  const addCriterio = () => {
    const criterios = rubrica?.criterios || [];
    updateRubrica('criterios', [...criterios, criterioVazio(criterios.length)]);
  };

  const removeCriterio = (index) => {
    updateRubrica('criterios', (rubrica?.criterios || []).filter((_, criterioIndex) => criterioIndex !== index));
  };

  return (
    <Card className={`import-question-card ${hasErro ? 'import-question-card-error' : ''}`}>
      <div className="questao-card-header">
        <div>
          <p className="questao-path">
            Questão {numero}
            {questao.idTemporario ? ` · ID: ${questao.idTemporario}` : ''}
            {' · '}
            {questao.disciplina || 'Sem disciplina'} / {questao.assunto || 'Sem assunto'}
            {questao.subassunto ? ` / ${questao.subassunto}` : ''}
          </p>
          <h3>{questao.enunciado || 'Sem enunciado'}</h3>
        </div>
        <div className="import-question-side">
          <label className="mini-check import-selection-field">
            <input
              type="checkbox"
              checked={selecionada}
              disabled={hasErro}
              aria-label={`Selecionar questão ${numero} para importação`}
              onChange={(event) => onChange(questao.uid, 'selecionada', event.target.checked)}
            />
            <span>{hasErro ? 'Não importável' : 'Importar'}</span>
          </label>
          <div className="tag-row">
            <Badge variant={questao.valida ? 'success' : 'warning'}>{questao.valida ? 'Válida' : 'Com erro'}</Badge>
            {questao.valida && questao.selecionada === false ? <Badge variant="warning">Não selecionada</Badge> : null}
            {questao.possivelDuplicidade ? <Badge variant="warning">Possível duplicidade</Badge> : null}
            {rubrica ? <Badge variant="success">Com rubrica</Badge> : null}
          </div>
        </div>
      </div>

      {questao.possivelDuplicidade && duplicidade ? (
        <section className="duplicate-alert-box">
          <div className="duplicate-alert-heading">
            <AlertTriangle size={22} aria-hidden="true" />
            <div>
              <h4>Possível duplicidade encontrada</h4>
              <p>Esta questão é parecida com uma questão já cadastrada. Revise antes de importar.</p>
            </div>
          </div>

          <div className="duplicate-reason-row">
            {duplicidade.similaridade ? (
              <Badge variant="warning">Semelhança estimada: {duplicidade.similaridade}%</Badge>
            ) : null}
            <Badge variant="warning">Motivo: {duplicidade.motivo || 'enunciado muito parecido'}</Badge>
            {duplicidadeDecisao === 'importar' ? <Badge variant="success">Decisão: importar mesmo assim</Badge> : null}
            {duplicidadeDecisao === 'revisao' ? <Badge variant="warning">Decisão: manter em revisão</Badge> : null}
          </div>

          <div className="duplicate-existing-summary">
            <h4>Questão já cadastrada</h4>
            <div className="duplicate-summary-grid">
              <CampoComparacao label="ID" value={duplicidade.id} />
              <CampoComparacao label="Disciplina" value={duplicidade.disciplina} />
              <CampoComparacao label="Assunto" value={duplicidade.assunto} />
              <CampoComparacao label="Subassunto" value={duplicidade.subassunto} />
              <CampoComparacao label="Tipo" value={rotuloTipo(duplicidade.tipo)} />
              <CampoComparacao label="Dificuldade" value={rotuloDificuldade(duplicidade.dificuldade)} />
              <CampoComparacao label="Competência" value={duplicidade.competencia} />
              <CampoComparacao label="Bloom" value={duplicidade.nivelBloom} />
              <CampoComparacao label="Status" value={duplicidade.status} />
              <CampoComparacao label={duplicidade.updatedAt ? 'Atualizada em' : 'Criada em'} value={duplicidadeData} />
            </div>
          </div>

          <div className="duplicate-comparison-grid">
            <PainelComparacao title="Questão importada" questao={questao} />
            <PainelComparacao title="Questão já cadastrada" questao={duplicidade} />
          </div>

          <div className="card-actions">
            <Button type="button" variant="secondary" size="sm" icon={CheckCircle} onClick={() => onChange(questao.uid, 'duplicidadeDecisao', 'importar')}>
              Importar mesmo assim
            </Button>
            <Button type="button" variant="warning" size="sm" icon={AlertTriangle} onClick={() => onChange(questao.uid, 'duplicidadeDecisao', 'revisao')}>
              Manter em revisão
            </Button>
            <Button type="button" variant="danger" size="sm" icon={Trash2} onClick={() => onRemove(questao.uid)}>
              Ignorar esta questão
            </Button>
          </div>
        </section>
      ) : null}

      <div className="form-grid compact">
        <Input label="Disciplina" name={`disciplina-${questao.uid}`} value={questao.disciplina} onChange={(event) => onChange(questao.uid, 'disciplina', event.target.value)} />
        <Input label="Assunto" name={`assunto-${questao.uid}`} value={questao.assunto} onChange={(event) => onChange(questao.uid, 'assunto', event.target.value)} />
        <Input label="Subassunto" name={`subassunto-${questao.uid}`} value={questao.subassunto} onChange={(event) => onChange(questao.uid, 'subassunto', event.target.value)} />
        <Select label="Tipo" name={`tipo-${questao.uid}`} value={questao.tipo} options={tipoOptions} onChange={(event) => onChange(questao.uid, 'tipo', event.target.value)} />
        <Select label="Dificuldade" name={`dificuldade-${questao.uid}`} value={questao.dificuldade} options={dificuldadeOptions} onChange={(event) => onChange(questao.uid, 'dificuldade', normalizarDificuldade(event.target.value))} />
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
        {dificuldadeLabel ? <span>{dificuldadeLabel}</span> : null}
        {questao.competencia ? <span>{questao.competencia}</span> : null}
        {questao.nivelBloom ? <span>Bloom: {questao.nivelBloom}</span> : null}
      </div>

      <QuestaoImagens imagens={questao.imagens} />

      {rubrica ? (
        <section className="rubrica-preview">
          <div className="inline-title">
            <div>
              <p className="eyebrow">Rubrica</p>
              <h4>{rubrica.pontuacaoTotal} pontos · {(rubrica.criterios || []).length} critérios</h4>
            </div>
            <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addCriterio}>
              Critério
            </Button>
          </div>

          <div className="criterios-list">
            {(rubrica.criterios || []).map((criterio, index) => (
              <article className="criterio-editor" key={criterio.id || index}>
                <div className="criterio-editor-grid">
                  <Input
                    label="Nome do critério"
                    name={`criterio-nome-${questao.uid}-${index}`}
                    value={criterio.nome}
                    onChange={(event) => updateCriterio(index, 'nome', event.target.value)}
                  />
                  <Input
                    label="Pontuação"
                    name={`criterio-pontos-${questao.uid}-${index}`}
                    type="number"
                    min="0"
                    max="10"
                    step="0.25"
                    value={criterio.pontuacao}
                    onChange={(event) => updateCriterio(index, 'pontuacao', event.target.value)}
                  />
                  <Textarea
                    label="Descrição"
                    name={`criterio-descricao-${questao.uid}-${index}`}
                    className="span-2"
                    rows={2}
                    value={criterio.descricao}
                    onChange={(event) => updateCriterio(index, 'descricao', event.target.value)}
                  />
                </div>
                <button type="button" className="icon-button danger" onClick={() => removeCriterio(index)} title="Remover critério">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>

          <div className="form-grid">
            <Textarea
              label="Resposta modelo"
              name={`rubrica-resposta-${questao.uid}`}
              rows={3}
              value={rubrica.respostaModelo}
              onChange={(event) => updateRubrica('respostaModelo', event.target.value)}
            />
            <Textarea
              label="Observações de correção"
              name={`rubrica-observacoes-${questao.uid}`}
              rows={3}
              value={rubrica.observacoesCorrecao}
              onChange={(event) => updateRubrica('observacoesCorrecao', event.target.value)}
            />
          </div>
        </section>
      ) : null}

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

      {alertasVisiveis.length ? (
        <div className="import-alert-list">
          {alertasVisiveis.map((alerta, index) => (
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
