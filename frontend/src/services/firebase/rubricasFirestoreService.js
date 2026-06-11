import { buscarDocumento, excluirDocumento, nowIso, salvarDocumento } from './firestoreClient.js';

function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function requireQuestaoId(questaoId, message = 'Informe o id da questão para excluir a rubrica.') {
  const id = text(questaoId);

  if (!id) {
    throw new Error(message);
  }

  return id;
}

function numberValue(value) {
  const numero = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : 0;
}

function normalizarCriterios(criterios = []) {
  if (!Array.isArray(criterios)) {
    return [];
  }

  return criterios.map((criterio, index) => ({
    id: text(criterio?.id) || `criterio_${index + 1}`,
    nome: text(criterio?.nome),
    descricao: text(criterio?.descricao),
    pontuacao: numberValue(criterio?.pontuacao),
  })).filter((criterio) => criterio.nome && criterio.descricao && criterio.pontuacao > 0);
}

function somaCriterios(criterios = []) {
  return Math.round(criterios.reduce((total, criterio) => total + numberValue(criterio.pontuacao), 0) * 100) / 100;
}

export function normalizarRubricaParaSalvar(rubrica = {}, metadados = {}) {
  const criterios = normalizarCriterios(rubrica.criterios);
  const now = nowIso();

  if (!text(metadados.questaoId)) {
    throw new Error('Informe o id da questão para salvar a rubrica.');
  }

  if (!criterios.length) {
    throw new Error('A rubrica precisa ter pelo menos um critério.');
  }

  if (Math.abs(somaCriterios(criterios) - 10) > 0.001) {
    throw new Error('A soma dos critérios da rubrica deve ser 10 pontos.');
  }

  return {
    questaoId: text(metadados.questaoId),
    tipoQuestao: text(metadados.tipoQuestao),
    competencia: text(metadados.competencia || rubrica.competencia),
    nivelBloom: text(metadados.nivelBloom || rubrica.nivelBloom),
    pontuacaoTotal: 10,
    criterios,
    respostaModelo: text(rubrica.respostaModelo),
    observacoesCorrecao: text(rubrica.observacoesCorrecao),
    geradaPorIA: Boolean(metadados.geradaPorIA ?? true),
    modeloIA: text(metadados.modeloIA || rubrica.modeloIA),
    status: text(metadados.status || rubrica.status || 'aprovada'),
    createdAt: metadados.createdAt || rubrica.createdAt || now,
    updatedAt: now,
  };
}

export async function salvarRubricaQuestao(questaoId, rubrica, statusOrMetadados = {}) {
  const metadados = typeof statusOrMetadados === 'string'
    ? { status: statusOrMetadados }
    : statusOrMetadados;
  const existente = await obterRubricaQuestao(questaoId);
  const payload = normalizarRubricaParaSalvar(rubrica, {
    ...metadados,
    questaoId,
    createdAt: existente?.createdAt,
  });

  return salvarDocumento('rubricas', questaoId, payload);
}

export function obterRubricaQuestao(questaoId) {
  return buscarDocumento('rubricas', questaoId);
}

export async function removerRubricaQuestao(questaoId) {
  const id = requireQuestaoId(questaoId);

  try {
    const rubrica = await buscarDocumento('rubricas', id);

    if (!rubrica) {
      return { removida: false };
    }

    await excluirDocumento('rubricas', id);
    return { removida: true };
  } catch (error) {
    const wrappedError = new Error('Não foi possível excluir a rubrica associada.');
    wrappedError.cause = error;
    throw wrappedError;
  }
}
