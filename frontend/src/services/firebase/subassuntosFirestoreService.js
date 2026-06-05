import { gerarIdComPrefixo, normalizarTexto } from '../../utils/textNormalizer.js';
import { listarColecao, nowIso, salvarDocumento, sortByText } from './firestoreClient.js';

export async function listarSubassuntos(filtros = {}) {
  return (await listarColecao('subassuntos'))
    .filter((subassunto) => !filtros.disciplinaId || subassunto.disciplinaId === filtros.disciplinaId)
    .filter((subassunto) => !filtros.assuntoId || subassunto.assuntoId === filtros.assuntoId)
    .sort(sortByText('nome'));
}

export function listarSubassuntosPorAssunto(assuntoId) {
  return listarSubassuntos({ assuntoId });
}

export async function criarSubassunto(payload) {
  const nome = (payload.nome || '').trim();
  const disciplinaId = payload.disciplinaId || '';
  const assuntoId = payload.assuntoId || '';
  const nomeNormalizado = normalizarTexto(nome);
  const existente = (await listarSubassuntos({ assuntoId }))
    .find((subassunto) => normalizarTexto(subassunto.nome) === nomeNormalizado);

  if (existente) {
    return existente;
  }

  const now = nowIso();
  const id = payload.id || gerarIdComPrefixo('sub', nome);

  return salvarDocumento('subassuntos', id, {
    id,
    disciplinaId,
    assuntoId,
    nome,
    createdAt: payload.createdAt || now,
    updatedAt: now,
  });
}
