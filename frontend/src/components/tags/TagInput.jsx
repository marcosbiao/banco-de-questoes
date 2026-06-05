import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buscarSugestoesTags } from '../../services/tagsService.js';
import { normalizarTexto } from '../../utils/textNormalizer.js';
import Badge from '../ui/Badge.jsx';

function normalizeTags(tags = []) {
  const seen = new Set();

  return tags
    .map((tag) => tag.toString().trim())
    .filter(Boolean)
    .filter((tag) => {
      const normalized = normalizarTexto(tag);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

export default function TagInput({ label = 'Tags', value = [], onChange }) {
  const [draft, setDraft] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const tags = normalizeTags(value);

  useEffect(() => {
    let active = true;

    if (!draft.trim()) {
      setSuggestions([]);
      return undefined;
    }

    const timeout = setTimeout(() => {
      buscarSugestoesTags(draft)
        .then((data) => {
          if (active) {
            setSuggestions(data);
          }
        })
        .catch(() => {
          if (active) {
            setSuggestions([]);
          }
        });
    }, 180);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [draft]);

  function addTag(tagName) {
    const nome = tagName.trim();

    if (!nome) {
      return;
    }

    const exists = tags.some((tag) => normalizarTexto(tag) === normalizarTexto(nome));

    if (!exists) {
      onChange([...tags, nome]);
    }

    setDraft('');
    setSuggestions([]);
  }

  function removeTag(tagName) {
    onChange(tags.filter((tag) => normalizarTexto(tag) !== normalizarTexto(tagName)));
  }

  return (
    <div className="tag-input-field">
      <label className="field" htmlFor="tags-input">
        <span>{label}</span>
        <input
          id="tags-input"
          className="input"
          value={draft}
          placeholder="algoritmo, while, revisão"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              addTag(draft);
            }
          }}
          onBlur={() => addTag(draft)}
        />
      </label>

      {tags.length ? (
        <div className="tag-row">
          {tags.map((tag) => (
            <button key={tag} type="button" className="tag-pill" onClick={() => removeTag(tag)}>
              <Badge>{tag}</Badge>
              <X size={14} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}

      {suggestions.length ? (
        <div className="tag-suggestions">
          {suggestions.map((tag) => (
            <button key={tag.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addTag(tag.nome)}>
              {tag.nome}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
