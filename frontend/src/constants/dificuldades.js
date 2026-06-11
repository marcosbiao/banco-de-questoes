export const DIFICULDADES = [
  { value: 1, label: '1 · Fácil', nome: 'Fácil' },
  { value: 2, label: '2 · Moderado', nome: 'Moderado' },
  { value: 3, label: '3 · Intermediário', nome: 'Intermediário' },
  { value: 4, label: '4 · Difícil', nome: 'Difícil' },
  { value: 5, label: '5 · Avançado', nome: 'Avançado' },
];

export function validarDificuldade(value) {
  const numero = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.trim())
      : NaN;

  return Number.isInteger(numero) && numero >= 1 && numero <= 5;
}

export function normalizarDificuldade(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const numero = typeof value === 'number' ? value : Number(String(value).trim());

  return validarDificuldade(numero) ? numero : '';
}

export function obterRotuloDificuldade(value) {
  const dificuldade = normalizarDificuldade(value);

  return DIFICULDADES.find((item) => item.value === dificuldade)?.label || '';
}
