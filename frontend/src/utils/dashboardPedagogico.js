import { DIFICULDADES, normalizarDificuldade } from '../constants/dificuldades.js';
import { CCI_COMPETENCIAS } from '../constants/competencias.js';
import { normalizarTexto } from './textNormalizer.js';

export const COMPETENCIAS_CCI = CCI_COMPETENCIAS.map((competencia) => ({
  codigo: competencia.value,
  descricao: competencia.descricao,
}));

export const NIVEIS_BLOOM = [
  { value: 'lembrar', label: 'Lembrar' },
  { value: 'compreender', label: 'Compreender' },
  { value: 'aplicar', label: 'Aplicar' },
  { value: 'analisar', label: 'Analisar' },
  { value: 'avaliar', label: 'Avaliar' },
  { value: 'criar', label: 'Criar' },
];

export const TIPO_QUESTAO_LABELS = {
  multipla_escolha: 'Múltipla escolha',
  verdadeiro_falso: 'Verdadeiro/Falso',
  discursiva: 'Discursiva',
  codigo_analise: 'Código para analisar',
  problema_programacao: 'Problema de programação',
  imagem: 'Questão com imagem',
  arquivo_anexo: 'Questão com arquivo anexado',
};

const competenciaSet = new Set(COMPETENCIAS_CCI.map((competencia) => competencia.codigo));

function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function percent(quantidade, total) {
  if (!total) return 0;
  return Math.round((quantidade / total) * 1000) / 10;
}

function temRubrica(questao) {
  return Boolean(questao?.temRubrica || questao?.rubrica || questao?.rubricaId);
}

function normalizarCompetencia(value) {
  return text(value).toUpperCase();
}

function normalizarBloom(value) {
  return normalizarTexto(value);
}

function criarLinha(label, quantidade, total, extra = {}) {
  return {
    label,
    quantidade,
    percentual: percent(quantidade, total),
    ...extra,
  };
}

function countBy(questoes, getKey) {
  const map = new Map();

  questoes.forEach((questao) => {
    const key = getKey(questao);
    map.set(key, (map.get(key) || 0) + 1);
  });

  return map;
}

export function calcularResumoQuestoes(questoes = []) {
  const total = questoes.length;
  const comRubrica = questoes.filter(temRubrica).length;

  return {
    total,
    ativas: questoes.filter((questao) => (questao.status || 'ativa') === 'ativa').length,
    arquivadas: questoes.filter((questao) => questao.status === 'arquivada').length,
    emRevisao: questoes.filter((questao) => questao.status === 'em_revisao').length,
    comRubrica,
    semRubrica: total - comRubrica,
    classificadasPorIA: questoes.filter((questao) => Boolean(questao.classificadaPorIA)).length,
  };
}

export function calcularDistribuicaoPorDificuldade(questoes = []) {
  const total = questoes.length;
  const counts = countBy(questoes, (questao) => normalizarDificuldade(questao.dificuldade) || 'sem_dificuldade');

  return [
    ...DIFICULDADES.map((dificuldade) => criarLinha(
      dificuldade.label,
      counts.get(dificuldade.value) || 0,
      total,
      { value: dificuldade.value },
    )),
    criarLinha('Não informado', counts.get('sem_dificuldade') || 0, total, { value: 'sem_dificuldade' }),
  ];
}

export function calcularDistribuicaoPorCompetencia(questoes = []) {
  const total = questoes.length;
  const counts = countBy(questoes, (questao) => {
    const competencia = normalizarCompetencia(questao.competencia);
    if (!competencia) return 'sem_competencia';
    return competenciaSet.has(competencia) ? competencia : 'outras_competencias';
  });

  const linhas = COMPETENCIAS_CCI.map((competencia) => criarLinha(
    competencia.codigo,
    counts.get(competencia.codigo) || 0,
    total,
    { codigo: competencia.codigo, descricao: competencia.descricao },
  ));

  linhas.push(criarLinha('Sem competência', counts.get('sem_competencia') || 0, total, {
    codigo: 'sem_competencia',
    descricao: 'Questões sem classificação CCI',
  }));

  const outras = counts.get('outras_competencias') || 0;
  if (outras) {
    linhas.push(criarLinha('Outras competências', outras, total, {
      codigo: 'outras_competencias',
      descricao: 'Valores fora do catálogo CCI01 a CCI13',
    }));
  }

  return linhas;
}

export function calcularDistribuicaoPorBloom(questoes = []) {
  const total = questoes.length;
  const bloomSet = new Set(NIVEIS_BLOOM.map((nivel) => nivel.value));
  const counts = countBy(questoes, (questao) => {
    const nivel = normalizarBloom(questao.nivelBloom);
    if (!nivel) return 'sem_bloom';
    return bloomSet.has(nivel) ? nivel : 'outros_bloom';
  });

  const linhas = NIVEIS_BLOOM.map((nivel) => criarLinha(
    nivel.label,
    counts.get(nivel.value) || 0,
    total,
    { value: nivel.value },
  ));

  linhas.push(criarLinha('Não informado', counts.get('sem_bloom') || 0, total, { value: 'sem_bloom' }));

  const outros = counts.get('outros_bloom') || 0;
  if (outros) {
    linhas.push(criarLinha('Outros níveis', outros, total, { value: 'outros_bloom' }));
  }

  return linhas;
}

export function calcularDistribuicaoPorTipo(questoes = []) {
  const total = questoes.length;
  const counts = countBy(questoes, (questao) => text(questao.tipo) || 'sem_tipo');
  const tiposConhecidos = Object.keys(TIPO_QUESTAO_LABELS);
  const linhas = tiposConhecidos.map((tipo) => criarLinha(
    TIPO_QUESTAO_LABELS[tipo],
    counts.get(tipo) || 0,
    total,
    { value: tipo },
  ));
  const tiposRestantes = [...counts.entries()]
    .filter(([tipo]) => !tiposConhecidos.includes(tipo) && tipo !== 'sem_tipo')
    .sort((a, b) => b[1] - a[1]);

  tiposRestantes.forEach(([tipo, quantidade]) => {
    linhas.push(criarLinha(tipo, quantidade, total, { value: tipo }));
  });

  linhas.push(criarLinha('Não informado', counts.get('sem_tipo') || 0, total, { value: 'sem_tipo' }));

  return linhas;
}

export function calcularDistribuicaoPorAssunto(questoes = []) {
  const total = questoes.length;
  const counts = countBy(questoes, (questao) => text(questao.assunto) || 'Não informado');

  return [...counts.entries()]
    .map(([assunto, quantidade]) => criarLinha(assunto, quantidade, total, { value: assunto }))
    .sort((a, b) => b.quantidade - a.quantidade || a.label.localeCompare(b.label));
}

export function calcularMatrizCompetenciaDificuldade(questoes = []) {
  const colunas = DIFICULDADES.map((dificuldade) => ({
    value: dificuldade.value,
    label: dificuldade.label,
  }));
  const totais = Object.fromEntries(colunas.map((coluna) => [coluna.value, 0]));
  totais.total = 0;

  const linhas = COMPETENCIAS_CCI.map((competencia) => {
    const counts = Object.fromEntries(colunas.map((coluna) => [coluna.value, 0]));
    const questoesCompetencia = questoes.filter((questao) => normalizarCompetencia(questao.competencia) === competencia.codigo);

    questoesCompetencia.forEach((questao) => {
      const dificuldade = normalizarDificuldade(questao.dificuldade);
      if (!dificuldade) return;
      counts[dificuldade] += 1;
      totais[dificuldade] += 1;
      totais.total += 1;
    });

    return {
      codigo: competencia.codigo,
      descricao: competencia.descricao,
      counts,
      total: Object.values(counts).reduce((sum, quantidade) => sum + quantidade, 0),
    };
  });

  return {
    colunas,
    linhas,
    totais,
  };
}

export function gerarAlertasPedagogicos(questoes = []) {
  const alertas = [];
  const distribuicaoCompetencia = calcularDistribuicaoPorCompetencia(questoes);
  const distribuicaoDificuldade = calcularDistribuicaoPorDificuldade(questoes);
  const resumo = calcularResumoQuestoes(questoes);
  const semCompetencia = questoes.filter((questao) => !normalizarCompetencia(questao.competencia)).length;
  const semDificuldade = questoes.filter((questao) => !normalizarDificuldade(questao.dificuldade)).length;
  const semBloom = questoes.filter((questao) => !normalizarBloom(questao.nivelBloom)).length;

  distribuicaoCompetencia
    .filter((item) => competenciaSet.has(item.codigo))
    .forEach((item) => {
      if (item.quantidade === 0) {
        alertas.push({
          tipo: 'lacuna',
          mensagem: `${item.codigo} ainda não possui questões cadastradas.`,
        });
        return;
      }

      if (item.quantidade < 3) {
        alertas.push({
          tipo: 'baixo_volume',
          mensagem: `${item.codigo} possui apenas ${item.quantidade} ${item.quantidade === 1 ? 'questão' : 'questões'}.`,
        });
      }
    });

  distribuicaoDificuldade
    .filter((item) => item.value !== 'sem_dificuldade' && item.quantidade === 0)
    .forEach((item) => {
      alertas.push({
        tipo: 'lacuna',
        mensagem: `${item.label} ainda não possui questões no recorte atual.`,
      });
    });

  if (semCompetencia) {
    alertas.push({ tipo: 'dados_ausentes', mensagem: `Há ${semCompetencia} ${semCompetencia === 1 ? 'questão sem competência' : 'questões sem competência'}.` });
  }

  if (semDificuldade) {
    alertas.push({ tipo: 'dados_ausentes', mensagem: `Há ${semDificuldade} ${semDificuldade === 1 ? 'questão sem dificuldade' : 'questões sem dificuldade'}.` });
  }

  if (semBloom) {
    alertas.push({ tipo: 'dados_ausentes', mensagem: `Há ${semBloom} ${semBloom === 1 ? 'questão sem nível de Bloom' : 'questões sem nível de Bloom'}.` });
  }

  if (resumo.semRubrica) {
    alertas.push({ tipo: 'dados_ausentes', mensagem: `Há ${resumo.semRubrica} ${resumo.semRubrica === 1 ? 'questão sem rubrica' : 'questões sem rubrica'}.` });
  }

  return alertas;
}
