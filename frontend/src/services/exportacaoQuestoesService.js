import { obterRubricaQuestao } from './firebase/rubricasFirestoreService.js';

function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function serializeValue(value) {
  if (value === undefined || value === null) return '';

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object' && Number.isFinite(value.seconds)) {
    return new Date(value.seconds * 1000).toISOString();
  }

  return value;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function dataArquivo(date = new Date()) {
  return date.toISOString().slice(0, 16).replace('T', '-').replace(':', '-');
}

export function normalizarQuestaoParaExportacao(questao = {}) {
  return {
    id: text(questao.id),
    disciplina: text(questao.disciplina),
    disciplinaId: text(questao.disciplinaId),
    assunto: text(questao.assunto),
    assuntoId: text(questao.assuntoId),
    subassunto: text(questao.subassunto),
    subassuntoId: text(questao.subassuntoId),
    tipo: text(questao.tipo),
    enunciado: text(questao.enunciado),
    textoAntesCodigo: text(questao.textoAntesCodigo),
    codigo: text(questao.codigo),
    alternativas: safeArray(questao.alternativas).map((alternativa, index) => ({
      id: text(alternativa?.id) || String.fromCharCode(65 + index),
      texto: text(alternativa?.texto),
      correta: Boolean(alternativa?.correta),
    })),
    respostaCorreta: text(questao.respostaCorreta),
    explicacao: text(questao.explicacao),
    observacaoPedagogica: text(questao.observacaoPedagogica),
    dificuldade: questao.dificuldade || '',
    fonte: text(questao.fonte),
    competencia: text(questao.competencia),
    nivelBloom: text(questao.nivelBloom),
    tagsNomes: safeArray(questao.tagsNomes || questao.tags).map((tag) => text(tag)).filter(Boolean),
    status: text(questao.status || 'ativa'),
    temRubrica: questao.temRubrica === true,
    createdAt: serializeValue(questao.createdAt),
    updatedAt: serializeValue(questao.updatedAt),
  };
}

export function normalizarRubricaParaExportacao(rubrica) {
  if (!rubrica) return null;

  return {
    pontuacaoTotal: rubrica.pontuacaoTotal || 10,
    criterios: safeArray(rubrica.criterios).map((criterio) => ({
      nome: text(criterio?.nome),
      descricao: text(criterio?.descricao),
      pontuacao: criterio?.pontuacao || 0,
    })),
    respostaModelo: text(rubrica.respostaModelo),
    observacoesCorrecao: text(rubrica.observacoesCorrecao),
    status: text(rubrica.status || 'aprovada'),
  };
}

export function montarFiltrosAplicadosExportacao(filtros = {}, opcoes = {}) {
  const disciplina = safeArray(opcoes.disciplinas).find((item) => item.id === filtros.disciplinaId);
  const assunto = safeArray(opcoes.assuntos).find((item) => item.id === filtros.assuntoId);
  const subassunto = safeArray(opcoes.subassuntos).find((item) => item.id === filtros.subassuntoId);
  const fonte = safeArray(opcoes.fontes).find((item) => item.id === filtros.fonteId);
  const tagIds = safeArray(filtros.tagIds);
  const tags = tagIds.map((tagId) => safeArray(opcoes.tags).find((tag) => tag.id === tagId)?.nome || tagId);

  return {
    disciplina: disciplina?.nome || '',
    disciplinaId: filtros.disciplinaId || '',
    assunto: assunto?.nome || '',
    assuntoId: filtros.assuntoId || '',
    subassunto: subassunto?.nome || '',
    subassuntoId: filtros.subassuntoId || '',
    dificuldade: filtros.dificuldade || '',
    competencia: filtros.competencia || '',
    rubrica: filtros.rubrica || 'todas',
    status: filtros.status || '',
    tipo: filtros.tipo || '',
    fonte: fonte?.nome || '',
    fonteId: filtros.fonteId || '',
    tags,
    busca: filtros.search || '',
  };
}

export function montarExportacaoQuestoes(questoes = [], options = {}) {
  return {
    tipo: 'exportacao_questoes_filtradas',
    versao: 1,
    geradoEm: new Date().toISOString(),
    incluiRubricas: false,
    totalQuestoes: questoes.length,
    filtrosAplicados: options.filtrosAplicados || undefined,
    questoes: questoes.map(normalizarQuestaoParaExportacao),
  };
}

export async function montarExportacaoQuestoesComRubricas(questoes = [], options = {}) {
  const avisos = [];
  let totalRubricas = 0;
  const questoesExportadas = [];

  for (const questao of questoes) {
    const questaoExportada = normalizarQuestaoParaExportacao(questao);

    try {
      const rubrica = await obterRubricaQuestao(questao.id);
      const rubricaExportada = normalizarRubricaParaExportacao(rubrica);

      if (rubricaExportada) {
        totalRubricas += 1;
      }

      questoesExportadas.push({
        ...questaoExportada,
        rubrica: rubricaExportada,
      });
    } catch (error) {
      avisos.push({
        questaoId: questao.id,
        mensagem: error?.message || 'Não foi possível carregar a rubrica desta questão.',
      });
      questoesExportadas.push({
        ...questaoExportada,
        rubrica: null,
      });
    }
  }

  return {
    tipo: 'exportacao_questoes_filtradas',
    versao: 1,
    geradoEm: new Date().toISOString(),
    incluiRubricas: true,
    totalQuestoes: questoes.length,
    totalRubricas,
    filtrosAplicados: options.filtrosAplicados || undefined,
    avisos: avisos.length ? avisos : undefined,
    questoes: questoesExportadas,
  };
}

export function nomeArquivoExportacao({ incluiRubricas = false, date = new Date() } = {}) {
  return `${incluiRubricas ? 'questoes-filtradas-com-rubricas' : 'questoes-filtradas'}-${dataArquivo(date)}.json`;
}

export function baixarJsonExportacao(payload, nomeArquivo) {
  const arquivo = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const link = document.createElement('a');
  const href = URL.createObjectURL(arquivo);

  link.href = href;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}
