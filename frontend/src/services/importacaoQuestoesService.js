import { DIFICULDADES, normalizarDificuldade, validarDificuldade } from '../constants/dificuldades.js';
import {
  criarAssunto,
  criarDisciplina,
  criarQuestao,
  criarSubassunto,
  criarTag,
  listarAssuntos,
  listarDisciplinas,
  listarQuestoes,
  listarSubassuntos,
  listarTags,
} from './questoesService.js';
import { salvarRubricaQuestao } from './firebase/rubricasFirestoreService.js';
import { isBase64ImageUrl, normalizarImagemQuestao } from '../utils/questionImages.js';
import { normalizarTags, normalizarTexto } from '../utils/textNormalizer.js';

export const tiposPermitidos = [
  'multipla_escolha',
  'verdadeiro_falso',
  'discursiva',
  'codigo_analise',
  'problema_programacao',
  'imagem',
  'arquivo_anexo',
];

export const dificuldadesPermitidas = DIFICULDADES.map(({ value }) => value);
export const niveisBloomPermitidos = ['lembrar', 'compreender', 'aplicar', 'analisar', 'avaliar', 'criar'];
export const statusQuestaoPermitidos = ['ativa', 'arquivada', 'em_revisao'];
export const competenciasCCIPermitidas = Array.from({ length: 13 }, (_, index) => `CCI${String(index + 1).padStart(2, '0')}`);

const tipoAliases = {
  'multipla escolha': 'multipla_escolha',
  'verdadeiro falso': 'verdadeiro_falso',
  discursiva: 'discursiva',
  'codigo analise': 'codigo_analise',
  'codigo para analisar': 'codigo_analise',
  'codigo_para_analisar': 'codigo_analise',
  'problema programacao': 'problema_programacao',
  imagem: 'imagem',
  'arquivo anexo': 'arquivo_anexo',
};

const statusAliases = {
  ativa: 'ativa',
  arquivada: 'arquivada',
  'em revisao': 'em_revisao',
  revisao: 'em_revisao',
};

function importId(index) {
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `import-${index + 1}-${random}`;
}

function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizarOpcao(value, aliases = {}) {
  const raw = text(value);
  if (!raw) return '';
  if (Object.values(aliases).includes(raw)) return raw;

  return aliases[normalizarTexto(raw)] || raw;
}

function normalizarNivelBloom(value) {
  return normalizarTexto(value);
}

function normalizarStatus(value) {
  const raw = text(value);
  if (!raw) return 'em_revisao';
  if (statusQuestaoPermitidos.includes(raw)) return raw;

  return statusAliases[normalizarTexto(raw)] || raw;
}

function normalizarCompetenciaCCI(value) {
  return text(value).toUpperCase();
}

function importacaoClassificadaIA(contexto = {}, questao = {}) {
  return Boolean(questao.importacaoClassificadaIA)
    || normalizarTexto(contexto.tipoImportacao || '') === 'importacao questoes classificadas ia';
}

function tagsDevemSerSalvasSemCriarDocs(contexto = {}, questao = {}) {
  return importacaoClassificadaIA(contexto, questao)
    || (Object.prototype.hasOwnProperty.call(questao, 'tagsNomes') && !Object.prototype.hasOwnProperty.call(questao, 'tags'));
}

function numberValue(value) {
  const numero = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : 0;
}

function somaPontuacoes(criterios = []) {
  return Math.round(criterios.reduce((total, criterio) => total + numberValue(criterio.pontuacao), 0) * 100) / 100;
}

function normalizarTagsImportadas(value, alertas) {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return normalizarTags(value.map((tag) => text(tag)));
  }

  if (typeof value === 'string') {
    alertas.push({
      nivel: 'alerta',
      codigo: 'tags_formato',
      mensagem: 'Tags deveriam vir como array; foram separadas por vírgula para revisão.',
    });
    return normalizarTags(value.split(',').map((tag) => tag.trim()));
  }

  alertas.push({
    nivel: 'erro',
    codigo: 'tags_invalidas',
    mensagem: 'Tags devem ser informadas como array.',
  });

  return [];
}

function normalizarAlternativasImportadas(value, tipo, alertas) {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (!Array.isArray(value)) {
    alertas.push({
      nivel: 'erro',
      codigo: 'alternativas_invalidas',
      mensagem: 'Alternativas devem ser informadas como array.',
    });
    return [];
  }

  const alternativas = value.map((alternativa, index) => ({
    id: text(alternativa?.id) || String.fromCharCode(65 + index),
    texto: text(alternativa?.texto),
    correta: Boolean(alternativa?.correta),
  }));

  if (tipo !== 'multipla_escolha') {
    return alternativas.filter((alternativa) => alternativa.texto);
  }

  alternativas.forEach((alternativa, index) => {
    if (!alternativa.texto) {
      alertas.push({
        nivel: 'erro',
        codigo: 'alternativa_sem_texto',
        mensagem: `Alternativa ${index + 1} está sem texto.`,
      });
    }
  });

  const corretas = alternativas.filter((alternativa) => alternativa.correta);

  if (corretas.length > 1) {
    alertas.push({
      nivel: 'alerta',
      codigo: 'multiplas_corretas',
      mensagem: 'Há mais de uma alternativa marcada como correta.',
    });
  }

  return alternativas;
}

function normalizarImagensImportadas(value, alertas) {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (!Array.isArray(value)) {
    alertas.push({
      nivel: 'erro',
      codigo: 'imagens_invalidas',
      mensagem: 'Imagens devem ser informadas como array.',
    });
    return [];
  }

  return value
    .map((imagem, index) => {
      const url = text(imagem?.url);

      if (!url) {
        alertas.push({
          nivel: 'erro',
          codigo: 'imagem_sem_url',
          mensagem: `Imagem ${index + 1} está sem URL.`,
        });
        return null;
      }

      if (isBase64ImageUrl(url)) {
        alertas.push({
          nivel: 'erro',
          codigo: 'imagem_base64',
          mensagem: `Imagem ${index + 1} usa base64/data URL. Informe uma URL pública ou do Firebase Storage.`,
        });
        return null;
      }

      return normalizarImagemQuestao({
        url,
        path: imagem?.path,
        nome: imagem?.nome,
        legenda: imagem?.legenda,
        textoAlternativo: imagem?.textoAlternativo,
        fonte: imagem?.fonte,
      });
    })
    .filter(Boolean);
}

function normalizarRubricaImportada(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return {
      pontuacaoTotal: 0,
      criterios: [],
      respostaModelo: '',
      observacoesCorrecao: '',
    };
  }

  return {
    pontuacaoTotal: numberValue(value.pontuacaoTotal),
    criterios: Array.isArray(value.criterios)
      ? value.criterios.map((criterio, index) => ({
        id: text(criterio?.id) || `criterio_${index + 1}`,
        nome: text(criterio?.nome),
        descricao: text(criterio?.descricao),
        pontuacao: numberValue(criterio?.pontuacao),
      }))
      : [],
    respostaModelo: text(value.respostaModelo),
    observacoesCorrecao: text(value.observacoesCorrecao),
  };
}

function validarRubricaImportada(rubrica, tipo, alertas) {
  if (!rubrica) return;

  if (rubrica.pontuacaoTotal !== 10) {
    alertas.push({ nivel: 'erro', codigo: 'rubrica_total_invalido', mensagem: 'Rubrica inválida: pontuação total deve ser 10.' });
  }

  if (!Array.isArray(rubrica.criterios)) {
    alertas.push({ nivel: 'erro', codigo: 'rubrica_criterios_invalidos', mensagem: 'Rubrica inválida: critérios devem ser array.' });
    return;
  }

  if (!rubrica.criterios.length) {
    alertas.push({ nivel: 'erro', codigo: 'rubrica_sem_criterios', mensagem: 'Rubrica inválida: informe pelo menos um critério.' });
  }

  if (['discursiva', 'problema_programacao', 'codigo_analise'].includes(tipo) && (rubrica.criterios.length < 3 || rubrica.criterios.length > 5)) {
    alertas.push({ nivel: 'erro', codigo: 'rubrica_quantidade_criterios', mensagem: 'Rubrica inválida: este tipo de questão deve ter entre 3 e 5 critérios.' });
  }

  rubrica.criterios.forEach((criterio, index) => {
    if (!criterio.nome || !criterio.descricao || criterio.pontuacao <= 0) {
      alertas.push({ nivel: 'erro', codigo: 'rubrica_criterio_invalido', mensagem: `Rubrica inválida: critério ${index + 1} precisa de nome, descrição e pontuação maior que zero.` });
    }
  });

  if (Math.abs(somaPontuacoes(rubrica.criterios) - 10) > 0.001) {
    alertas.push({ nivel: 'erro', codigo: 'rubrica_soma_invalida', mensagem: 'Rubrica inválida: a soma dos critérios deve ser 10 pontos.' });
  }

  if (typeof rubrica.respostaModelo !== 'string') {
    alertas.push({ nivel: 'erro', codigo: 'rubrica_resposta_modelo_invalida', mensagem: 'Rubrica inválida: respostaModelo deve ser string.' });
  }

  if (typeof rubrica.observacoesCorrecao !== 'string') {
    alertas.push({ nivel: 'erro', codigo: 'rubrica_observacoes_invalidas', mensagem: 'Rubrica inválida: observacoesCorrecao deve ser string.' });
  }
}

function semAlertasDuplicidade(alertas = []) {
  return alertas.filter((alerta) => alerta.codigo !== 'possivel_duplicidade');
}

function tokensTextoNormalizado(value = '') {
  return normalizarTexto(value)
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function calcularPossivelDuplicidade(importada = '', existente = '') {
  const textoImportado = normalizarTexto(importada);
  const textoExistente = normalizarTexto(existente);

  if (!textoImportado || !textoExistente) {
    return null;
  }

  if (textoImportado === textoExistente) {
    return {
      similaridade: 100,
      motivo: 'Mesmo enunciado normalizado',
    };
  }

  const menor = textoImportado.length <= textoExistente.length ? textoImportado : textoExistente;
  const maior = textoImportado.length > textoExistente.length ? textoImportado : textoExistente;

  if (menor.length >= 40 && maior.includes(menor)) {
    return {
      similaridade: Math.max(85, Math.round((menor.length / maior.length) * 100)),
      motivo: 'Enunciado muito parecido por inclusão parcial',
    };
  }

  const tokensImportados = new Set(tokensTextoNormalizado(textoImportado));
  const tokensExistentes = new Set(tokensTextoNormalizado(textoExistente));

  if (tokensImportados.size < 6 || tokensExistentes.size < 6) {
    return null;
  }

  const intersecao = [...tokensImportados].filter((token) => tokensExistentes.has(token)).length;
  const uniao = new Set([...tokensImportados, ...tokensExistentes]).size;
  const similaridade = uniao ? Math.round((intersecao / uniao) * 100) : 0;

  if (similaridade >= 82) {
    return {
      similaridade,
      motivo: 'Enunciado com vocabulário muito semelhante',
    };
  }

  return null;
}

function resumoDuplicidade(questao, resultado) {
  return {
    id: questao.id,
    enunciado: questao.enunciado || '',
    disciplina: questao.disciplina || '',
    assunto: questao.assunto || '',
    subassunto: questao.subassunto || '',
    tipo: questao.tipo || '',
    dificuldade: questao.dificuldade || '',
    competencia: questao.competencia || '',
    nivelBloom: questao.nivelBloom || '',
    status: questao.status || '',
    tags: questao.tagsNomes || questao.tags || [],
    createdAt: questao.createdAt || '',
    updatedAt: questao.updatedAt || '',
    similaridade: resultado?.similaridade || null,
    motivo: resultado?.motivo || 'Enunciado muito parecido',
  };
}

function referenciaQuestaoImportada(questao = {}, fallbackIndex = 0) {
  return text(questao.idTemporario) || `Questão ${Number(questao.originalIndex ?? fallbackIndex) + 1}`;
}

function numeroQuestaoImportada(questao = {}, fallbackIndex = 0) {
  return Number.isInteger(questao.originalIndex) ? questao.originalIndex + 1 : fallbackIndex + 1;
}

function errorMessage(error, fallback = 'Erro inesperado.') {
  return error?.message || fallback;
}

export function lerArquivoJsonImportacao(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Selecione um arquivo JSON.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (error) {
        reject(new Error('O arquivo selecionado não é um JSON válido.'));
      }
    };

    reader.onerror = () => reject(new Error('Falha ao ler o arquivo JSON.'));
    reader.readAsText(file, 'UTF-8');
  });
}

export function validarJsonImportacaoQuestoes(json) {
  if (!json || typeof json !== 'object') {
    return { valido: false, mensagem: 'O arquivo deve conter um objeto JSON.' };
  }

  if (!Array.isArray(json.questoes)) {
    return { valido: false, mensagem: 'O arquivo deve conter o campo questoes como array.' };
  }

  return { valido: true };
}

export function normalizarQuestaoImportada(questao = {}, index = 0, contexto = {}) {
  const alertas = [];
  const classificadaIA = importacaoClassificadaIA(contexto, questao);
  const tagsSemCriarDocs = tagsDevemSerSalvasSemCriarDocs(contexto, questao);
  const tipo = normalizarOpcao(questao.tipo, tipoAliases);
  const dificuldade = normalizarDificuldade(questao.dificuldade);
  const dificuldadeInformada = text(questao.dificuldade);
  const nivelBloom = normalizarNivelBloom(questao.nivelBloom);
  const status = normalizarStatus(questao.status);
  const alternativas = normalizarAlternativasImportadas(questao.alternativas, tipo, alertas);
  const tags = normalizarTagsImportadas(questao.tags ?? questao.tagsNomes, alertas);
  const imagens = normalizarImagensImportadas(questao.imagens, alertas);
  const textoAntesCodigo = text(questao.textoAntesCodigo);
  const codigo = text(questao.codigo);
  const enunciado = text(questao.enunciado) || (tipo === 'codigo_analise' ? [textoAntesCodigo, codigo].filter(Boolean).join('\n\n') : '');
  const competencia = normalizarCompetenciaCCI(questao.competencia);
  const rubrica = normalizarRubricaImportada(questao.rubrica);

  const normalizada = {
    uid: questao.uid || importId(index),
    idTemporario: text(questao.idTemporario),
    originalIndex: Number.isInteger(questao.originalIndex) ? questao.originalIndex : index,
    disciplina: text(questao.disciplina) || text(contexto.disciplinaGlobal),
    assunto: text(questao.assunto),
    subassunto: text(questao.subassunto),
    tipo,
    textoAntesCodigo,
    codigo,
    enunciado,
    dificuldade,
    fonte: text(questao.fonte),
    competencia,
    nivelBloom,
    tags,
    imagens,
    alternativas: tipo === 'multipla_escolha' ? alternativas : [],
    respostaCorreta: text(questao.respostaCorreta) || text(questao.respostaEsperada),
    explicacao: text(questao.explicacao),
    observacaoPedagogica: text(questao.observacaoPedagogica),
    status,
    rubrica,
    importacaoClassificadaIA: Boolean(classificadaIA || rubrica || competencia || nivelBloom),
    tagsSemCriarDocs,
    removida: Boolean(questao.removida),
    selecionada: questao.selecionada !== false,
    possivelDuplicidade: Boolean(questao.possivelDuplicidade),
    duplicidade: questao.duplicidade || null,
    duplicidadeDecisao: text(questao.duplicidadeDecisao),
  };

  if (!normalizada.disciplina) {
    alertas.push({ nivel: 'erro', codigo: 'disciplina_obrigatoria', mensagem: 'Disciplina é obrigatória.' });
  }

  if (!normalizada.assunto) {
    alertas.push({ nivel: 'erro', codigo: 'assunto_obrigatorio', mensagem: 'Assunto é obrigatório.' });
  }

  if (!normalizada.tipo) {
    alertas.push({ nivel: 'erro', codigo: 'tipo_obrigatorio', mensagem: 'Tipo é obrigatório.' });
  } else if (!tiposPermitidos.includes(normalizada.tipo)) {
    alertas.push({ nivel: 'erro', codigo: 'tipo_invalido', mensagem: `Tipo inválido: ${normalizada.tipo}.` });
  }

  if (!normalizada.enunciado) {
    alertas.push({ nivel: 'erro', codigo: 'enunciado_obrigatorio', mensagem: 'Enunciado é obrigatório.' });
  }

  if (dificuldadeInformada && !validarDificuldade(normalizada.dificuldade)) {
    alertas.push({ nivel: 'erro', codigo: 'dificuldade_invalida', mensagem: `Dificuldade inválida: ${dificuldadeInformada}. Use um número de 1 a 5.` });
  }

  if (normalizada.nivelBloom && !niveisBloomPermitidos.includes(normalizada.nivelBloom)) {
    alertas.push({ nivel: 'erro', codigo: 'bloom_invalido', mensagem: `Nível de Bloom inválido: ${normalizada.nivelBloom}.` });
  }

  if (!normalizada.competencia && normalizada.importacaoClassificadaIA) {
    alertas.push({ nivel: 'alerta', codigo: 'competencia_ausente', mensagem: 'Competência CCI não informada.' });
  } else if (normalizada.competencia && !competenciasCCIPermitidas.includes(normalizada.competencia)) {
    alertas.push({ nivel: 'erro', codigo: 'competencia_invalida', mensagem: 'Competência inválida. Use um valor entre CCI01 e CCI13.' });
  }

  if (normalizada.status && !statusQuestaoPermitidos.includes(normalizada.status)) {
    alertas.push({ nivel: 'erro', codigo: 'status_invalido', mensagem: `Status inválido: ${normalizada.status}.` });
  }

  if (normalizada.tipo === 'multipla_escolha' && normalizada.alternativas.length === 0) {
    alertas.push({ nivel: 'erro', codigo: 'multipla_sem_alternativas', mensagem: 'Questões de múltipla escolha precisam de alternativas.' });
  }

  validarRubricaImportada(normalizada.rubrica, normalizada.tipo, alertas);

  if (normalizada.possivelDuplicidade && normalizada.duplicidade?.id) {
    const detalhe = normalizada.duplicidade.similaridade
      ? ` Semelhança estimada: ${normalizada.duplicidade.similaridade}%.`
      : ` Motivo: ${normalizada.duplicidade.motivo || 'enunciado muito parecido'}.`;

    alertas.push({
      nivel: 'alerta',
      codigo: 'possivel_duplicidade',
      mensagem: `Possível duplicidade com questão já cadastrada (${normalizada.duplicidade.id}).${detalhe}`,
    });
  }

  const alertasFinais = alertas;
  const valida = !alertasFinais.some((alerta) => alerta.nivel === 'erro');

  return {
    ...normalizada,
    selecionada: valida ? normalizada.selecionada : false,
    alertas: alertasFinais,
    valida,
  };
}

export async function detectarPossiveisDuplicidades(questoes = []) {
  const existentes = await listarQuestoes({});

  return questoes.map((questao) => {
    const duplicidade = existentes
      .map((existente) => ({
        questao: existente,
        resultado: calcularPossivelDuplicidade(questao.enunciado, existente.enunciado),
      }))
      .filter((item) => item.resultado)
      .sort((a, b) => b.resultado.similaridade - a.resultado.similaridade)[0] || null;
    const alertas = semAlertasDuplicidade(questao.alertas || []);

    if (!duplicidade) {
      return {
        ...questao,
        possivelDuplicidade: false,
        duplicidade: null,
        duplicidadeDecisao: '',
        alertas,
        valida: !alertas.some((alerta) => alerta.nivel === 'erro'),
      };
    }

    const alertasComDuplicidade = [
      ...alertas,
      {
        nivel: 'alerta',
        codigo: 'possivel_duplicidade',
        mensagem: `Possível duplicidade com questão já cadastrada (${duplicidade.questao.id}). Semelhança estimada: ${duplicidade.resultado.similaridade}%.`,
      },
    ];

    return {
      ...questao,
      possivelDuplicidade: true,
      duplicidade: resumoDuplicidade(duplicidade.questao, duplicidade.resultado),
      alertas: alertasComDuplicidade,
      valida: !alertasComDuplicidade.some((alerta) => alerta.nivel === 'erro'),
    };
  });
}

export function obterResumoImportacao(questoes = []) {
  const ativas = questoes.filter((questao) => !questao.removida);
  const uniqueCount = (field) => new Set(ativas.map((questao) => normalizarTexto(questao[field] || '')).filter(Boolean)).size;
  const tags = new Set();
  const comErro = ativas.filter((questao) => (questao.alertas || []).some((alerta) => alerta.nivel === 'erro')).length;

  ativas.forEach((questao) => {
    (questao.tags || []).forEach((tag) => {
      const normalizada = normalizarTexto(tag);
      if (normalizada) tags.add(normalizada);
    });
  });

  return {
    total: ativas.length,
    disciplinas: uniqueCount('disciplina'),
    assuntos: uniqueCount('assunto'),
    subassuntos: uniqueCount('subassunto'),
    tags: tags.size,
    validas: ativas.filter((questao) => questao.valida).length,
    comAlertas: ativas.filter((questao) => (questao.alertas || []).length > 0).length,
    comErro,
    comRubrica: ativas.filter((questao) => Boolean(questao.rubrica)).length,
    semRubrica: ativas.filter((questao) => !questao.rubrica).length,
    selecionadas: ativas.filter((questao) => questao.valida && questao.selecionada !== false).length,
    desmarcadas: ativas.filter((questao) => questao.valida && questao.selecionada === false).length,
    possiveisDuplicidades: ativas.filter((questao) => questao.possivelDuplicidade).length,
  };
}

export async function prepararImportacaoQuestoes(json) {
  const validation = validarJsonImportacaoQuestoes(json);

  if (!validation.valido) {
    throw new Error(validation.mensagem);
  }

  const contexto = {
    disciplinaGlobal: json.disciplina,
    tipoImportacao: json.tipo || json.metadata?.tipo,
    versao: json.versao,
  };
  const questoes = json.questoes.map((questao, index) => normalizarQuestaoImportada(questao, index, contexto));

  return {
    metadata: {
      ...(json.metadata || {}),
      tipo: json.tipo || json.metadata?.tipo || '',
      versao: json.versao || json.metadata?.versao || '',
      disciplina: json.disciplina || '',
    },
    questoes: await detectarPossiveisDuplicidades(questoes),
  };
}

function keyFor(...values) {
  return values.map((value) => normalizarTexto(value || '')).join('|');
}

function mapBy(items, getKey) {
  return new Map(items.map((item) => [getKey(item), item]));
}

export async function importarQuestoesParaFirestore(questoes = [], options = {}) {
  const statusFinal = statusQuestaoPermitidos.includes(options.status) ? options.status : 'em_revisao';
  const questoesSelecionadas = questoes.filter((item) => !item.removida && item.valida === true && item.selecionada !== false);
  const questoesIgnoradas = questoes.filter((item) => item.removida || item.valida !== true || item.selecionada === false);
  const [disciplinas, assuntos, subassuntos, tags] = await Promise.all([
    listarDisciplinas(),
    listarAssuntos(),
    listarSubassuntos(),
    listarTags(),
  ]);

  const disciplinasMap = mapBy(disciplinas, (disciplina) => keyFor(disciplina.nome));
  const assuntosMap = mapBy(assuntos, (assunto) => keyFor(assunto.disciplinaId, assunto.nome));
  const subassuntosMap = mapBy(subassuntos, (subassunto) => keyFor(subassunto.assuntoId, subassunto.nome));
  const tagsMap = mapBy(tags, (tag) => keyFor(tag.nomeNormalizado || tag.nome));

  const report = {
    totalAnalisadas: questoes.length,
    totalSelecionadas: questoesSelecionadas.length,
    questoesImportadas: [],
    disciplinasCriadas: [],
    assuntosCriados: [],
    subassuntosCriados: [],
    tagsCriadas: [],
    questoesPuladas: [],
    questoesErroImportacao: [],
    questoesIgnoradas: questoesIgnoradas.map((questao, index) => ({
      numero: numeroQuestaoImportada(questao, index),
      referencia: referenciaQuestaoImportada(questao, index),
      enunciado: questao.enunciado || '',
      possivelDuplicidade: Boolean(questao.possivelDuplicidade),
      motivo: questao.removida
        ? 'Ignorada na prévia'
        : questao.valida !== true
          ? 'Inválida na prévia'
          : 'Desmarcada para importação',
    })),
    duplicidadesAnalisadas: questoes.filter((questao) => questao.possivelDuplicidade).length,
    duplicidadesImportadas: [],
    duplicidadesIgnoradas: questoesIgnoradas.filter((questao) => questao.possivelDuplicidade),
    rubricasImportadas: [],
    rubricasErro: [],
    questoesSemRubrica: [],
  };

  async function ensureDisciplina(nome) {
    const key = keyFor(nome);
    const existente = disciplinasMap.get(key);
    if (existente) return existente;

    const disciplina = await criarDisciplina({ nome });
    disciplinasMap.set(key, disciplina);
    report.disciplinasCriadas.push(disciplina);
    return disciplina;
  }

  async function ensureAssunto(nome, disciplinaId) {
    const key = keyFor(disciplinaId, nome);
    const existente = assuntosMap.get(key);
    if (existente) return existente;

    const assunto = await criarAssunto({ nome, disciplinaId });
    assuntosMap.set(key, assunto);
    report.assuntosCriados.push(assunto);
    return assunto;
  }

  async function ensureSubassunto(nome, disciplinaId, assuntoId) {
    if (!nome) return null;

    const key = keyFor(assuntoId, nome);
    const existente = subassuntosMap.get(key);
    if (existente) return existente;

    const subassunto = await criarSubassunto({ nome, disciplinaId, assuntoId });
    subassuntosMap.set(key, subassunto);
    report.subassuntosCriados.push(subassunto);
    return subassunto;
  }

  async function ensureTags(nomes = []) {
    const resolved = [];

    for (const nome of normalizarTags(nomes)) {
      const key = keyFor(nome);
      const existente = tagsMap.get(key);

      if (existente) {
        resolved.push(existente);
        continue;
      }

      const tag = await criarTag({ nome });
      tagsMap.set(keyFor(tag.nomeNormalizado || tag.nome), tag);
      report.tagsCriadas.push(tag);
      resolved.push(tag);
    }

    return resolved;
  }

  for (const [index, questao] of questoesSelecionadas.entries()) {
    const normalizada = normalizarQuestaoImportada(questao, questao.originalIndex ?? index);
    const referencia = referenciaQuestaoImportada(normalizada, index);

    if (!normalizada.valida) {
      report.questoesPuladas.push({
        numero: numeroQuestaoImportada(normalizada, index),
        referencia,
        enunciado: normalizada.enunciado,
        motivos: normalizada.alertas.filter((alerta) => alerta.nivel === 'erro').map((alerta) => alerta.mensagem),
      });
      continue;
    }

    try {
      const disciplina = await ensureDisciplina(normalizada.disciplina);
      const assunto = await ensureAssunto(normalizada.assunto, disciplina.id);
      const subassunto = await ensureSubassunto(normalizada.subassunto, disciplina.id, assunto.id);
      const tagsResolvidas = normalizada.tagsSemCriarDocs ? [] : await ensureTags(normalizada.tags);
      const now = new Date().toISOString();
      const questaoStatusFinal = normalizada.duplicidadeDecisao === 'revisao' ? 'em_revisao' : statusFinal;
      const classificacaoIAStatus = 'aprovada';

      const questaoSalva = await criarQuestao({
        disciplinaId: disciplina.id,
        assuntoId: assunto.id,
        subassuntoId: subassunto?.id || '',
        tipo: normalizada.tipo,
        textoAntesCodigo: normalizada.textoAntesCodigo,
        codigo: normalizada.codigo,
        enunciado: normalizada.enunciado,
        dificuldade: normalizada.dificuldade || '',
        fonte: normalizada.fonte,
        competencia: normalizada.competencia,
        nivelBloom: normalizada.nivelBloom || '',
        ...(normalizada.tagsSemCriarDocs
          ? { tagsNomes: normalizada.tags, tagsIds: [], tagsNomesSemCriarTags: true }
          : { tags: tagsResolvidas.map((tag) => tag.nome) }),
        imagens: normalizada.imagens,
        alternativas: normalizada.tipo === 'multipla_escolha' ? normalizada.alternativas : [],
        respostaCorreta: normalizada.respostaCorreta,
        explicacao: normalizada.explicacao,
        observacaoPedagogica: normalizada.observacaoPedagogica,
        status: questaoStatusFinal,
        anexos: [],
        temRubrica: Boolean(normalizada.rubrica),
        classificadaPorIA: Boolean(normalizada.rubrica || normalizada.competencia || normalizada.nivelBloom || normalizada.dificuldade),
        classificacaoIAStatus,
        classificacaoIAGeradaEm: now,
        classificacaoIARevisadaEm: now,
        classificacaoIAModelo: 'interface_externa',
      });

      report.questoesImportadas.push(questaoSalva);

      if (normalizada.rubrica) {
        try {
          const rubricaSalva = await salvarRubricaQuestao(questaoSalva.id, normalizada.rubrica, {
            tipoQuestao: normalizada.tipo,
            competencia: normalizada.competencia,
            nivelBloom: normalizada.nivelBloom,
            modeloIA: 'interface_externa',
            status: classificacaoIAStatus,
            geradaPorIA: true,
          });
          report.rubricasImportadas.push(rubricaSalva);
        } catch (rubricaError) {
          report.rubricasErro.push({
            referencia,
            questaoId: questaoSalva.id,
            enunciado: normalizada.enunciado,
            mensagem: errorMessage(rubricaError, 'Não foi possível salvar a rubrica.'),
          });
        }
      } else {
        report.questoesSemRubrica.push(questaoSalva);
      }

      if (questao.possivelDuplicidade) {
        report.duplicidadesImportadas.push(questaoSalva);
      }
    } catch (importError) {
      report.questoesErroImportacao.push({
        numero: numeroQuestaoImportada(normalizada, index),
        referencia,
        enunciado: normalizada.enunciado,
        mensagem: errorMessage(importError, 'Não foi possível importar a questão.'),
      });
    }
  }

  return report;
}
