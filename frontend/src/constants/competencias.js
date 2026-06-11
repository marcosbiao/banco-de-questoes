import { normalizarTexto } from '../utils/textNormalizer.js';

export const CCI_COMPETENCIAS = [
  { value: 'CCI01', label: 'CCI01 · Soluções algorítmicas claras', descricao: 'Soluções algorítmicas claras' },
  { value: 'CCI02', label: 'CCI02 · Entrada, processamento e saída', descricao: 'Entrada, processamento e saída' },
  { value: 'CCI03', label: 'CCI03 · Variáveis, constantes e expressões', descricao: 'Variáveis, constantes e expressões' },
  { value: 'CCI04', label: 'CCI04 · Decisões condicionais e expressões lógicas', descricao: 'Decisões condicionais e expressões lógicas' },
  { value: 'CCI05', label: 'CCI05 · Repetição, atualização de estado e paradas seguras', descricao: 'Repetição, atualização de estado e paradas seguras' },
  { value: 'CCI06', label: 'CCI06 · Coleções indexadas e dados estruturados simples', descricao: 'Coleções indexadas e dados estruturados simples' },
  { value: 'CCI07', label: 'CCI07 · Funções e procedimentos', descricao: 'Funções e procedimentos' },
  { value: 'CCI08', label: 'CCI08 · Análise e seleção de estruturas/estratégias', descricao: 'Análise e seleção de estruturas/estratégias' },
  { value: 'CCI09', label: 'CCI09 · Cadastros, consultas e relatórios', descricao: 'Cadastros, consultas e relatórios' },
  { value: 'CCI10', label: 'CCI10 · Integração de múltiplas estruturas', descricao: 'Integração de múltiplas estruturas' },
  { value: 'CCI11', label: 'CCI11 · Dados compostos', descricao: 'Dados compostos' },
  { value: 'CCI12', label: 'CCI12 · Recursão', descricao: 'Recursão' },
  { value: 'CCI13', label: 'CCI13 · Arquivos e persistência', descricao: 'Arquivos e persistência' },
];

export const COMPETENCIAS_POR_DISCIPLINA = {
  'Introdução à Programação': CCI_COMPETENCIAS,
};

export function obterCompetenciasPorDisciplina(nomeDisciplina = '') {
  const disciplinaNormalizada = normalizarTexto(nomeDisciplina);
  const entry = Object.entries(COMPETENCIAS_POR_DISCIPLINA)
    .find(([disciplina]) => normalizarTexto(disciplina) === disciplinaNormalizada);

  return entry?.[1] || [];
}

export function obterRotuloCompetencia(codigo = '') {
  const competencia = CCI_COMPETENCIAS.find((item) => item.value === String(codigo).trim().toUpperCase());
  return competencia?.label || codigo;
}
