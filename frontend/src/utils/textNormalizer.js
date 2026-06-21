export function normalizarTexto(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const normalizarTextoBusca = normalizarTexto;

export function slugify(value = '') {
  return normalizarTexto(value).replace(/\s+/g, '-');
}

export function normalizarTags(tags = []) {
  const seen = new Set();

  return tags
    .map((tag) => tag.toString().trim())
    .filter(Boolean)
    .filter((tag) => {
      const normalized = normalizarTexto(tag);

      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
}

export function gerarIdComPrefixo(prefixo, base = '') {
  const readable = slugify(base);
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return [prefixo, readable, random]
    .filter(Boolean)
    .join('-')
    .replace(/-+/g, '-');
}

export function tagsFromInput(value = '') {
  return normalizarTags(value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean));
}
