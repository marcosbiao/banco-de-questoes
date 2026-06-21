import { normalizarTextoBusca, slugify } from '../../utils/textNormalizer.js';
import {
  buscarDocumento,
  excluirDocumento,
  listarColecao,
  nowIso,
  salvarDocumento,
  sortByText,
} from './firestoreClient.js';

function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function fonteIdFromNome(nome) {
  const nomeBusca = normalizarTextoBusca(nome);
  const slug = slugify(nomeBusca);

  return slug ? `fonte-${slug}` : '';
}

function normalizarFonteDocumento(fonte) {
  if (!fonte) return null;

  const nome = text(fonte.nome);
  const nomeBusca = fonte.nomeBusca || normalizarTextoBusca(nome);

  return {
    ...fonte,
    nome,
    nomeBusca,
  };
}

export async function listarFontes() {
  return (await listarColecao('fontes'))
    .map(normalizarFonteDocumento)
    .filter(Boolean)
    .sort(sortByText('nomeBusca'));
}

export async function buscarFontePorNomeNormalizado(nomeBusca) {
  const normalizado = normalizarTextoBusca(nomeBusca);
  const id = fonteIdFromNome(normalizado);

  if (!id) {
    return null;
  }

  const fontePorId = await buscarDocumento('fontes', id);
  if (fontePorId) {
    return normalizarFonteDocumento(fontePorId);
  }

  return (await listarFontes())
    .find((fonte) => fonte.nomeBusca === normalizado) || null;
}

export async function obterOuCriarFonte(nome) {
  const fonteNome = text(nome);
  const nomeBusca = normalizarTextoBusca(fonteNome);
  const id = fonteIdFromNome(nomeBusca);

  if (!fonteNome || !nomeBusca || !id) {
    return null;
  }

  const existente = await buscarDocumento('fontes', id);
  if (existente) {
    return normalizarFonteDocumento(existente);
  }

  const now = nowIso();

  return salvarDocumento('fontes', id, {
    id,
    nome: fonteNome,
    nomeBusca,
    createdAt: now,
    updatedAt: now,
  });
}

export async function criarFonte(nome) {
  return obterOuCriarFonte(nome);
}

export async function excluirFonte(id) {
  const fonteId = text(id);

  if (!fonteId) {
    throw new Error('Informe o id da fonte para excluir.');
  }

  await excluirDocumento('fontes', fonteId);
}
