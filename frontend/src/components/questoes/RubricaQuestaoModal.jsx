import { Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { atualizarMarcadorRubricaQuestao } from '../../services/questoesService.js';
import {
  obterRubricaQuestao,
  removerRubricaQuestao,
  salvarRubricaQuestao,
} from '../../services/firebase/rubricasFirestoreService.js';
import Button from '../ui/Button.jsx';
import ErrorMessage from '../ui/ErrorMessage.jsx';
import Input from '../ui/Input.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';

const statusOptions = [
  { value: 'aprovada', label: 'Aprovada' },
  { value: 'em_revisao', label: 'Em revisão' },
];

function criterioVazio(index) {
  return {
    id: `criterio_${index + 1}`,
    nome: '',
    descricao: '',
    pontuacao: 0,
  };
}

function rubricaVazia() {
  return {
    pontuacaoTotal: 10,
    criterios: [criterioVazio(0)],
    respostaModelo: '',
    observacoesCorrecao: '',
    status: 'em_revisao',
  };
}

function numberValue(value) {
  const numero = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : 0;
}

function normalizarFormRubrica(rubrica = {}) {
  const criterios = Array.isArray(rubrica.criterios) && rubrica.criterios.length
    ? rubrica.criterios.map((criterio, index) => ({
      id: criterio.id || `criterio_${index + 1}`,
      nome: criterio.nome || '',
      descricao: criterio.descricao || '',
      pontuacao: numberValue(criterio.pontuacao),
    }))
    : [criterioVazio(0)];

  return {
    pontuacaoTotal: 10,
    criterios,
    respostaModelo: rubrica.respostaModelo || '',
    observacoesCorrecao: rubrica.observacoesCorrecao || '',
    status: rubrica.status || 'em_revisao',
  };
}

function validarRubrica(form) {
  if (form.pontuacaoTotal !== 10) {
    return 'A pontuação total da rubrica deve ser 10.';
  }

  if (!Array.isArray(form.criterios) || !form.criterios.length) {
    return 'A rubrica precisa ter pelo menos um critério.';
  }

  const criterios = form.criterios.map((criterio) => ({
    ...criterio,
    nome: String(criterio.nome || '').trim(),
    descricao: String(criterio.descricao || '').trim(),
    pontuacao: numberValue(criterio.pontuacao),
  }));

  const criterioInvalido = criterios.find((criterio) => !criterio.nome || !criterio.descricao || criterio.pontuacao <= 0);

  if (criterioInvalido) {
    return 'Cada critério precisa ter nome, descrição e pontuação maior que zero.';
  }

  const soma = Math.round(criterios.reduce((total, criterio) => total + criterio.pontuacao, 0) * 100) / 100;

  if (Math.abs(soma - 10) > 0.001) {
    return 'A soma das pontuações dos critérios deve ser exatamente 10.';
  }

  if (typeof form.respostaModelo !== 'string') {
    return 'Resposta modelo deve ser texto.';
  }

  if (typeof form.observacoesCorrecao !== 'string') {
    return 'Observações de correção devem ser texto.';
  }

  return '';
}

export default function RubricaQuestaoModal({ questao, open, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState(rubricaVazia);
  const [rubricaExistente, setRubricaExistente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadRubrica() {
      if (!open || !questao?.id) return;

      setLoading(true);
      setError('');
      setRubricaExistente(null);
      setForm(rubricaVazia());

      try {
        const rubrica = await obterRubricaQuestao(questao.id);

        if (cancelled) return;

        setRubricaExistente(rubrica);
        setForm(normalizarFormRubrica(rubrica || {}));
      } catch (apiError) {
        if (!cancelled) {
          setError(apiError.message || 'Não foi possível carregar a rubrica.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRubrica();

    return () => {
      cancelled = true;
    };
  }, [open, questao?.id]);

  if (!open || !questao) {
    return null;
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateCriterio(index, field, value) {
    setForm((current) => ({
      ...current,
      criterios: current.criterios.map((criterio, criterioIndex) => (
        criterioIndex === index
          ? { ...criterio, [field]: field === 'pontuacao' ? numberValue(value) : value }
          : criterio
      )),
    }));
  }

  function addCriterio() {
    setForm((current) => ({
      ...current,
      criterios: [...current.criterios, criterioVazio(current.criterios.length)],
    }));
  }

  function removeCriterio(index) {
    setForm((current) => ({
      ...current,
      criterios: current.criterios.filter((_, criterioIndex) => criterioIndex !== index),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const validationError = validarRubrica(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        criterios: form.criterios.map((criterio, index) => ({
          id: criterio.id || `criterio_${index + 1}`,
          nome: String(criterio.nome || '').trim(),
          descricao: String(criterio.descricao || '').trim(),
          pontuacao: numberValue(criterio.pontuacao),
        })),
      };

      await salvarRubricaQuestao(questao.id, payload, {
        tipoQuestao: questao.tipo,
        competencia: questao.competencia,
        nivelBloom: questao.nivelBloom,
        geradaPorIA: rubricaExistente ? Boolean(rubricaExistente.geradaPorIA) : false,
        modeloIA: rubricaExistente?.modeloIA || 'manual',
        status: form.status,
      });

      const questaoAtualizada = await atualizarMarcadorRubricaQuestao(questao.id, true);
      onSaved?.(questaoAtualizada);
      onClose?.();
    } catch (apiError) {
      setError(apiError.message || 'Não foi possível salvar a rubrica.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!rubricaExistente) return;

    const confirmado = window.confirm('Remover a rubrica desta questão? Esta ação não poderá ser desfeita.');

    if (!confirmado) return;

    setDeleting(true);
    setError('');

    try {
      await removerRubricaQuestao(questao.id);
      const questaoAtualizada = await atualizarMarcadorRubricaQuestao(questao.id, false);
      onDeleted?.(questaoAtualizada);
      onClose?.();
    } catch (apiError) {
      setError(apiError.message || 'Não foi possível remover a rubrica.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="rubrica-modal" role="dialog" aria-modal="true" aria-labelledby="rubrica-modal-title">
        <div className="inline-title">
          <div>
            <p className="eyebrow">Rubrica</p>
            <h3 id="rubrica-modal-title">{questao.enunciado || 'Questão sem enunciado'}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Fechar">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {loading ? <LoadingState message="Carregando rubrica..." /> : null}
        <ErrorMessage message={error} />

        {!loading ? (
          <form className="rubrica-modal-form" onSubmit={handleSubmit}>
            <div className="form-grid compact">
              <Input label="Pontuação total" name="rubrica-pontuacao-total" type="number" value={form.pontuacaoTotal} disabled />
              <Select
                label="Status"
                name="rubrica-status"
                value={form.status}
                options={statusOptions}
                onChange={(event) => updateField('status', event.target.value)}
              />
            </div>

            <section className="rubrica-preview">
              <div className="inline-title">
                <div>
                  <p className="eyebrow">Critérios</p>
                  <h4>{form.criterios.length} critério(s)</h4>
                </div>
                <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addCriterio}>
                  Critério
                </Button>
              </div>

              <div className="criterios-list">
                {form.criterios.map((criterio, index) => (
                  <article className="criterio-editor" key={criterio.id || index}>
                    <div className="criterio-editor-grid">
                      <Input
                        label="Nome do critério"
                        name={`rubrica-criterio-nome-${index}`}
                        value={criterio.nome}
                        onChange={(event) => updateCriterio(index, 'nome', event.target.value)}
                      />
                      <Input
                        label="Pontuação"
                        name={`rubrica-criterio-pontuacao-${index}`}
                        type="number"
                        min="0"
                        max="10"
                        step="0.25"
                        value={criterio.pontuacao}
                        onChange={(event) => updateCriterio(index, 'pontuacao', event.target.value)}
                      />
                      <Textarea
                        label="Descrição"
                        name={`rubrica-criterio-descricao-${index}`}
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
            </section>

            <div className="form-grid">
              <Textarea
                label="Resposta modelo"
                name="rubrica-resposta-modelo"
                rows={3}
                value={form.respostaModelo}
                onChange={(event) => updateField('respostaModelo', event.target.value)}
              />
              <Textarea
                label="Observações de correção"
                name="rubrica-observacoes-correcao"
                rows={3}
                value={form.observacoesCorrecao}
                onChange={(event) => updateField('observacoesCorrecao', event.target.value)}
              />
            </div>

            <div className="dialog-actions">
              {rubricaExistente ? (
                <Button type="button" variant="danger" icon={Trash2} disabled={saving || deleting} onClick={handleDelete}>
                  {deleting ? 'Removendo...' : 'Remover rubrica'}
                </Button>
              ) : null}
              <Button type="button" variant="secondary" disabled={saving || deleting} onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" icon={Save} disabled={saving || deleting}>
                {saving ? 'Salvando...' : 'Salvar rubrica'}
              </Button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
