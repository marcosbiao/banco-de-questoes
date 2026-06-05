import { gerarIdComPrefixo, normalizarTexto } from '../../utils/textNormalizer.js';
import { listarColecao, nowIso, salvarDocumento, sortByText } from './firestoreClient.js';

export async function listarDisciplinas() {
  return (await listarColecao('disciplinas')).sort(sortByText('nome'));
}

export async function criarDisciplina(payload) {
  const nome = (payload.nome || '').trim();
  const descricao = (payload.descricao || '').trim();
  const nomeNormalizado = normalizarTexto(nome);
  const existente = (await listarDisciplinas())
    .find((disciplina) => normalizarTexto(disciplina.nome) === nomeNormalizado);

  if (existente) {
    return existente;
  }

  const now = nowIso();
  const id = payload.id || gerarIdComPrefixo('disc', nome);

  return salvarDocumento('disciplinas', id, {
    id,
    nome,
    descricao,
    createdAt: payload.createdAt || now,
    updatedAt: now,
  });
}
