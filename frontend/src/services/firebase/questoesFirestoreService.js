import { normalizarDificuldade } from '../../constants/dificuldades.js';
import { gerarIdComPrefixo, normalizarTags, normalizarTexto } from '../../utils/textNormalizer.js';
import { normalizarImagensQuestao } from '../../utils/questionImages.js';
import { listarAssuntos } from './assuntosFirestoreService.js';
import { listarDisciplinas } from './disciplinasFirestoreService.js';
import {
  atualizarDocumento,
  buscarDocumento,
  excluirDocumento,
  listarColecao,
  nowIso,
  salvarDocumento,
} from './firestoreClient.js';
import { removerImagemQuestaoStorage } from './questaoImagensStorageService.js';
import { removerRubricaQuestao } from './rubricasFirestoreService.js';
import { listarSubassuntos } from './subassuntosFirestoreService.js';
import { garantirTags } from './tagsFirestoreService.js';

function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function requireQuestaoId(id, message = 'Informe o id da questão.') {
  const questaoId = text(id);

  if (!questaoId) {
    throw new Error(message);
  }

  return questaoId;
}

function valuesFromFilter(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function matchesAny(actual, expected) {
  const values = valuesFromFilter(expected);
  return values.length === 0 || values.includes(actual || '');
}

function normalizarAlternativas(alternativas = []) {
  if (!Array.isArray(alternativas)) {
    return [];
  }

  return alternativas
    .filter((alternativa) => alternativa?.texto?.trim())
    .map((alternativa, index) => ({
      id: alternativa.id || String.fromCharCode(97 + index),
      texto: alternativa.texto.trim(),
      correta: Boolean(alternativa.correta),
    }));
}

function pathsRemovidos(existing = [], next = []) {
  const nextPaths = new Set(normalizarImagensQuestao(next).map((imagem) => imagem.path).filter(Boolean));

  return normalizarImagensQuestao(existing)
    .map((imagem) => imagem.path)
    .filter((path) => path && !nextPaths.has(path));
}

async function pathEmUsoPorOutraQuestao(path, questaoId) {
  const questoes = await listarColecao('questoes');

  return questoes.some((questao) => {
    if (questao.id === questaoId) return false;

    return normalizarImagensQuestao(questao.imagens)
      .some((imagem) => imagem.path === path);
  });
}

async function removerImagensStorageSeSeguro(paths = [], questaoId) {
  for (const path of [...new Set(paths)]) {
    try {
      const emUso = await pathEmUsoPorOutraQuestao(path, questaoId);

      if (!emUso) {
        await removerImagemQuestaoStorage(path);
      }
    } catch (error) {
      console.warn('Não foi possível remover imagem do Storage:', error);
    }
  }
}

function optionalId(data, existing, field) {
  if (Object.prototype.hasOwnProperty.call(data, field)) {
    return data[field] ? String(data[field]) : '';
  }

  return existing[field] ? String(existing[field]) : '';
}

function optionalDificuldade(data, existing) {
  if (Object.prototype.hasOwnProperty.call(data, 'dificuldade')) {
    return normalizarDificuldade(data.dificuldade) || null;
  }

  return normalizarDificuldade(existing.dificuldade) || null;
}

function optionalBoolean(data, existing, field, defaultValue = false) {
  if (Object.prototype.hasOwnProperty.call(data, field)) {
    return Boolean(data[field]);
  }

  return Boolean(existing[field] ?? defaultValue);
}

function optionalString(data, existing, field) {
  if (Object.prototype.hasOwnProperty.call(data, field)) {
    return data[field] ? String(data[field]) : '';
  }

  return existing[field] ? String(existing[field]) : '';
}

async function enriquecerQuestoes(questoes) {
  const [disciplinas, assuntos, subassuntos] = await Promise.all([
    listarDisciplinas(),
    listarAssuntos(),
    listarSubassuntos(),
  ]);
  const disciplinasById = new Map(disciplinas.map((item) => [item.id, item]));
  const assuntosById = new Map(assuntos.map((item) => [item.id, item]));
  const subassuntosById = new Map(subassuntos.map((item) => [item.id, item]));

  return questoes.map((questao) => ({
    ...questao,
    disciplina: disciplinasById.get(questao.disciplinaId)?.nome || '',
    assunto: assuntosById.get(questao.assuntoId)?.nome || '',
    subassunto: questao.subassuntoId ? subassuntosById.get(questao.subassuntoId)?.nome || '' : '',
    tags: questao.tagsNomes || [],
  }));
}

function filtrarQuestao(questao, filtros = {}) {
  for (const campo of ['disciplinaId', 'assuntoId', 'subassuntoId', 'tipo', 'status', 'nivelBloom']) {
    if (filtros[campo] && (questao[campo] || '') !== filtros[campo]) {
      return false;
    }
  }

  const dificuldade = normalizarDificuldade(filtros.dificuldade);

  if (dificuldade && questao.dificuldade !== dificuldade) {
    return false;
  }

  if (!matchesAny(questao.assuntoId, filtros.assuntoIds)) {
    return false;
  }

  if (!matchesAny(questao.subassuntoId, filtros.subassuntoIds)) {
    return false;
  }

  if (filtros.competencia) {
    const competencia = String(filtros.competencia).trim().toUpperCase();
    const textoCompetencia = String(questao.competencia || '').trim().toUpperCase();

    if (textoCompetencia !== competencia) {
      return false;
    }
  }

  if (filtros.rubrica === 'com' && questao.temRubrica !== true) {
    return false;
  }

  if (filtros.rubrica === 'sem' && questao.temRubrica === true) {
    return false;
  }

  const tagIds = valuesFromFilter(filtros.tagIds);
  const tagNomesNormalizados = (questao.tagsNomes || questao.tags || []).map((tag) => normalizarTexto(tag));
  if (!tagIds.every((tagId) => (questao.tagsIds || []).includes(tagId) || tagNomesNormalizados.includes(normalizarTexto(tagId)))) {
    return false;
  }

  const search = filtros.search || filtros.busca || '';
  if (search) {
    const busca = normalizarTexto(search);
    const texto = normalizarTexto([
      questao.enunciado,
      questao.assunto,
      questao.subassunto,
      questao.competencia,
      ...(questao.tagsNomes || questao.tags || []),
    ].filter(Boolean).join(' '));

    if (!texto.includes(busca)) {
      return false;
    }
  }

  return true;
}

async function normalizarPayload(data, existing = {}) {
  const tipo = data.tipo || existing.tipo || 'discursiva';
  const alternativas = tipo === 'multipla_escolha' ? normalizarAlternativas(data.alternativas || []) : [];
  const alternativaCorreta = alternativas.find((alternativa) => alternativa.correta);
  let respostaCorreta = (data.respostaCorreta ?? existing.respostaCorreta ?? '').toString().trim();

  if (alternativaCorreta) {
    respostaCorreta = alternativaCorreta.texto;
  }

  if (tipo === 'verdadeiro_falso' && respostaCorreta) {
    respostaCorreta = ['true', 'verdadeiro'].includes(respostaCorreta.toLowerCase()) ? 'verdadeiro' : 'falso';
  }

  const tagsDiretasSemCriar = Boolean(data.tagsNomesSemCriarTags);
  const tagsInput = data.tags || data.tagsNomes || existing.tagsNomes || [];
  const tags = tagsDiretasSemCriar
    ? {
      ids: Array.isArray(data.tagsIds)
        ? data.tagsIds.map((tagId) => String(tagId)).filter(Boolean)
        : Array.isArray(existing.tagsIds) ? existing.tagsIds : [],
      nomes: normalizarTags(Array.isArray(tagsInput) ? tagsInput : []),
    }
    : await garantirTags(Array.isArray(tagsInput) ? tagsInput : []);

  return {
    disciplinaId: data.disciplinaId ?? existing.disciplinaId ?? '',
    assuntoId: data.assuntoId ?? existing.assuntoId ?? '',
    subassuntoId: optionalId(data, existing, 'subassuntoId'),
    tipo,
    textoAntesCodigo: (data.textoAntesCodigo ?? existing.textoAntesCodigo ?? '').toString().trim(),
    codigo: (data.codigo ?? existing.codigo ?? '').toString().trim(),
    enunciado: (data.enunciado ?? existing.enunciado ?? '').toString().trim(),
    alternativas,
    respostaCorreta,
    explicacao: (data.explicacao ?? existing.explicacao ?? '').toString().trim(),
    dificuldade: optionalDificuldade(data, existing),
    fonte: (data.fonte ?? existing.fonte ?? '').toString().trim(),
    competencia: (data.competencia ?? existing.competencia ?? '').toString().trim(),
    nivelBloom: data.nivelBloom ?? existing.nivelBloom ?? '',
    tagsIds: tags.ids,
    tagsNomes: tags.nomes,
    observacaoPedagogica: (data.observacaoPedagogica ?? existing.observacaoPedagogica ?? '').toString().trim(),
    status: data.status ?? existing.status ?? 'ativa',
    imagens: normalizarImagensQuestao(data.imagens ?? existing.imagens ?? []),
    anexos: Array.isArray(data.anexos ?? existing.anexos) ? (data.anexos ?? existing.anexos) : [],
    temRubrica: optionalBoolean(data, existing, 'temRubrica'),
    classificadaPorIA: optionalBoolean(data, existing, 'classificadaPorIA'),
    classificacaoIAStatus: optionalString(data, existing, 'classificacaoIAStatus'),
    classificacaoIAGeradaEm: optionalString(data, existing, 'classificacaoIAGeradaEm'),
    classificacaoIARevisadaEm: optionalString(data, existing, 'classificacaoIARevisadaEm'),
    classificacaoIAModelo: optionalString(data, existing, 'classificacaoIAModelo'),
  };
}

export async function listarQuestoes(filtros = {}) {
  const questoes = await enriquecerQuestoes(await listarColecao('questoes'));
  return questoes.filter((questao) => filtrarQuestao(questao, filtros));
}

export async function buscarQuestao(id) {
  const questao = await buscarDocumento('questoes', id);
  if (!questao) return null;

  return (await enriquecerQuestoes([questao]))[0];
}

export async function criarQuestao(questao) {
  const now = nowIso();
  const id = questao.id || gerarIdComPrefixo('q');
  const payload = await normalizarPayload(questao);

  return buscarQuestao((await salvarDocumento('questoes', id, {
    id,
    ...payload,
    createdAt: questao.createdAt || now,
    updatedAt: now,
  })).id);
}

export async function atualizarQuestao(id, questao) {
  const existing = await buscarDocumento('questoes', id);
  if (!existing) {
    throw new Error('Questão não encontrada.');
  }

  const payload = await normalizarPayload(questao, existing);
  const imagensRemovidasPaths = pathsRemovidos(existing.imagens, payload.imagens);

  await atualizarDocumento('questoes', id, {
    ...payload,
    updatedAt: nowIso(),
  });

  await removerImagensStorageSeSeguro(imagensRemovidasPaths, id);

  return buscarQuestao(id);
}

export async function arquivarQuestao(id) {
  await atualizarDocumento('questoes', id, {
    status: 'arquivada',
    updatedAt: nowIso(),
  });

  return buscarQuestao(id);
}

export async function atualizarMarcadorRubricaQuestao(id, temRubrica) {
  const questaoId = requireQuestaoId(id, 'Informe o id da questão para atualizar o marcador de rubrica.');

  await atualizarDocumento('questoes', questaoId, {
    temRubrica: Boolean(temRubrica),
    updatedAt: nowIso(),
  });

  return buscarQuestao(questaoId);
}

export async function excluirQuestao(id) {
  const questaoId = requireQuestaoId(id, 'Informe o id da questão para excluir.');

  try {
    await excluirDocumento('questoes', questaoId);
    return { message: 'Questão excluída com sucesso.' };
  } catch (error) {
    const wrappedError = new Error('Não foi possível excluir a questão.');
    wrappedError.cause = error;
    throw wrappedError;
  }
}

export async function excluirQuestaoComDependencias(id) {
  const questaoId = requireQuestaoId(id, 'Informe o id da questão para excluir.');

  try {
    await removerRubricaQuestao(questaoId);
  } catch (error) {
    const wrappedError = new Error('Não foi possível excluir a rubrica associada. A questão não foi excluída.');
    wrappedError.cause = error;
    throw wrappedError;
  }

  await excluirQuestao(questaoId);

  return { message: 'Questão excluída com sucesso.' };
}
