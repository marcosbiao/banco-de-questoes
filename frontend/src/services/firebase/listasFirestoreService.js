import { gerarIdComPrefixo } from '../../utils/textNormalizer.js';
import {
  atualizarDocumento,
  buscarDocumento,
  excluirDocumento,
  listarColecao,
  nowIso,
  salvarDocumento,
} from './firestoreClient.js';
import { listarQuestoes } from './questoesFirestoreService.js';

function idsFrom(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function hasFilterValue(value) {
  return Array.isArray(value) ? value.filter(Boolean).length > 0 : Boolean(value?.toString().trim());
}

function blocoTemFiltro(bloco) {
  const filtros = bloco.filtros || {};

  return [
    filtros.disciplinaId,
    filtros.assuntoIds,
    filtros.subassuntoIds,
    filtros.tagIds,
    filtros.tipo,
    filtros.dificuldade,
    filtros.competencia,
    filtros.nivelBloom,
    filtros.search,
  ].some(hasFilterValue);
}

function normalizarCabecalho(cabecalho) {
  if (!cabecalho || typeof cabecalho !== 'object') {
    return {
      instituicao: '',
      curso: '',
      disciplinaTexto: '',
      professor: '',
      turma: '',
      data: '',
      tituloExibicao: cabecalho?.toString?.() || '',
    };
  }

  return {
    instituicao: cabecalho.instituicao || '',
    curso: cabecalho.curso || '',
    disciplinaTexto: cabecalho.disciplinaTexto || '',
    professor: cabecalho.professor || '',
    turma: cabecalho.turma || '',
    data: cabecalho.data || '',
    tituloExibicao: cabecalho.tituloExibicao || '',
  };
}

function questoesSelecionadasFrom(blocos) {
  return blocos.flatMap((bloco) => [
    ...(bloco.questoesIds || []).map((questaoId, index) => ({
      blocoId: bloco.id,
      questaoId,
      ordem: index + 1,
      removida: false,
      origemAutomatica: true,
    })),
    ...(bloco.questoesRemovidasIds || []).map((questaoId) => ({
      blocoId: bloco.id,
      questaoId,
      ordem: null,
      removida: true,
      origemAutomatica: true,
    })),
  ]);
}

async function completeBlocos(blocos = []) {
  const questoes = await listarQuestoes({});
  const questoesById = new Map(questoes.map((questao) => [questao.id, questao]));

  return blocos
    .slice()
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
    .map((bloco, index) => {
      const questoesCompletas = (bloco.questoesIds || bloco.questoes?.map((questao) => questao.id) || [])
        .map((questaoId) => questoesById.get(questaoId))
        .filter(Boolean);

      return {
        ...bloco,
        ordem: index + 1,
        questoes: questoesCompletas,
        questoesIds: questoesCompletas.map((questao) => questao.id),
      };
    });
}

function normalizarBlocoParaSalvar(bloco, index) {
  const questoesIds = [
    ...(bloco.questoes || []).map((questao) => questao.id),
    ...(bloco.questoesIds || []),
  ].filter(Boolean);

  return {
    id: bloco.id || gerarIdComPrefixo('bloco'),
    ordem: index + 1,
    tituloBloco: bloco.tituloBloco || bloco.titulo || `Bloco ${index + 1}`,
    filtros: {
      disciplinaId: bloco.filtros?.disciplinaId || '',
      assuntoIds: idsFrom(bloco.filtros?.assuntoIds),
      subassuntoIds: idsFrom(bloco.filtros?.subassuntoIds),
      tagIds: idsFrom(bloco.filtros?.tagIds),
      tipo: bloco.filtros?.tipo || '',
      dificuldade: bloco.filtros?.dificuldade || '',
      competencia: bloco.filtros?.competencia || '',
      nivelBloom: bloco.filtros?.nivelBloom || '',
      search: bloco.filtros?.search || '',
    },
    questoesIds: [...new Set(questoesIds)],
    questoesRemovidasIds: idsFrom(bloco.questoesRemovidasIds),
    duplicadasIgnoradasIds: idsFrom(bloco.duplicadasIgnoradasIds),
    totalEncontradas: Number(bloco.totalEncontradas || 0),
    totalSelecionadas: Number(bloco.totalSelecionadas || questoesIds.length || 0),
    totalDuplicadasIgnoradas: Number(bloco.totalDuplicadasIgnoradas || idsFrom(bloco.duplicadasIgnoradasIds).length || 0),
    createdAt: bloco.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

function normalizarListaParaSalvar(payload) {
  const blocos = (payload.blocos || [])
    .slice()
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
    .map(normalizarBlocoParaSalvar);

  return {
    titulo: payload.titulo || 'Lista de exercícios',
    cabecalho: normalizarCabecalho(payload.cabecalho),
    instrucoes: payload.instrucoes || '',
    incluirGabarito: Boolean(payload.incluirGabarito),
    status: payload.status || 'ativa',
    blocos,
    questoesSelecionadas: payload.questoesSelecionadas || questoesSelecionadasFrom(blocos),
    duplicadasIgnoradasTotal: Number(payload.duplicadasIgnoradasTotal || blocos.reduce((total, bloco) => total + (bloco.duplicadasIgnoradasIds || []).length, 0)),
  };
}

export async function montarLista(payload) {
  const seen = new Set();
  const blocos = [];

  for (const [index, bloco] of (payload.blocos || []).slice().sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)).entries()) {
    if (!blocoTemFiltro(bloco)) {
      throw new Error('Selecione pelo menos um filtro para montar este bloco.');
    }

    const filtros = bloco.filtros || {};
    const removidas = idsFrom(bloco.questoesRemovidasIds);
    const questoes = await listarQuestoes({
      ...filtros,
      assuntoIds: idsFrom(filtros.assuntoIds),
      subassuntoIds: idsFrom(filtros.subassuntoIds),
      tagIds: idsFrom(filtros.tagIds),
      status: 'ativa',
    });
    const selecionadas = [];
    const duplicadas = [];
    const removidasEncontradas = [];

    for (const questao of questoes) {
      if (seen.has(questao.id)) {
        duplicadas.push(questao.id);
        continue;
      }

      seen.add(questao.id);

      if (removidas.includes(questao.id)) {
        removidasEncontradas.push(questao.id);
        continue;
      }

      selecionadas.push(questao);
    }

    blocos.push({
      id: bloco.id || gerarIdComPrefixo('bloco'),
      ordem: index + 1,
      tituloBloco: bloco.tituloBloco || bloco.titulo || `Bloco ${index + 1}`,
      filtros: {
        disciplinaId: filtros.disciplinaId || '',
        assuntoIds: idsFrom(filtros.assuntoIds),
        subassuntoIds: idsFrom(filtros.subassuntoIds),
        tagIds: idsFrom(filtros.tagIds),
        tipo: filtros.tipo || '',
        dificuldade: filtros.dificuldade || '',
        competencia: filtros.competencia || '',
        nivelBloom: filtros.nivelBloom || '',
        search: filtros.search || '',
      },
      questoesIds: selecionadas.map((questao) => questao.id),
      questoesRemovidasIds: [...new Set([...removidas, ...removidasEncontradas])],
      duplicadasIgnoradasIds: [...new Set(duplicadas)],
      questoes: selecionadas,
      totalEncontradas: questoes.length,
      totalSelecionadas: selecionadas.length,
      totalDuplicadasIgnoradas: duplicadas.length,
      createdAt: bloco.createdAt || nowIso(),
      updatedAt: nowIso(),
    });
  }

  return {
    id: payload.id || null,
    titulo: payload.titulo || 'Lista de exercícios',
    cabecalho: normalizarCabecalho(payload.cabecalho),
    instrucoes: payload.instrucoes || '',
    incluirGabarito: Boolean(payload.incluirGabarito),
    status: payload.status || 'ativa',
    blocos,
    questoesSelecionadas: questoesSelecionadasFrom(blocos),
    duplicadasIgnoradasTotal: blocos.reduce((total, bloco) => total + bloco.totalDuplicadasIgnoradas, 0),
  };
}

export function gerarLista(payload) {
  return montarLista(payload);
}

export async function getListas(filtros = {}) {
  return (await listarColecao('listas'))
    .filter((lista) => !filtros.status || (lista.status || 'ativa') === filtros.status)
    .filter((lista) => !filtros.search || (lista.titulo || '').toLowerCase().includes(filtros.search.toLowerCase()))
    .map((lista) => ({
      ...lista,
      totalBlocos: (lista.blocos || []).length,
      totalQuestoes: (lista.blocos || []).reduce((total, bloco) => total + (bloco.questoesIds || bloco.questoes || []).length, 0),
    }))
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export async function getListaPreview(id) {
  const lista = await buscarDocumento('listas', id);

  if (!lista) {
    throw new Error('Lista não encontrada.');
  }

  return {
    ...lista,
    cabecalho: normalizarCabecalho(lista.cabecalho),
    blocos: await completeBlocos(lista.blocos || []),
  };
}

export function getListaById(id) {
  return getListaPreview(id);
}

export async function createLista(payload) {
  const now = nowIso();
  const id = payload.id || gerarIdComPrefixo('lista', payload.titulo || 'lista');
  const lista = normalizarListaParaSalvar(payload);

  await salvarDocumento('listas', id, {
    id,
    ...lista,
    createdAt: payload.createdAt || now,
    updatedAt: now,
  });

  return getListaPreview(id);
}

export async function updateLista(id, payload) {
  const existing = await buscarDocumento('listas', id);

  if (!existing) {
    throw new Error('Lista não encontrada.');
  }

  const lista = normalizarListaParaSalvar({ ...existing, ...payload });

  await atualizarDocumento('listas', id, {
    ...lista,
    updatedAt: nowIso(),
  });

  return getListaPreview(id);
}

export async function arquivarLista(id) {
  await atualizarDocumento('listas', id, {
    status: 'arquivada',
    updatedAt: nowIso(),
  });

  return buscarDocumento('listas', id);
}

export async function deleteLista(id) {
  await excluirDocumento('listas', id);
  return { message: 'Lista excluída com sucesso.' };
}
