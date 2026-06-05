import { gerarIdComPrefixo, normalizarTexto } from '../../utils/textNormalizer.js';
import { listarColecao, nowIso, salvarDocumento, sortByText } from './firestoreClient.js';

export async function listarAssuntos(filtros = {}) {
  return (await listarColecao('assuntos'))
    .filter((assunto) => !filtros.disciplinaId || assunto.disciplinaId === filtros.disciplinaId)
    .sort(sortByText('nome'));
}

export function listarAssuntosPorDisciplina(disciplinaId) {
  return listarAssuntos({ disciplinaId });
}

export async function criarAssunto(payload) {
  const nome = (payload.nome || '').trim();
  const disciplinaId = payload.disciplinaId || '';
  const nomeNormalizado = normalizarTexto(nome);
  const existente = (await listarAssuntos({ disciplinaId }))
    .find((assunto) => normalizarTexto(assunto.nome) === nomeNormalizado);

  if (existente) {
    return existente;
  }

  const now = nowIso();
  const id = payload.id || gerarIdComPrefixo('ass', nome);

  return salvarDocumento('assuntos', id, {
    id,
    disciplinaId,
    nome,
    createdAt: payload.createdAt || now,
    updatedAt: now,
  });
}
