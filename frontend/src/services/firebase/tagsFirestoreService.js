import { gerarIdComPrefixo, normalizarTags, normalizarTexto } from '../../utils/textNormalizer.js';
import { listarColecao, nowIso, salvarDocumento, sortByText } from './firestoreClient.js';

export async function listarTags() {
  return (await listarColecao('tags')).sort(sortByText('nomeNormalizado'));
}

export async function criarTag(payload) {
  return garantirTag(payload.nome || '');
}

export async function buscarSugestoesTags(query = '') {
  const normalizado = normalizarTexto(query);

  return (await listarTags())
    .filter((tag) => !normalizado || (tag.nomeNormalizado || normalizarTexto(tag.nome)).includes(normalizado))
    .slice(0, 8);
}

export async function garantirTag(nome) {
  const tagNome = nome.trim();
  const nomeNormalizado = normalizarTexto(tagNome);

  if (!tagNome) {
    return null;
  }

  const existente = (await listarTags())
    .find((tag) => (tag.nomeNormalizado || normalizarTexto(tag.nome)) === nomeNormalizado);

  if (existente) {
    return existente;
  }

  const now = nowIso();
  const id = gerarIdComPrefixo('tag', nomeNormalizado);

  return salvarDocumento('tags', id, {
    id,
    nome: tagNome,
    nomeNormalizado,
    createdAt: now,
    updatedAt: now,
  });
}

export async function garantirTags(nomes = []) {
  const tags = [];

  for (const nome of normalizarTags(nomes)) {
    const tag = await garantirTag(nome);

    if (tag) {
      tags.push(tag);
    }
  }

  return {
    ids: tags.map((tag) => tag.id),
    nomes: tags.map((tag) => tag.nome),
  };
}
