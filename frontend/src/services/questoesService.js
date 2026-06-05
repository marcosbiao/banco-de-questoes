export { criarDisciplina, listarDisciplinas } from './disciplinasService.js';
export { criarAssunto, listarAssuntos, listarAssuntosPorDisciplina } from './assuntosService.js';
export { criarSubassunto, listarSubassuntos, listarSubassuntosPorAssunto } from './subassuntosService.js';
export { buscarSugestoesTags, criarTag, listarTags } from './tagsService.js';

export {
  arquivarQuestao,
  atualizarQuestao,
  buscarQuestao,
  criarQuestao,
  listarQuestoes,
} from './firebase/questoesFirestoreService.js';
