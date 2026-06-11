import { normalizarDificuldade } from '../../constants/dificuldades.js';
import { ordenarQuestoesDoBloco } from '../../utils/ordenacaoQuestoes.js';
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

function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function requireListaId(id, message = 'Informe o id da lista.') {
  const listaId = text(id);

  if (!listaId) {
    throw new Error(message);
  }

  return listaId;
}

function requireQuestaoId(id, message = 'Informe o id da questão.') {
  const questaoId = text(id);

  if (!questaoId) {
    throw new Error(message);
  }

  return questaoId;
}

function idsFrom(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function questaoIdsFromBloco(bloco = {}) {
  return [
    ...idsFrom(bloco.questoesIds),
    ...(Array.isArray(bloco.questoes)
      ? bloco.questoes.map((questao) => (typeof questao === 'string' ? questao : questao?.id)).filter(Boolean)
      : []),
  ].map((id) => String(id));
}

function listaUsaQuestao(lista = {}, questaoId) {
  const blocos = Array.isArray(lista.blocos) ? lista.blocos : [];

  if (blocos.some((bloco) => questaoIdsFromBloco(bloco).includes(questaoId))) {
    return true;
  }

  return (lista.questoesSelecionadas || []).some((item) => (
    String(item?.questaoId || '') === questaoId && item?.removida !== true
  ));
}

function totalQuestoesLista(lista = {}) {
  return (lista.blocos || []).reduce((total, bloco) => {
    const questoesIds = [...new Set(questaoIdsFromBloco(bloco))];
    return total + questoesIds.length;
  }, 0);
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
      const questoesIds = bloco.questoesIds || (bloco.questoes || [])
        .map((questao) => questao?.id)
        .filter(Boolean);
      const questoesCompletas = questoesIds
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
      dificuldade: normalizarDificuldade(bloco.filtros?.dificuldade) || '',
      competencia: bloco.filtros?.competencia || '',
      nivelBloom: bloco.filtros?.nivelBloom || '',
      status: bloco.filtros?.status || '',
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
    const filtros = bloco.filtros || {};
    const dificuldade = normalizarDificuldade(filtros.dificuldade);
    const removidas = idsFrom(bloco.questoesRemovidasIds);
    const questoes = await listarQuestoes({
      ...filtros,
      assuntoIds: idsFrom(filtros.assuntoIds),
      subassuntoIds: idsFrom(filtros.subassuntoIds),
      tagIds: idsFrom(filtros.tagIds),
      dificuldade,
      status: filtros.status ?? 'ativa',
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

    const selecionadasOrdenadas = ordenarQuestoesDoBloco(selecionadas, {
      ...bloco,
      filtros,
    });

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
        dificuldade: dificuldade || '',
        competencia: filtros.competencia || '',
        nivelBloom: filtros.nivelBloom || '',
        status: filtros.status || '',
        search: filtros.search || '',
      },
      questoesIds: selecionadasOrdenadas.map((questao) => questao.id),
      questoesRemovidasIds: [...new Set([...removidas, ...removidasEncontradas])],
      duplicadasIgnoradasIds: [...new Set(duplicadas)],
      questoes: selecionadasOrdenadas,
      totalEncontradas: questoes.length,
      totalSelecionadas: selecionadasOrdenadas.length,
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

export async function listarListasPorQuestao(questaoId) {
  const id = requireQuestaoId(questaoId, 'Informe o id da questão para verificar listas vinculadas.');
  const listas = await listarColecao('listas');

  return listas
    .filter((lista) => listaUsaQuestao(lista, id))
    .map((lista) => ({
      id: lista.id,
      titulo: text(lista.titulo) || 'Lista sem título',
      status: lista.status || 'ativa',
      quantidadeQuestoes: totalQuestoesLista(lista),
    }))
    .sort((a, b) => String(a.titulo).localeCompare(String(b.titulo), 'pt-BR', {
      sensitivity: 'base',
    }));
}

export async function getListaPreview(id) {
  const lista = await buscarDocumento('listas', id);

  if (!lista) {
    throw new Error('Lista não encontrada ou removida.');
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
    throw new Error('Lista não encontrada ou removida.');
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

export async function excluirLista(id) {
  const listaId = requireListaId(id, 'Informe o id da lista para excluir.');

  try {
    await excluirDocumento('listas', listaId);
    return { message: 'Lista excluída com sucesso.' };
  } catch (error) {
    const wrappedError = new Error('Não foi possível excluir a lista.');
    wrappedError.cause = error;
    throw wrappedError;
  }
}

export function deleteLista(id) {
  return excluirLista(id);
}
