import {
  clonarFiltrosQuestao,
  possuiBuscaTextualSemFiltroConsultavel,
  possuiFiltroBuscaValido,
  questaoCorrespondeAosFiltros,
} from './questoesFiltros.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const filtrosLimpos = {
  search: '',
  disciplinaId: '',
  assuntoId: '',
  subassuntoId: '',
  tipo: '',
  dificuldade: '',
  competencia: '',
  nivelBloom: '',
  status: '',
  fonteId: '',
  rubrica: 'todas',
  tagIds: [],
};

const questao = {
  id: 'q1',
  disciplinaId: 'disc',
  assuntoId: 'ass',
  subassuntoId: 'sub',
  tipo: 'discursiva',
  dificuldade: 2,
  competencia: 'CCI04',
  nivelBloom: 'aplicar',
  status: 'ativa',
  fonteId: 'fonte-beecrowd',
  temRubrica: false,
  tagsIds: ['tag-a', 'tag-b'],
  tagsNomes: ['percentual', 'if'],
  enunciado: 'Questão sobre cálculo de percentual em uma estrutura condicional.',
};

function runScenarios() {
  assert(!possuiFiltroBuscaValido(filtrosLimpos), '1. Sem filtros não deveria habilitar busca.');
  assert(possuiFiltroBuscaValido({ ...filtrosLimpos, disciplinaId: 'disc' }), '2. Disciplina deveria habilitar busca.');
  assert(possuiFiltroBuscaValido({ ...filtrosLimpos, tagIds: ['tag-a'] }), '3. Tag deveria habilitar busca.');
  assert(possuiFiltroBuscaValido({ ...filtrosLimpos, rubrica: 'sem' }), '4. Rubrica diferente de todas deveria habilitar busca.');
  assert(possuiFiltroBuscaValido({ ...filtrosLimpos, fonteId: 'fonte-beecrowd' }), '5. Fonte deveria habilitar busca.');
  assert(!possuiFiltroBuscaValido({ ...filtrosLimpos, search: 'percentual' }), '6. Busca textual sozinha não deveria habilitar leitura ampla.');
  assert(possuiBuscaTextualSemFiltroConsultavel({ ...filtrosLimpos, search: 'percentual' }), '7. Busca textual sem filtro consultável deveria ser diagnosticada.');

  assert(questaoCorrespondeAosFiltros(questao, {
    ...filtrosLimpos,
    disciplinaId: 'disc',
    assuntoId: 'ass',
    dificuldade: 2,
  }), '8. Disciplina, assunto e dificuldade deveriam combinar.');

  assert(questaoCorrespondeAosFiltros(questao, {
    ...filtrosLimpos,
    tagIds: ['tag-a', 'tag-b'],
  }), '9. Tags múltiplas mantêm regra AND.');

  assert(!questaoCorrespondeAosFiltros(questao, {
    ...filtrosLimpos,
    tagIds: ['tag-a', 'tag-c'],
  }), '10. Tag ausente deveria excluir a questão.');

  assert(questaoCorrespondeAosFiltros(questao, {
    ...filtrosLimpos,
    fonteId: 'fonte-beecrowd',
  }), '11. Fonte exata deveria combinar.');

  assert(!questaoCorrespondeAosFiltros(questao, {
    ...filtrosLimpos,
    fonteId: 'fonte-enade',
  }), '12. Fonte diferente deveria excluir a questão.');

  assert(questaoCorrespondeAosFiltros(questao, {
    ...filtrosLimpos,
    nivelBloom: 'aplicar',
    status: 'ativa',
    rubrica: 'sem',
    search: 'condicional',
  }), '13. Bloom, status, rubrica e busca textual deveriam refinar a questão.');

  assert(!questaoCorrespondeAosFiltros(questao, {
    ...filtrosLimpos,
    rubrica: 'com',
  }), '14. Filtro com rubrica não deveria aceitar questão sem rubrica.');

  assert(clonarFiltrosQuestao({ ...filtrosLimpos, dificuldade: '2' }).dificuldade === 2, '15. Dificuldade deveria continuar numérica.');
}

runScenarios();
console.log('Cenários dos filtros de questões passaram.');
