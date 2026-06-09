function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function isBase64ImageUrl(url) {
  return /^data:/i.test(text(url));
}

export function normalizarImagemQuestao(imagem = {}) {
  const url = text(imagem.url);

  if (!url || isBase64ImageUrl(url)) {
    return null;
  }

  return {
    url,
    path: text(imagem.path),
    nome: text(imagem.nome),
    legenda: text(imagem.legenda),
    textoAlternativo: text(imagem.textoAlternativo),
    fonte: text(imagem.fonte),
  };
}

export function normalizarImagensQuestao(imagens = []) {
  if (!Array.isArray(imagens)) {
    return [];
  }

  return imagens
    .map((imagem) => normalizarImagemQuestao(imagem))
    .filter(Boolean);
}

export function altImagemQuestao(imagem = {}, index = 0) {
  return text(imagem.textoAlternativo)
    || text(imagem.legenda)
    || text(imagem.nome)
    || `Imagem ${index + 1} da questão`;
}
