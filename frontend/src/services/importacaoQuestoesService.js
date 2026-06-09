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

export const dificuldadesPermitidas = ['facil', 'medio', 'dificil'];
export const niveisBloomPermitidos = ['lembrar', 'compreender', 'aplicar', 'analisar', 'avaliar', 'criar'];
export const statusQuestaoPermitidos = ['ativa', 'arquivada', 'em_revisao'];

const tipoAliases = {
  'multipla escolha': 'multipla_escolha',
  'verdadeiro falso': 'verdadeiro_falso',
  discursiva: 'discursiva',
  'codigo analise': 'codigo_analise',
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

function normalizarDificuldade(value) {
  const normalizada = normalizarTexto(value);

  if (!normalizada) return '';
  if (normalizada === 'media') return 'medio';

  return normalizada;
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

function semAlertasDuplicidade(alertas = []) {
  return alertas.filter((alerta) => alerta.codigo !== 'possivel_duplicidade');
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

export function normalizarQuestaoImportada(questao = {}, index = 0) {
  const alertas = [];
  const tipo = normalizarOpcao(questao.tipo, tipoAliases);
  const dificuldade = normalizarDificuldade(questao.dificuldade);
  const nivelBloom = normalizarNivelBloom(questao.nivelBloom);
  const status = normalizarStatus(questao.status);
  const alternativas = normalizarAlternativasImportadas(questao.alternativas, tipo, alertas);
  const tags = normalizarTagsImportadas(questao.tags, alertas);
  const imagens = normalizarImagensImportadas(questao.imagens, alertas);
  const textoAntesCodigo = text(questao.textoAntesCodigo);
  const codigo = text(questao.codigo);
  const enunciado = text(questao.enunciado) || (tipo === 'codigo_analise' ? [textoAntesCodigo, codigo].filter(Boolean).join('\n\n') : '');

  const normalizada = {
    uid: questao.uid || importId(index),
    originalIndex: Number.isInteger(questao.originalIndex) ? questao.originalIndex : index,
    disciplina: text(questao.disciplina),
    assunto: text(questao.assunto),
    subassunto: text(questao.subassunto),
    tipo,
    textoAntesCodigo,
    codigo,
    enunciado,
    dificuldade,
    fonte: text(questao.fonte),
    competencia: text(questao.competencia),
    nivelBloom,
    tags,
    imagens,
    alternativas: tipo === 'multipla_escolha' ? alternativas : [],
    respostaCorreta: text(questao.respostaCorreta),
    explicacao: text(questao.explicacao),
    observacaoPedagogica: text(questao.observacaoPedagogica),
    status,
    possivelDuplicidade: Boolean(questao.possivelDuplicidade),
    duplicidade: questao.duplicidade || null,
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

  if (normalizada.dificuldade && !dificuldadesPermitidas.includes(normalizada.dificuldade)) {
    alertas.push({ nivel: 'erro', codigo: 'dificuldade_invalida', mensagem: `Dificuldade inválida: ${normalizada.dificuldade}.` });
  }

  if (normalizada.nivelBloom && !niveisBloomPermitidos.includes(normalizada.nivelBloom)) {
    alertas.push({ nivel: 'erro', codigo: 'bloom_invalido', mensagem: `Nível de Bloom inválido: ${normalizada.nivelBloom}.` });
  }

  if (normalizada.status && !statusQuestaoPermitidos.includes(normalizada.status)) {
    alertas.push({ nivel: 'erro', codigo: 'status_invalido', mensagem: `Status inválido: ${normalizada.status}.` });
  }

  if (normalizada.tipo === 'multipla_escolha' && normalizada.alternativas.length === 0) {
    alertas.push({ nivel: 'erro', codigo: 'multipla_sem_alternativas', mensagem: 'Questões de múltipla escolha precisam de alternativas.' });
  }

  if (normalizada.possivelDuplicidade && normalizada.duplicidade?.id) {
    alertas.push({
      nivel: 'alerta',
      codigo: 'possivel_duplicidade',
      mensagem: `Possível duplicidade com questão já cadastrada (${normalizada.duplicidade.id}).`,
    });
  }

  const alertasFinais = alertas;

  return {
    ...normalizada,
    alertas: alertasFinais,
    valida: !alertasFinais.some((alerta) => alerta.nivel === 'erro'),
  };
}

export async function detectarPossiveisDuplicidades(questoes = []) {
  const existentes = await listarQuestoes({});
  const existentesPorEnunciado = new Map();

  existentes.forEach((questao) => {
    const enunciadoNormalizado = normalizarTexto(questao.enunciado || '');
    if (enunciadoNormalizado && !existentesPorEnunciado.has(enunciadoNormalizado)) {
      existentesPorEnunciado.set(enunciadoNormalizado, questao);
    }
  });

  return questoes.map((questao) => {
    const enunciadoNormalizado = normalizarTexto(questao.enunciado || '');
    const duplicidade = enunciadoNormalizado ? existentesPorEnunciado.get(enunciadoNormalizado) : null;
    const alertas = semAlertasDuplicidade(questao.alertas || []);

    if (!duplicidade) {
      return {
        ...questao,
        possivelDuplicidade: false,
        duplicidade: null,
        alertas,
        valida: !alertas.some((alerta) => alerta.nivel === 'erro'),
      };
    }

    const alertasComDuplicidade = [
      ...alertas,
      {
        nivel: 'alerta',
        codigo: 'possivel_duplicidade',
        mensagem: `Possível duplicidade com questão já cadastrada (${duplicidade.id}).`,
      },
    ];

    return {
      ...questao,
      possivelDuplicidade: true,
      duplicidade: {
        id: duplicidade.id,
        enunciado: duplicidade.enunciado || '',
      },
      alertas: alertasComDuplicidade,
      valida: !alertasComDuplicidade.some((alerta) => alerta.nivel === 'erro'),
    };
  });
}

export function obterResumoImportacao(questoes = []) {
  const ativas = questoes.filter((questao) => !questao.removida);
  const uniqueCount = (field) => new Set(ativas.map((questao) => normalizarTexto(questao[field] || '')).filter(Boolean)).size;
  const tags = new Set();

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
    possiveisDuplicidades: ativas.filter((questao) => questao.possivelDuplicidade).length,
  };
}

export async function prepararImportacaoQuestoes(json) {
  const validation = validarJsonImportacaoQuestoes(json);

  if (!validation.valido) {
    throw new Error(validation.mensagem);
  }

  const questoes = json.questoes.map((questao, index) => normalizarQuestaoImportada(questao, index));

  return {
    metadata: json.metadata || {},
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
    questoesImportadas: [],
    disciplinasCriadas: [],
    assuntosCriados: [],
    subassuntosCriados: [],
    tagsCriadas: [],
    questoesPuladas: [],
    duplicidadesImportadas: [],
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

  for (const [index, questao] of questoes.filter((item) => !item.removida).entries()) {
    const normalizada = normalizarQuestaoImportada(questao, questao.originalIndex ?? index);

    if (!normalizada.valida) {
      report.questoesPuladas.push({
        numero: index + 1,
        enunciado: normalizada.enunciado,
        motivos: normalizada.alertas.filter((alerta) => alerta.nivel === 'erro').map((alerta) => alerta.mensagem),
      });
      continue;
    }

    const disciplina = await ensureDisciplina(normalizada.disciplina);
    const assunto = await ensureAssunto(normalizada.assunto, disciplina.id);
    const subassunto = await ensureSubassunto(normalizada.subassunto, disciplina.id, assunto.id);
    const tagsResolvidas = await ensureTags(normalizada.tags);

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
      tags: tagsResolvidas.map((tag) => tag.nome),
      imagens: normalizada.imagens,
      alternativas: normalizada.tipo === 'multipla_escolha' ? normalizada.alternativas : [],
      respostaCorreta: normalizada.respostaCorreta,
      explicacao: normalizada.explicacao,
      observacaoPedagogica: normalizada.observacaoPedagogica,
      status: statusFinal,
      anexos: [],
    });

    report.questoesImportadas.push(questaoSalva);

    if (questao.possivelDuplicidade) {
      report.duplicidadesImportadas.push(questaoSalva);
    }
  }

  return report;
}
