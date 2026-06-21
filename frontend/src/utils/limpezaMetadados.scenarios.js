import {
  montarAnaliseMetadados,
  temMetadadosOrfaos,
} from './limpezaMetadados.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function ids(items = []) {
  return items.map((item) => item.id).sort().join(',');
}

function analisar(overrides = {}) {
  return montarAnaliseMetadados({
    disciplinas: [{ id: 'disc', nome: 'Programação' }],
    assuntos: [],
    subassuntos: [],
    tags: [],
    fontes: [],
    questoes: [],
    ...overrides,
  });
}

function q(id, overrides = {}) {
  return {
    id,
    disciplinaId: 'disc',
    assuntoId: 'ass',
    subassuntoId: '',
    tagsIds: [],
    status: 'ativa',
    enunciado: `Questão ${id}`,
    ...overrides,
  };
}

function runScenarios() {
  const tagUnica = analisar({
    tags: [{ id: 'percentual', nome: 'percentual' }],
    questoes: [],
  });
  assert(ids(tagUnica.tagsSemUso) === 'percentual', '1. Tag usada por questão excluída deveria ficar órfã.');

  const tagCompartilhada = analisar({
    tags: [{ id: 'if', nome: 'if' }],
    questoes: [q('q2', { tagsIds: ['if'] })],
  });
  assert(ids(tagCompartilhada.tagsSemUso) === '', '2. Tag compartilhada ainda usada não deveria ficar órfã.');

  const fonteUnica = analisar({
    fontes: [{ id: 'fonte-beecrowd', nome: 'Beecrowd' }],
    questoes: [],
  });
  assert(ids(fonteUnica.fontesSemUso) === 'fonte-beecrowd', '2.1. Fonte sem questão deveria ficar órfã.');

  const fonteCompartilhada = analisar({
    fontes: [{ id: 'fonte-beecrowd', nome: 'Beecrowd' }],
    questoes: [q('q-fonte', { fonteId: 'fonte-beecrowd', fonte: 'Beecrowd' })],
  });
  assert(ids(fonteCompartilhada.fontesSemUso) === '', '2.2. Fonte usada por questão não deveria ficar órfã.');

  const subassuntoOrfao = analisar({
    assuntos: [{ id: 'ass', nome: 'Estruturas condicionais', disciplinaId: 'disc' }],
    subassuntos: [{ id: 'sub-percentual', nome: 'Cálculo de percentual', assuntoId: 'ass', disciplinaId: 'disc' }],
    questoes: [],
  });
  assert(ids(subassuntoOrfao.subassuntosSemUso) === 'sub-percentual', '3. Subassunto sem questão deveria ficar órfão.');

  const assuntoUsado = analisar({
    assuntos: [{ id: 'ass', nome: 'Estruturas condicionais', disciplinaId: 'disc' }],
    questoes: [q('q1', { assuntoId: 'ass' })],
  });
  assert(ids(assuntoUsado.assuntosSemUso) === '', '4. Assunto usado por outra questão não deveria ser excluído.');

  const assuntoComSubassuntoValido = analisar({
    assuntos: [{ id: 'ass', nome: 'Estruturas condicionais', disciplinaId: 'disc' }],
    subassuntos: [{ id: 'sub-usado', nome: 'If', assuntoId: 'ass', disciplinaId: 'disc' }],
    questoes: [q('q1', { assuntoId: '', subassuntoId: 'sub-usado' })],
  });
  assert(ids(assuntoComSubassuntoValido.assuntosSemUso) === '', '5. Assunto pai de subassunto válido deveria ser preservado.');

  const assuntoApenasComSubassuntosOrfaos = analisar({
    assuntos: [{ id: 'ass', nome: 'Estruturas condicionais', disciplinaId: 'disc' }],
    subassuntos: [{ id: 'sub-orfo', nome: 'If', assuntoId: 'ass', disciplinaId: 'disc' }],
    questoes: [],
  });
  assert(ids(assuntoApenasComSubassuntosOrfaos.subassuntosSemUso) === 'sub-orfo', '6. Subassunto órfão deveria aparecer.');
  assert(ids(assuntoApenasComSubassuntosOrfaos.assuntosSemUso) === 'ass', '6. Assunto só com subassuntos órfãos poderia ser excluído.');

  const questaoArquivada = analisar({
    assuntos: [{ id: 'ass', nome: 'Estruturas condicionais', disciplinaId: 'disc' }],
    subassuntos: [{ id: 'sub', nome: 'If', assuntoId: 'ass', disciplinaId: 'disc' }],
    tags: [{ id: 'tag', nome: 'if' }],
    questoes: [q('q-arq', { status: 'arquivada', assuntoId: 'ass', subassuntoId: 'sub', tagsIds: ['tag'] })],
  });
  assert(!temMetadadosOrfaos(questaoArquivada), '7. Questão arquivada deveria proteger metadados.');

  const semSubassunto = analisar({
    assuntos: [{ id: 'ass', nome: 'Estruturas condicionais', disciplinaId: 'disc' }],
    questoes: [q('q-sem-sub', { assuntoId: 'ass', subassuntoId: '' })],
  });
  assert(ids(semSubassunto.assuntosSemUso) === '', '8. Questão sem subassunto não deveria causar órfão indevido.');

  const semTags = analisar({
    tags: [{ id: 'tag-nao-usada', nome: 'tag não usada' }],
    questoes: [q('q-sem-tags', { tagsIds: [] })],
  });
  assert(ids(semTags.tagsSemUso) === 'tag-nao-usada', '9. Questão sem tags não deveria causar erro.');

  const quebradas = analisar({
    questoes: [q('q-quebrada', { assuntoId: 'ass-inexistente', subassuntoId: 'sub-inexistente', tagsIds: ['tag-inexistente'] })],
  });
  assert(quebradas.referenciasQuebradas.length === 3, '10. Referências quebradas deveriam ser diagnosticadas.');

  const nenhumOrfao = analisar({
    assuntos: [{ id: 'ass', nome: 'Estruturas condicionais', disciplinaId: 'disc' }],
    subassuntos: [{ id: 'sub', nome: 'If', assuntoId: 'ass', disciplinaId: 'disc' }],
    tags: [{ id: 'tag', nome: 'if' }],
    questoes: [q('q1', { assuntoId: 'ass', subassuntoId: 'sub', tagsIds: ['tag'] })],
  });
  assert(!temMetadadosOrfaos(nenhumOrfao), '11. Nenhum órfão deveria manter exclusão desabilitada.');

  const muitosRegistros = analisar({
    tags: Array.from({ length: 901 }, (_, index) => ({ id: `tag-${index}`, nome: `Tag ${index}` })),
    questoes: [],
  });
  assert(muitosRegistros.tagsSemUso.length === 901, '12. Muitos registros deveriam ser contabilizados.');

  const antesDaExclusao = analisar({
    tags: [{ id: 'nova-tag', nome: 'Nova tag' }],
    questoes: [],
  });
  const depoisDaExclusao = analisar({
    tags: [{ id: 'nova-tag', nome: 'Nova tag' }],
    questoes: [q('q-nova', { tagsIds: ['nova-tag'] })],
  });
  assert(ids(antesDaExclusao.tagsSemUso) === 'nova-tag', '13. Tag deveria aparecer na análise antiga.');
  assert(ids(depoisDaExclusao.tagsSemUso) === '', '13. Reanálise deveria proteger tag usada por questão nova.');

  const aposLimpeza = analisar({
    tags: [],
    subassuntos: [],
    assuntos: [],
    questoes: [],
  });
  assert(!temMetadadosOrfaos(aposLimpeza), '14. Após limpeza, filtros devem refletir metadados removidos.');
}

runScenarios();
console.log('Cenários da limpeza de metadados passaram.');
