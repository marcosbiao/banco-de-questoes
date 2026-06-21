import { normalizarDificuldade } from '../constants/dificuldades.js';
import { normalizarTexto } from './textNormalizer.js';

export function valuesFromFilter(value) {
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

function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function possuiFiltroBuscaValido(filtros = {}) {
  const tagIds = valuesFromFilter(filtros.tagIds);
  const rubrica = filtros.rubrica || 'todas';

  return Boolean(
    text(filtros.disciplinaId)
    || text(filtros.assuntoId)
    || text(filtros.subassuntoId)
    || text(filtros.tipo)
    || normalizarDificuldade(filtros.dificuldade)
    || text(filtros.competencia)
    || text(filtros.nivelBloom)
    || text(filtros.status)
    || text(filtros.fonteId)
    || rubrica !== 'todas'
    || tagIds.length,
  );
}

export function possuiBuscaTextualSemFiltroConsultavel(filtros = {}) {
  return Boolean(text(filtros.search || filtros.busca) && !possuiFiltroBuscaValido(filtros));
}

export function clonarFiltrosQuestao(filtros = {}) {
  return {
    ...filtros,
    tagIds: valuesFromFilter(filtros.tagIds),
    dificuldade: normalizarDificuldade(filtros.dificuldade),
    rubrica: filtros.rubrica || 'todas',
    fonteId: text(filtros.fonteId),
  };
}

export function questaoCorrespondeAosFiltros(questao, filtros = {}) {
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

  if (filtros.fonteId && (questao.fonteId || '') !== filtros.fonteId) {
    return false;
  }

  const search = filtros.search || filtros.busca || '';
  if (search) {
    const busca = normalizarTexto(search);
    const textoQuestao = normalizarTexto([
      questao.enunciado,
      questao.assunto,
      questao.subassunto,
      questao.competencia,
      ...(questao.tagsNomes || questao.tags || []),
    ].filter(Boolean).join(' '));

    if (!textoQuestao.includes(busca)) {
      return false;
    }
  }

  return true;
}
