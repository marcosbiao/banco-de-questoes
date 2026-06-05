import { gerarIdComPrefixo, normalizarTexto } from '../../utils/textNormalizer.js';
import { listarAssuntos } from './assuntosFirestoreService.js';
import { listarDisciplinas } from './disciplinasFirestoreService.js';
import {
  atualizarDocumento,
  buscarDocumento,
  listarColecao,
  nowIso,
  salvarDocumento,
} from './firestoreClient.js';
import { listarSubassuntos } from './subassuntosFirestoreService.js';
import { garantirTags } from './tagsFirestoreService.js';

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

function optionalId(data, existing, field) {
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
  for (const campo of ['disciplinaId', 'assuntoId', 'subassuntoId', 'tipo', 'dificuldade', 'status', 'nivelBloom']) {
    if (filtros[campo] && (questao[campo] || '') !== filtros[campo]) {
      return false;
    }
  }

  if (!matchesAny(questao.assuntoId, filtros.assuntoIds)) {
    return false;
  }

  if (!matchesAny(questao.subassuntoId, filtros.subassuntoIds)) {
    return false;
  }

  if (filtros.competencia) {
    const competencia = normalizarTexto(filtros.competencia);
    const textoCompetencia = normalizarTexto(questao.competencia || '');

    if (!textoCompetencia.includes(competencia)) {
      return false;
    }
  }

  const tagIds = valuesFromFilter(filtros.tagIds);
  if (!tagIds.every((tagId) => (questao.tagsIds || []).includes(tagId))) {
    return false;
  }

  const search = filtros.search || filtros.busca || '';
  if (search) {
    const busca = normalizarTexto(search);
    const texto = normalizarTexto(`${questao.enunciado || ''} ${(questao.tagsNomes || []).join(' ')}`);

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

  const tagsInput = data.tags || data.tagsNomes || existing.tagsNomes || [];
  const tags = await garantirTags(Array.isArray(tagsInput) ? tagsInput : []);

  return {
    disciplinaId: data.disciplinaId ?? existing.disciplinaId ?? '',
    assuntoId: data.assuntoId ?? existing.assuntoId ?? '',
    subassuntoId: optionalId(data, existing, 'subassuntoId'),
    tipo,
    enunciado: (data.enunciado ?? existing.enunciado ?? '').toString().trim(),
    alternativas,
    respostaCorreta,
    explicacao: (data.explicacao ?? existing.explicacao ?? '').toString().trim(),
    dificuldade: data.dificuldade ?? existing.dificuldade ?? '',
    fonte: (data.fonte ?? existing.fonte ?? '').toString().trim(),
    competencia: (data.competencia ?? existing.competencia ?? '').toString().trim(),
    nivelBloom: data.nivelBloom ?? existing.nivelBloom ?? '',
    tagsIds: tags.ids,
    tagsNomes: tags.nomes,
    observacaoPedagogica: (data.observacaoPedagogica ?? existing.observacaoPedagogica ?? '').toString().trim(),
    status: data.status ?? existing.status ?? 'ativa',
    anexos: Array.isArray(data.anexos ?? existing.anexos) ? (data.anexos ?? existing.anexos) : [],
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

  await atualizarDocumento('questoes', id, {
    ...payload,
    updatedAt: nowIso(),
  });

  return buscarQuestao(id);
}

export async function arquivarQuestao(id) {
  await atualizarDocumento('questoes', id, {
    status: 'arquivada',
    updatedAt: nowIso(),
  });

  return buscarQuestao(id);
}
