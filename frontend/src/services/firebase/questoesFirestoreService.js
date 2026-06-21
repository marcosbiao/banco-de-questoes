import {
  collection,
  getDocs,
  limit,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { normalizarDificuldade } from '../../constants/dificuldades.js';
import {
  clonarFiltrosQuestao,
  possuiFiltroBuscaValido,
  questaoCorrespondeAosFiltros,
  valuesFromFilter,
} from '../../utils/questoesFiltros.js';
import { gerarIdComPrefixo, normalizarTags, normalizarTextoBusca } from '../../utils/textNormalizer.js';
import { normalizarImagensQuestao } from '../../utils/questionImages.js';
import { listarAssuntos } from './assuntosFirestoreService.js';
import { listarDisciplinas } from './disciplinasFirestoreService.js';
import {
  atualizarDocumento,
  buscarDocumento,
  excluirDocumento,
  listarColecao,
  nowIso,
  requireDb,
  salvarDocumento,
} from './firestoreClient.js';
import { removerImagemQuestaoStorage } from './questaoImagensStorageService.js';
import { removerRubricaQuestao } from './rubricasFirestoreService.js';
import { listarSubassuntos } from './subassuntosFirestoreService.js';
import { garantirTags } from './tagsFirestoreService.js';
import { obterOuCriarFonte } from './fontesFirestoreService.js';

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

  return enriquecerQuestoesComMetadados(questoes, { disciplinas, assuntos, subassuntos });
}

function enriquecerQuestoesComMetadados(questoes, metadados = {}) {
  const disciplinas = metadados.disciplinas || [];
  const assuntos = metadados.assuntos || [];
  const subassuntos = metadados.subassuntos || [];
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
  const fonte = (data.fonte ?? existing.fonte ?? '').toString().trim();
  const fonteCatalogo = fonte ? await obterOuCriarFonte(fonte) : null;
  const fonteBusca = fonteCatalogo?.nomeBusca || normalizarTextoBusca(fonte);

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
    fonteId: fonteCatalogo?.id || '',
    fonte,
    fonteBusca,
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
  return questoes.filter((questao) => questaoCorrespondeAosFiltros(questao, filtros));
}

function adicionarFiltroIgualdade(restricoes, field, value) {
  const filtro = text(value);

  if (filtro) {
    restricoes.push(where(field, '==', filtro));
  }
}

function montarRestricoesBusca(filtros = {}) {
  const restricoes = [];
  const dificuldade = normalizarDificuldade(filtros.dificuldade);
  const tagIds = valuesFromFilter(filtros.tagIds);
  const rubrica = filtros.rubrica || 'todas';

  adicionarFiltroIgualdade(restricoes, 'disciplinaId', filtros.disciplinaId);
  adicionarFiltroIgualdade(restricoes, 'assuntoId', filtros.assuntoId);
  adicionarFiltroIgualdade(restricoes, 'subassuntoId', filtros.subassuntoId);
  adicionarFiltroIgualdade(restricoes, 'tipo', filtros.tipo);
  adicionarFiltroIgualdade(restricoes, 'competencia', filtros.competencia);
  adicionarFiltroIgualdade(restricoes, 'nivelBloom', filtros.nivelBloom);
  adicionarFiltroIgualdade(restricoes, 'status', filtros.status);
  adicionarFiltroIgualdade(restricoes, 'fonteId', filtros.fonteId);

  if (dificuldade) {
    restricoes.push(where('dificuldade', '==', dificuldade));
  }

  if (rubrica === 'com') {
    restricoes.push(where('temRubrica', '==', true));
  }

  if (rubrica === 'sem') {
    restricoes.push(where('temRubrica', '==', false));
  }

  if (tagIds.length) {
    // O Firestore permite apenas um array-contains por query. A regra da interface
    // continua sendo AND para tags: a primeira tag reduz a leitura e as demais
    // são conferidas localmente somente sobre essa página reduzida.
    restricoes.push(where('tagsIds', 'array-contains', tagIds[0]));
  }

  return restricoes;
}

function isMissingIndexError(error) {
  return error?.code === 'failed-precondition' || /index/i.test(error?.message || '');
}

export async function buscarQuestoesComFiltros(filtros = {}, opcoes = {}) {
  if (!possuiFiltroBuscaValido(filtros)) {
    throw new Error('Selecione pelo menos um filtro para realizar a busca.');
  }

  const db = requireDb();
  const limite = Number.isInteger(opcoes.limite) && opcoes.limite > 0 ? opcoes.limite : 20;
  const filtrosNormalizados = clonarFiltrosQuestao(filtros);
  const restricoes = montarRestricoesBusca(filtrosNormalizados);
  const queryConstraints = [
    ...restricoes,
    ...(opcoes.ultimoDocumento ? [startAfter(opcoes.ultimoDocumento)] : []),
    limit(limite),
  ];

  try {
    if (import.meta.env.DEV) {
      console.info('[Banco de questões] Consulta Firestore em questoes executada.', {
        filtros: filtrosNormalizados,
        limite,
        paginaSeguinte: Boolean(opcoes.ultimoDocumento),
      });
    }

    const snapshot = await getDocs(query(collection(db, 'questoes'), ...queryConstraints));
    const documentos = snapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    }));
    const questoesEnriquecidas = enriquecerQuestoesComMetadados(documentos, opcoes.metadados);
    const questoesFiltradas = questoesEnriquecidas.filter((questao) => (
      questaoCorrespondeAosFiltros(questao, filtrosNormalizados)
    ));
    const ultimoDocumento = snapshot.docs[snapshot.docs.length - 1] || null;

    return {
      questoes: questoesFiltradas,
      ultimoDocumento,
      temMaisResultados: snapshot.docs.length === limite,
      quantidadeLida: snapshot.docs.length,
      filtros: filtrosNormalizados,
    };
  } catch (error) {
    if (isMissingIndexError(error)) {
      console.error('Erro de índice do Firestore ao buscar questões. Use o link de criação indicado pelo Firebase:', error);
      const wrappedError = new Error('Esta combinação de filtros precisa de um índice adicional no Firestore.');
      wrappedError.code = 'missing-index';
      wrappedError.cause = error;
      throw wrappedError;
    }

    throw error;
  }
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
