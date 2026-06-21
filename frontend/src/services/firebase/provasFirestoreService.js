import {
  calcularResumoSelecao,
  normalizarTiposQuestao,
} from '../../utils/geradorProvaBalanceada.js';
import { gerarIdComPrefixo } from '../../utils/textNormalizer.js';
import {
  atualizarDocumento,
  buscarDocumento,
  excluirDocumento,
  listarColecao,
  nowIso,
  salvarDocumento,
} from './firestoreClient.js';
import { obterRubricaQuestao } from './rubricasFirestoreService.js';

function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function requireProvaId(id, message = 'Informe o id da prova.') {
  const provaId = text(id);

  if (!provaId) {
    throw new Error(message);
  }

  return provaId;
}

function numberValue(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const numero = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isFinite(numero) ? numero : fallback;
}

function arrayValue(value) {
  return Array.isArray(value) ? value.filter((item) => item !== undefined && item !== null) : [];
}

function normalizarQuotasDificuldade(quotas = {}) {
  return ['1', '2', '3', '4', '5'].reduce((acc, dificuldade) => {
    acc[dificuldade] = Math.max(0, Math.trunc(numberValue(quotas[dificuldade] ?? quotas[Number(dificuldade)], 0)));
    return acc;
  }, {});
}

function normalizarQuotasCompetencia(quotas = {}) {
  return Object.fromEntries(
    Object.entries(quotas)
      .map(([competencia, quantidade]) => [
        text(competencia).toUpperCase(),
        Math.max(0, Math.trunc(numberValue(quantidade, 0))),
      ])
      .filter(([competencia, quantidade]) => competencia && quantidade > 0),
  );
}

function normalizarFiltros(filtros = {}) {
  return {
    assuntoId: text(filtros.assuntoId),
    subassuntoId: text(filtros.subassuntoId),
    tipos: normalizarTiposQuestao(filtros.tipos),
    niveisBloom: arrayValue(filtros.niveisBloom).map(text).filter(Boolean),
    tagsIds: arrayValue(filtros.tagsIds || filtros.tagIds).map(text).filter(Boolean),
    somenteComRubrica: Boolean(filtros.somenteComRubrica),
    somenteAtivas: filtros.somenteAtivas !== false,
  };
}

function snapshotQuestao(questao = {}) {
  const source = questao.questaoSnapshot || questao;

  return {
    tipo: text(source.tipo),
    enunciado: text(source.enunciado),
    textoAntesCodigo: text(source.textoAntesCodigo),
    codigo: text(source.codigo),
    alternativas: arrayValue(source.alternativas).map((alternativa) => ({
      id: text(alternativa?.id),
      texto: text(alternativa?.texto),
      correta: Boolean(alternativa?.correta),
    })),
    disciplinaId: text(source.disciplinaId || questao.disciplinaId),
    disciplinaNome: text(source.disciplinaNome || source.disciplina || questao.disciplina),
    assuntoId: text(source.assuntoId),
    assuntoNome: text(source.assuntoNome || source.assunto),
    subassuntoId: text(source.subassuntoId),
    subassuntoNome: text(source.subassuntoNome || source.subassunto),
    dificuldade: numberValue(source.dificuldade, null),
    competencia: text(source.competencia).toUpperCase(),
    nivelBloom: text(source.nivelBloom),
    tagsNomes: arrayValue(source.tagsNomes || source.tags).map(text).filter(Boolean),
    tagsIds: arrayValue(source.tagsIds).map(text).filter(Boolean),
    status: text(source.status || 'ativa'),
    temRubrica: source.temRubrica === true,
    imagens: arrayValue(source.imagens),
    anexos: arrayValue(source.anexos),
    fonte: text(source.fonte),
  };
}

function snapshotGabarito(questao = {}) {
  const source = questao.gabaritoSnapshot || questao;

  return {
    respostaCorreta: text(source.respostaCorreta),
    explicacao: text(source.explicacao),
    observacaoPedagogica: text(source.observacaoPedagogica),
  };
}

async function montarRubricaSnapshot(questao, somenteComRubrica) {
  if (Object.prototype.hasOwnProperty.call(questao, 'rubricaSnapshot')) {
    if (somenteComRubrica && questao.temRubrica === true && !questao.rubricaSnapshot) {
      throw new Error(`A questão "${questao.enunciado || questao.id}" exige rubrica, mas o snapshot salvo está vazio.`);
    }

    return questao.rubricaSnapshot || null;
  }

  if (questao.temRubrica !== true) {
    return null;
  }

  const rubrica = await obterRubricaQuestao(questao.id || questao.questaoId);

  if (!rubrica) {
    if (somenteComRubrica) {
      throw new Error(`A questão "${questao.enunciado || questao.id}" está marcada com rubrica, mas o documento rubricas/${questao.id || questao.questaoId} não foi encontrado.`);
    }

    console.warn('Rubrica indicada não encontrada para a questão:', questao.id || questao.questaoId);
    return null;
  }

  return rubrica;
}

async function montarItensProva(questoes = [], configuracao = {}) {
  const somenteComRubrica = Boolean(configuracao.filtros?.somenteComRubrica);
  const itens = [];

  for (const [index, questao] of questoes.entries()) {
    const questaoSnapshot = snapshotQuestao(questao);
    const rubricaSnapshot = await montarRubricaSnapshot(questao, somenteComRubrica);

    itens.push({
      ordem: index + 1,
      questaoId: text(questao.id || questao.questaoId),
      questaoSnapshot,
      gabaritoSnapshot: snapshotGabarito(questao),
      rubricaSnapshot,
    });
  }

  return itens;
}

function questoesFromItens(itens = []) {
  return itens.map((item) => ({
    id: item.questaoId,
    ...item.questaoSnapshot,
    ...item.gabaritoSnapshot,
    temRubrica: item.rubricaSnapshot ? true : item.questaoSnapshot?.temRubrica === true,
  }));
}

function normalizarConfiguracao(payload = {}) {
  const configuracao = payload.configuracao || payload;

  return {
    totalQuestoes: Math.max(0, Math.trunc(numberValue(configuracao.totalQuestoes, 0))),
    quotasDificuldade: normalizarQuotasDificuldade(configuracao.quotasDificuldade),
    quotasCompetencia: normalizarQuotasCompetencia(configuracao.quotasCompetencia),
    filtros: normalizarFiltros(configuracao.filtros),
    seed: text(configuracao.seed),
  };
}

async function normalizarProvaParaSalvar(payload = {}, existing = {}) {
  const configuracao = normalizarConfiguracao(payload.configuracao || payload);
  const questoesSelecionadas = arrayValue(payload.questoesSelecionadas);
  const itens = questoesSelecionadas.length
    ? await montarItensProva(questoesSelecionadas, configuracao)
    : arrayValue(payload.itens || existing.itens);
  const resumo = payload.resumo || calcularResumoSelecao(questoesFromItens(itens));

  return {
    titulo: text(payload.titulo) || text(existing.titulo) || 'Prova sem título',
    descricao: text(payload.descricao ?? existing.descricao),
    disciplinaId: text(payload.disciplinaId || existing.disciplinaId),
    disciplinaNome: text(payload.disciplinaNome || existing.disciplinaNome),
    status: text(payload.status || existing.status || 'rascunho'),
    tipoGeracao: 'balanceada',
    configuracao,
    itens,
    resumo,
  };
}

export async function criarProva(payload) {
  const now = nowIso();
  const id = payload.id || gerarIdComPrefixo('prova', payload.titulo || 'prova');
  const prova = await normalizarProvaParaSalvar(payload);

  await salvarDocumento('provas', id, {
    id,
    ...prova,
    createdAt: payload.createdAt || now,
    updatedAt: now,
  });

  return obterProva(id);
}

export async function atualizarProva(id, payload) {
  const provaId = requireProvaId(id, 'Informe o id da prova para atualizar.');
  const existing = await buscarDocumento('provas', provaId);

  if (!existing) {
    throw new Error('Prova não encontrada ou removida.');
  }

  const prova = await normalizarProvaParaSalvar({ ...existing, ...payload }, existing);

  await atualizarDocumento('provas', provaId, {
    ...prova,
    updatedAt: nowIso(),
  });

  return obterProva(provaId);
}

export async function obterProva(id) {
  const provaId = requireProvaId(id);
  const prova = await buscarDocumento('provas', provaId);

  if (!prova) {
    throw new Error('Prova não encontrada ou removida.');
  }

  return prova;
}

export async function listarProvas(filtros = {}) {
  return (await listarColecao('provas'))
    .filter((prova) => !filtros.status || (prova.status || 'rascunho') === filtros.status)
    .filter((prova) => !filtros.search || text(prova.titulo).toLowerCase().includes(text(filtros.search).toLowerCase()))
    .map((prova) => ({
      ...prova,
      totalQuestoes: prova.configuracao?.totalQuestoes || prova.itens?.length || 0,
      totalItens: prova.itens?.length || 0,
    }))
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
}

export async function arquivarProva(id) {
  const provaId = requireProvaId(id, 'Informe o id da prova para arquivar.');

  await atualizarDocumento('provas', provaId, {
    status: 'arquivada',
    updatedAt: nowIso(),
  });

  return obterProva(provaId);
}

export async function excluirProva(id) {
  const provaId = requireProvaId(id, 'Informe o id da prova para excluir.');

  try {
    await excluirDocumento('provas', provaId);
    return { message: 'Prova excluída com sucesso.' };
  } catch (error) {
    const wrappedError = new Error('Não foi possível excluir a prova.');
    wrappedError.cause = error;
    throw wrappedError;
  }
}
