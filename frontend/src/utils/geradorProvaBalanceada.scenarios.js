import {
  filtrarQuestoesParaProva,
  gerarProvaBalanceada,
} from './geradorProvaBalanceada.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function ids(questoes) {
  return questoes.map((questao) => questao.id).join(',');
}

function q(id, competencia, dificuldade, overrides = {}) {
  return {
    id,
    disciplinaId: 'intro',
    assuntoId: 'alg',
    subassuntoId: 'cond',
    tipo: 'discursiva',
    competencia,
    dificuldade,
    nivelBloom: 'aplicar',
    status: 'ativa',
    temRubrica: false,
    enunciado: `Questão ${id}`,
    ...overrides,
  };
}

const baseConfig = {
  titulo: 'Prova de cenário',
  disciplinaId: 'intro',
  totalQuestoes: 4,
  quotasDificuldade: { 1: 2, 2: 2, 3: 0, 4: 0, 5: 0 },
  quotasCompetencia: { CCI04: 2, CCI05: 2 },
  filtros: { somenteAtivas: true },
  seed: 'seed-a',
};

function runScenarios() {
  const solucaoExata = gerarProvaBalanceada([
    q('a1', 'CCI04', 1),
    q('a2', 'CCI04', 2),
    q('b1', 'CCI05', 1),
    q('b2', 'CCI05', 2),
    q('extra', 'CCI05', 2),
  ], baseConfig);
  assert(solucaoExata.ok, '1. Deveria encontrar solução exata.');
  assert(solucaoExata.questoesSelecionadas.length === 4, '1. Deveria selecionar quatro questões.');

  const competenciaInsuficiente = gerarProvaBalanceada([
    q('a1', 'CCI04', 1),
    q('b1', 'CCI05', 1),
    q('b2', 'CCI05', 2),
  ], baseConfig);
  assert(!competenciaInsuficiente.ok, '2. Deveria falhar por competência insuficiente.');
  assert(competenciaInsuficiente.problemas.some((problema) => problema.tipo === 'competencia_insuficiente'), '2. Deveria diagnosticar competência insuficiente.');

  const dificuldadeInsuficiente = gerarProvaBalanceada([
    q('a1', 'CCI04', 1),
    q('a2', 'CCI04', 1),
    q('b1', 'CCI05', 1),
    q('b2', 'CCI05', 2),
  ], baseConfig);
  assert(!dificuldadeInsuficiente.ok, '3. Deveria falhar por dificuldade insuficiente.');
  assert(dificuldadeInsuficiente.problemas.some((problema) => problema.tipo === 'dificuldade_insuficiente'), '3. Deveria diagnosticar dificuldade insuficiente.');

  const semCombinacao = gerarProvaBalanceada([
    q('a1', 'CCI01', 1),
    q('a2', 'CCI01', 1),
    q('b1', 'CCI02', 1),
    q('b2', 'CCI02', 1),
    q('c1', 'CCI03', 2),
    q('c2', 'CCI03', 2),
    q('c3', 'CCI03', 3),
    q('c4', 'CCI03', 3),
  ], {
    ...baseConfig,
    totalQuestoes: 6,
    quotasDificuldade: { 1: 2, 2: 2, 3: 2, 4: 0, 5: 0 },
    quotasCompetencia: { CCI01: 2, CCI02: 2, CCI03: 2 },
  });
  assert(!semCombinacao.ok, '4. Deveria falhar por incompatibilidade entre margens.');
  assert(semCombinacao.problemas.some((problema) => problema.tipo === 'sem_fluxo_compativel'), '4. Deveria diagnosticar ausência de combinação.');

  const idsUnicos = new Set(solucaoExata.questoesSelecionadas.map((questao) => questao.id));
  assert(idsUnicos.size === solucaoExata.questoesSelecionadas.length, '5. Não deveria repetir questão.');

  const mesmaSeedA = gerarProvaBalanceada([
    q('a1', 'CCI04', 1),
    q('a2', 'CCI04', 1),
    q('a3', 'CCI04', 2),
    q('a4', 'CCI04', 2),
    q('b1', 'CCI05', 1),
    q('b2', 'CCI05', 1),
    q('b3', 'CCI05', 2),
    q('b4', 'CCI05', 2),
  ], baseConfig);
  const mesmaSeedB = gerarProvaBalanceada([
    q('a1', 'CCI04', 1),
    q('a2', 'CCI04', 1),
    q('a3', 'CCI04', 2),
    q('a4', 'CCI04', 2),
    q('b1', 'CCI05', 1),
    q('b2', 'CCI05', 1),
    q('b3', 'CCI05', 2),
    q('b4', 'CCI05', 2),
  ], baseConfig);
  assert(ids(mesmaSeedA.questoesSelecionadas) === ids(mesmaSeedB.questoesSelecionadas), '6. Mesma seed deveria reproduzir a seleção.');

  const outraSeed = gerarProvaBalanceada([
    q('a1', 'CCI04', 1),
    q('a2', 'CCI04', 1),
    q('a3', 'CCI04', 2),
    q('a4', 'CCI04', 2),
    q('b1', 'CCI05', 1),
    q('b2', 'CCI05', 1),
    q('b3', 'CCI05', 2),
    q('b4', 'CCI05', 2),
  ], { ...baseConfig, seed: 'seed-b' });
  assert(ids(mesmaSeedA.questoesSelecionadas) !== ids(outraSeed.questoesSelecionadas), '7. Seed diferente deveria poder gerar outra seleção neste cenário.');

  const filtradas = filtrarQuestoesParaProva([
    q('ativa', 'CCI04', 1, { tipo: 'discursiva', tagsIds: ['laços'] }),
    q('arquivada', 'CCI04', 1, { status: 'arquivada', tagsIds: ['laços'] }),
    q('tipo-fora', 'CCI04', 1, { tipo: 'multipla_escolha', tagsIds: ['laços'] }),
  ], {
    disciplinaId: 'intro',
    tipos: ['discursiva'],
    tagsIds: ['laços'],
    somenteAtivas: true,
  });
  assert(filtradas.length === 1 && filtradas[0].id === 'ativa', '8. Questões filtradas não deveriam entrar na prova.');

  const variosTipos = filtrarQuestoesParaProva([
    q('discursiva', 'CCI04', 1, { tipo: 'discursiva' }),
    q('programacao', 'CCI04', 1, { tipo: 'problema_programacao' }),
    q('multipla', 'CCI04', 1, { tipo: 'multipla_escolha' }),
  ], {
    disciplinaId: 'intro',
    tipos: ['discursiva', 'problema_programacao'],
    somenteAtivas: true,
  });
  assert(ids(variosTipos) === 'discursiva,programacao', '9. Vários tipos deveriam usar lógica OR.');

  const tipoStringComAlias = filtrarQuestoesParaProva([
    q('codigo', 'CCI04', 1, { tipo: 'codigo_analise' }),
    q('fora', 'CCI04', 1, { tipo: 'discursiva' }),
  ], {
    disciplinaId: 'intro',
    tipos: 'codigo_para_analisar',
    somenteAtivas: true,
  });
  assert(tipoStringComAlias.length === 1 && tipoStringComAlias[0].id === 'codigo', '10. Tipo salvo como string e alias deveria ser normalizado.');
}

runScenarios();
console.log('Cenários do gerador de prova balanceada passaram.');
