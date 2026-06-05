import { Check, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { normalizarTexto } from '../../utils/textNormalizer.js';
import Button from '../ui/Button.jsx';

export default function QuickCreateSelect({
  label,
  name,
  value,
  options = [],
  placeholder = 'Selecione',
  disabled = false,
  createLabel = 'Novo',
  requiredMark = false,
  onChange,
  onCreate,
}) {
  const [creating, setCreating] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  async function handleCreate() {
    const nome = newValue.trim();

    if (!nome) {
      setError(`Informe um nome para ${label.toLowerCase()}.`);
      return;
    }

    const existing = options.find((option) => normalizarTexto(option.label) === normalizarTexto(nome));

    if (existing) {
      onChange(existing.value);
      setNewValue('');
      setCreating(false);
      setFeedback(`${label} já existia e foi selecionado.`);
      setError('');
      return;
    }

    setSaving(true);
    setError('');
    setFeedback('');

    try {
      await onCreate(nome);
      setNewValue('');
      setCreating(false);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="quick-create-field">
      <label className="field" htmlFor={name}>
        <span>
          {label}
          {requiredMark ? <span className="required-mark"> *</span> : null}
        </span>
        <select
          id={name}
          className="input"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {creating ? (
        <div className="quick-create-row">
          <input
            className="input"
            value={newValue}
            disabled={disabled || saving}
            onChange={(event) => {
              setNewValue(event.target.value);
              setError('');
              setFeedback('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCreate();
              }
            }}
          />
          <button type="button" className="icon-button" disabled={disabled || saving || !newValue.trim()} onClick={handleCreate} title="Salvar">
            <Check size={16} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" onClick={() => setCreating(false)} title="Cancelar">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="secondary" icon={Plus} disabled={disabled} onClick={() => setCreating(true)}>
          {createLabel}
        </Button>
      )}
      {feedback ? <p className="success-message">{feedback}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
    </div>
  );
}
