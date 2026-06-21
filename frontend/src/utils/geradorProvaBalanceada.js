import { normalizarDificuldade } from '../constants/dificuldades.js';
import { normalizarTexto } from './textNormalizer.js';

export const NIVEIS_DIFICULDADE_PROVA = [1, 2, 3, 4, 5];

const TIPO_QUESTAO_ALIASES = {
  'multipla escolha': 'multipla_escolha',
  multipla_escolha: 'multipla_escolha',
  'verdadeiro falso': 'verdadeiro_falso',
  verdadeiro_falso: 'verdadeiro_falso',
  discursiva: 'discursiva',
  'codigo analise': 'codigo_analise',
  'codigo para analisar': 'codigo_analise',
  codigo_analise: 'codigo_analise',
  codigo_para_analisar: 'codigo_analise',
  'problema programacao': 'problema_programacao',
  problema_programacao: 'problema_programacao',
  imagem: 'imagem',
  'arquivo anexo': 'arquivo_anexo',
  arquivo_anexo: 'arquivo_anexo',
};

function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function normalizarTipoQuestao(tipo = '') {
  const raw = text(tipo);
  if (!raw) return '';

  return TIPO_QUESTAO_ALIASES[raw] || TIPO_QUESTAO_ALIASES[normalizarTexto(raw)] || raw;
}

function competenciaDaQuestao(questao = {}) {
  return text(questao.competencia || questao.competenciaPrincipal).toUpperCase();
}

function dificuldadeDaQuestao(questao = {}) {
  return normalizarDificuldade(questao.dificuldade);
}

function questaoId(questao = {}) {
  return text(questao.id || questao.questaoId || questao.uid || questao.enunciado);
}

function numeroInteiroNaoNegativo(value) {
  const numero = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isInteger(numero) && numero >= 0 ? numero : 0;
}

function quotasPositivas(quotas = {}) {
  return Object.fromEntries(
    Object.entries(quotas)
      .map(([key, value]) => [text(key).toUpperCase(), numeroInteiroNaoNegativo(value)])
      .filter(([key, value]) => key && value > 0),
  );
}

function quotasDificuldade(quotas = {}) {
  return Object.fromEntries(
    NIVEIS_DIFICULDADE_PROVA.map((dificuldade) => [
      String(dificuldade),
      numeroInteiroNaoNegativo(quotas?.[dificuldade] ?? quotas?.[String(dificuldade)]),
    ]),
  );
}

function somaQuotas(quotas = {}) {
  return Object.values(quotas).reduce((total, value) => total + numeroInteiroNaoNegativo(value), 0);
}

function valoresFiltro(value) {
  if (Array.isArray(value)) {
    return value.map((item) => text(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => text(item)).filter(Boolean);
  }

  return [];
}

export function normalizarTiposQuestao(tipos = []) {
  return [...new Set(valoresFiltro(tipos).map(normalizarTipoQuestao).filter(Boolean))];
}

function questaoTags(questao = {}) {
  return [
    ...(Array.isArray(questao.tagsIds) ? questao.tagsIds : []),
    ...(Array.isArray(questao.tagsNomes) ? questao.tagsNomes : []),
    ...(Array.isArray(questao.tags) ? questao.tags : []),
  ].map((tag) => text(tag)).filter(Boolean);
}

function questaoTemTag(questao, tagFiltro) {
  const tagNormalizada = normalizarTexto(tagFiltro);

  return questaoTags(questao).some((tag) => (
    text(tag) === text(tagFiltro) || normalizarTexto(tag) === tagNormalizada
  ));
}

export function filtrarQuestoesParaProva(questoes = [], filtros = {}) {
  const tipos = normalizarTiposQuestao(filtros.tipos);
  const niveisBloom = valoresFiltro(filtros.niveisBloom);
  const tagIds = valoresFiltro(filtros.tagsIds || filtros.tagIds);
  const somenteAtivas = filtros.somenteAtivas !== false;
  const somenteComRubrica = Boolean(filtros.somenteComRubrica);

  return questoes.filter((questao) => {
    if (filtros.disciplinaId && questao.disciplinaId !== filtros.disciplinaId) return false;
    if (filtros.assuntoId && questao.assuntoId !== filtros.assuntoId) return false;
    if (filtros.subassuntoId && (questao.subassuntoId || '') !== filtros.subassuntoId) return false;
    if (tipos.length && !tipos.includes(normalizarTipoQuestao(questao.tipo))) return false;
    if (niveisBloom.length && !niveisBloom.includes(questao.nivelBloom || '')) return false;
    if (tagIds.length && !tagIds.every((tagId) => questaoTemTag(questao, tagId))) return false;
    if (somenteComRubrica && questao.temRubrica !== true) return false;

    const status = questao.status || 'ativa';
    if (somenteAtivas && status !== 'ativa') return false;
    if (!somenteAtivas && status === 'arquivada') return false;

    return true;
  });
}

export function validarConfiguracaoProva(configuracao = {}) {
  const totalQuestoes = numeroInteiroNaoNegativo(configuracao.totalQuestoes);
  const dificuldade = quotasDificuldade(configuracao.quotasDificuldade);
  const competencia = quotasPositivas(configuracao.quotasCompetencia);
  const somaDificuldade = somaQuotas(dificuldade);
  const somaCompetencia = somaQuotas(competencia);
  const erros = [];

  if (!text(configuracao.titulo)) {
    erros.push('Informe o título da prova.');
  }

  if (!text(configuracao.disciplinaId)) {
    erros.push('Selecione a disciplina da prova.');
  }

  if (totalQuestoes <= 0) {
    erros.push('O total de questões deve ser maior que zero.');
  }

  if (somaDificuldade !== totalQuestoes) {
    erros.push(`A distribuição por dificuldade soma ${somaDificuldade}, mas a prova possui ${totalQuestoes} questões.`);
  }

  if (somaCompetencia !== totalQuestoes) {
    erros.push(`A distribuição por competência soma ${somaCompetencia}, mas a prova possui ${totalQuestoes} questões.`);
  }

  if (!Object.keys(competencia).length) {
    erros.push('Selecione ao menos uma competência.');
  }

  return {
    valida: erros.length === 0,
    erros,
    totalQuestoes,
    somaDificuldade,
    somaCompetencia,
    quotasDificuldade: dificuldade,
    quotasCompetencia: competencia,
  };
}

export function agruparQuestoesPorCompetenciaEDificuldade(questoes = []) {
  const grupos = {};

  for (const questao of questoes) {
    const competencia = competenciaDaQuestao(questao);
    const dificuldade = dificuldadeDaQuestao(questao);

    if (!competencia || !dificuldade) {
      continue;
    }

    grupos[competencia] = grupos[competencia] || {};
    grupos[competencia][dificuldade] = grupos[competencia][dificuldade] || [];
    grupos[competencia][dificuldade].push(questao);
  }

  return grupos;
}

export function verificarDisponibilidade(questoes = [], configuracao = {}) {
  const validacao = validarConfiguracaoProva(configuracao);
  const grupos = agruparQuestoesPorCompetenciaEDificuldade(questoes);
  const competencias = Object.keys(validacao.quotasCompetencia).sort();
  const dificuldades = NIVEIS_DIFICULDADE_PROVA.map(String);
  const porCompetencia = {};
  const porDificuldade = {};
  const celulas = {};

  for (const dificuldade of dificuldades) {
    porDificuldade[dificuldade] = 0;
  }

  for (const competencia of competencias) {
    porCompetencia[competencia] = 0;
    celulas[competencia] = {};

    for (const dificuldade of dificuldades) {
      const quantidade = grupos[competencia]?.[dificuldade]?.length || 0;
      celulas[competencia][dificuldade] = quantidade;
      porCompetencia[competencia] += quantidade;
      porDificuldade[dificuldade] += quantidade;
    }
  }

  const problemas = [];
  const sugestoes = [];

  for (const competencia of competencias) {
    const solicitada = validacao.quotasCompetencia[competencia] || 0;
    const disponivel = porCompetencia[competencia] || 0;

    if (solicitada > disponivel) {
      problemas.push({
        tipo: 'competencia_insuficiente',
        competencia,
        solicitada,
        disponivel,
        mensagem: `${competencia} exige ${solicitada} questões, mas há apenas ${disponivel} candidatas.`,
      });
      sugestoes.push(`reduzir ${competencia} de ${solicitada} para ${disponivel}`);
    }
  }

  for (const dificuldade of dificuldades) {
    const solicitada = validacao.quotasDificuldade[dificuldade] || 0;
    const disponivel = porDificuldade[dificuldade] || 0;

    if (solicitada > disponivel) {
      problemas.push({
        tipo: 'dificuldade_insuficiente',
        dificuldade,
        solicitada,
        disponivel,
        mensagem: `Dificuldade ${dificuldade} exige ${solicitada} questões, mas há apenas ${disponivel} candidatas.`,
      });
      sugestoes.push(`reduzir dificuldade ${dificuldade} de ${solicitada} para ${disponivel}`);
    }
  }

  for (const competencia of competencias) {
    for (const dificuldade of dificuldades) {
      if (!validacao.quotasCompetencia[competencia] || !validacao.quotasDificuldade[dificuldade]) {
        continue;
      }

      if ((celulas[competencia]?.[dificuldade] || 0) === 0) {
        problemas.push({
          tipo: 'celula_sem_candidatas',
          competencia,
          dificuldade,
          solicitada: null,
          disponivel: 0,
          mensagem: `Não há questões na combinação ${competencia} × dificuldade ${dificuldade}.`,
        });
      }
    }
  }

  if (configuracao.filtros?.somenteComRubrica) {
    sugestoes.push('desmarcar "somente com rubrica"');
  }

  if (configuracao.filtros?.assuntoId || configuracao.filtros?.subassuntoId) {
    sugestoes.push('ampliar os assuntos selecionados');
  }

  if (normalizarTiposQuestao(configuracao.filtros?.tipos).length) {
    sugestoes.push('permitir mais tipos de questão');
  }

  return {
    grupos,
    celulas,
    porCompetencia,
    porDificuldade,
    problemas,
    sugestoes: [...new Set(sugestoes)],
    totalCandidatas: questoes.length,
    validacao,
  };
}

class Dinic {
  constructor(size) {
    this.graph = Array.from({ length: size }, () => []);
    this.level = Array(size).fill(0);
    this.next = Array(size).fill(0);
  }

  addEdge(from, to, capacity, meta = {}) {
    const forward = { to, rev: this.graph[to].length, capacity, original: capacity, meta };
    const backward = { to: from, rev: this.graph[from].length, capacity: 0, original: 0, meta: {} };
    this.graph[from].push(forward);
    this.graph[to].push(backward);
    return { from, index: this.graph[from].length - 1 };
  }

  bfs(source, sink) {
    this.level.fill(-1);
    const queue = [source];
    this.level[source] = 0;

    for (let index = 0; index < queue.length; index += 1) {
      const node = queue[index];

      for (const edge of this.graph[node]) {
        if (edge.capacity > 0 && this.level[edge.to] < 0) {
          this.level[edge.to] = this.level[node] + 1;
          queue.push(edge.to);
        }
      }
    }

    return this.level[sink] >= 0;
  }

  dfs(node, sink, flow) {
    if (node === sink) return flow;

    for (; this.next[node] < this.graph[node].length; this.next[node] += 1) {
      const edge = this.graph[node][this.next[node]];

      if (edge.capacity <= 0 || this.level[node] + 1 !== this.level[edge.to]) {
        continue;
      }

      const sent = this.dfs(edge.to, sink, Math.min(flow, edge.capacity));
      if (sent <= 0) {
        continue;
      }

      edge.capacity -= sent;
      this.graph[edge.to][edge.rev].capacity += sent;
      return sent;
    }

    return 0;
  }

  maxFlow(source, sink) {
    let flow = 0;

    while (this.bfs(source, sink)) {
      this.next.fill(0);

      while (true) {
        const sent = this.dfs(source, sink, Number.MAX_SAFE_INTEGER);
        if (!sent) break;
        flow += sent;
      }
    }

    return flow;
  }
}

export function gerarPlanoDeSelecao(configuracao = {}, disponibilidade = null) {
  const info = disponibilidade || verificarDisponibilidade([], configuracao);
  const { validacao } = info;

  if (!validacao.valida) {
    return {
      ok: false,
      fluxo: 0,
      total: validacao.totalQuestoes,
      celulas: [],
      problemas: validacao.erros.map((mensagem) => ({ tipo: 'configuracao_invalida', mensagem })),
    };
  }

  const competencias = Object.keys(validacao.quotasCompetencia).sort();
  const dificuldades = NIVEIS_DIFICULDADE_PROVA.map(String).filter((dificuldade) => validacao.quotasDificuldade[dificuldade] > 0);
  const source = 0;
  const competenciaOffset = 1;
  const dificuldadeOffset = competenciaOffset + competencias.length;
  const sink = dificuldadeOffset + dificuldades.length;
  const dinic = new Dinic(sink + 1);
  const refsCelulas = [];

  competencias.forEach((competencia, index) => {
    dinic.addEdge(source, competenciaOffset + index, validacao.quotasCompetencia[competencia]);
  });

  competencias.forEach((competencia, competenciaIndex) => {
    dificuldades.forEach((dificuldade, dificuldadeIndex) => {
      const capacidade = info.celulas?.[competencia]?.[dificuldade] || 0;

      if (capacidade <= 0) {
        return;
      }

      const ref = dinic.addEdge(
        competenciaOffset + competenciaIndex,
        dificuldadeOffset + dificuldadeIndex,
        capacidade,
        { competencia, dificuldade },
      );
      refsCelulas.push({ ...ref, competencia, dificuldade });
    });
  });

  dificuldades.forEach((dificuldade, index) => {
    dinic.addEdge(dificuldadeOffset + index, sink, validacao.quotasDificuldade[dificuldade]);
  });

  const fluxo = dinic.maxFlow(source, sink);
  const celulas = refsCelulas
    .map((ref) => {
      const edge = dinic.graph[ref.from][ref.index];
      return {
        competencia: ref.competencia,
        dificuldade: Number(ref.dificuldade),
        quantidade: edge.original - edge.capacity,
      };
    })
    .filter((cell) => cell.quantidade > 0)
    .sort((a, b) => a.competencia.localeCompare(b.competencia, 'pt-BR') || a.dificuldade - b.dificuldade);

  if (fluxo !== validacao.totalQuestoes) {
    return {
      ok: false,
      fluxo,
      total: validacao.totalQuestoes,
      celulas,
      problemas: [
        ...info.problemas.filter((problema) => problema.tipo !== 'celula_sem_candidatas'),
        {
          tipo: 'sem_fluxo_compativel',
          solicitada: validacao.totalQuestoes,
          disponivel: fluxo,
          mensagem: 'Há questões suficientes no total, mas não existe combinação que satisfaça simultaneamente competência e dificuldade.',
        },
      ],
    };
  }

  return {
    ok: true,
    fluxo,
    total: validacao.totalQuestoes,
    celulas,
    problemas: [],
  };
}

function hashSeed(seed) {
  let hash = 2166136261;
  const source = text(seed) || 'prova-balanceada';

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function randomSeeded(seed) {
  let state = hashSeed(seed);

  return function nextRandom() {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function embaralharComSeed(items = [], seed = '') {
  const random = randomSeeded(seed);
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export function criarSeed(prefix = 'prova') {
  const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}-${randomPart}`;
}

function ordenarCandidatas(questoes = []) {
  return [...questoes].sort((a, b) => (
    questaoId(a).localeCompare(questaoId(b), 'pt-BR')
    || text(a.enunciado).localeCompare(text(b.enunciado), 'pt-BR')
  ));
}

export function selecionarQuestoesDoPlano(questoes = [], plano = {}, seed = '') {
  const grupos = agruparQuestoesPorCompetenciaEDificuldade(questoes);
  const selecionadas = [];
  const usados = new Set();

  for (const cell of plano.celulas || []) {
    const candidatas = ordenarCandidatas(grupos[cell.competencia]?.[cell.dificuldade] || [])
      .filter((questao) => !usados.has(questaoId(questao)));
    const embaralhadas = embaralharComSeed(candidatas, `${seed}:${cell.competencia}:${cell.dificuldade}`);
    const escolhidas = embaralhadas.slice(0, cell.quantidade);

    if (escolhidas.length < cell.quantidade) {
      throw new Error(`Não há questões suficientes para ${cell.competencia} na dificuldade ${cell.dificuldade}.`);
    }

    escolhidas.forEach((questao) => {
      usados.add(questaoId(questao));
      selecionadas.push(questao);
    });
  }

  return selecionadas;
}

export function selecionarSubstitutaQuestao(questoes = [], questaoAtual = {}, selecionadas = [], seed = '') {
  const competencia = competenciaDaQuestao(questaoAtual);
  const dificuldade = dificuldadeDaQuestao(questaoAtual);
  const atualId = questaoId(questaoAtual);
  const idsSelecionados = new Set(
    selecionadas
      .map((questao) => questaoId(questao))
      .filter((id) => id && id !== atualId),
  );
  const candidatas = ordenarCandidatas(questoes)
    .filter((questao) => competenciaDaQuestao(questao) === competencia)
    .filter((questao) => dificuldadeDaQuestao(questao) === dificuldade)
    .filter((questao) => !idsSelecionados.has(questaoId(questao)))
    .filter((questao) => questaoId(questao) !== atualId);

  return embaralharComSeed(candidatas, `${seed}:substituir:${atualId}`).at(0) || null;
}

export function calcularResumoSelecao(questoes = []) {
  const resumo = {
    porDificuldade: {},
    porCompetencia: {},
    porTipo: {},
    comRubrica: 0,
    semRubrica: 0,
  };

  for (const dificuldade of NIVEIS_DIFICULDADE_PROVA) {
    resumo.porDificuldade[String(dificuldade)] = 0;
  }

  for (const questao of questoes) {
    const dificuldade = dificuldadeDaQuestao(questao);
    const competencia = competenciaDaQuestao(questao) || 'Sem competência';
    const tipo = text(questao.tipo) || 'sem_tipo';

    if (dificuldade) {
      resumo.porDificuldade[String(dificuldade)] = (resumo.porDificuldade[String(dificuldade)] || 0) + 1;
    }

    resumo.porCompetencia[competencia] = (resumo.porCompetencia[competencia] || 0) + 1;
    resumo.porTipo[tipo] = (resumo.porTipo[tipo] || 0) + 1;

    if (questao.temRubrica === true) {
      resumo.comRubrica += 1;
    } else {
      resumo.semRubrica += 1;
    }
  }

  return resumo;
}

export function gerarProvaBalanceada(questoes = [], configuracao = {}) {
  const seed = text(configuracao.seed) || criarSeed();
  const validacao = validarConfiguracaoProva(configuracao);
  const disponibilidade = verificarDisponibilidade(questoes, configuracao);

  if (!validacao.valida) {
    return {
      ok: false,
      seed,
      questoesSelecionadas: [],
      disponibilidade,
      plano: null,
      problemas: validacao.erros.map((mensagem) => ({ tipo: 'configuracao_invalida', mensagem })),
      resumo: calcularResumoSelecao([]),
    };
  }

  if (!questoes.length) {
    return {
      ok: false,
      seed,
      questoesSelecionadas: [],
      disponibilidade,
      plano: null,
      problemas: [{ tipo: 'sem_candidatas', mensagem: 'Não há candidatos compatíveis com os filtros básicos.' }],
      resumo: calcularResumoSelecao([]),
    };
  }

  const plano = gerarPlanoDeSelecao(configuracao, disponibilidade);

  if (!plano.ok) {
    return {
      ok: false,
      seed,
      questoesSelecionadas: [],
      disponibilidade,
      plano,
      problemas: plano.problemas,
      resumo: calcularResumoSelecao([]),
    };
  }

  const questoesSelecionadas = selecionarQuestoesDoPlano(questoes, plano, seed);

  return {
    ok: true,
    seed,
    questoesSelecionadas,
    disponibilidade,
    plano,
    problemas: [],
    resumo: calcularResumoSelecao(questoesSelecionadas),
  };
}
