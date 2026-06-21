export { criarDisciplina, listarDisciplinas } from './disciplinasService.js';
export { criarAssunto, listarAssuntos, listarAssuntosPorDisciplina } from './assuntosService.js';
export { criarSubassunto, listarSubassuntos, listarSubassuntosPorAssunto } from './subassuntosService.js';
export { buscarSugestoesTags, criarTag, listarTags } from './tagsService.js';
export {
  buscarFontePorNomeNormalizado,
  criarFonte,
  excluirFonte,
  fonteIdFromNome,
  listarFontes,
  obterOuCriarFonte,
} from './fontesService.js';

export {
  arquivarQuestao,
  atualizarQuestao,
  atualizarMarcadorRubricaQuestao,
  buscarQuestoesComFiltros,
  buscarQuestao,
  criarQuestao,
  excluirQuestao,
  excluirQuestaoComDependencias,
  listarQuestoes,
} from './firebase/questoesFirestoreService.js';
