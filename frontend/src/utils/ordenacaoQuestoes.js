import { normalizarDificuldade } from '../constants/dificuldades.js';
import { normalizarTexto } from './textNormalizer.js';

function valuesFrom(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function textoOrdenavel(value) {
  return normalizarTexto(value || '');
}

function compararTextoComVaziosNoFinal(a, b) {
  const left = textoOrdenavel(a);
  const right = textoOrdenavel(b);

  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  return left.localeCompare(right, 'pt-BR', { sensitivity: 'base' });
}

function dificuldadeOrdenavel(value) {
  const dificuldade = normalizarDificuldade(value);

  return dificuldade || Number.POSITIVE_INFINITY;
}

function compararDificuldade(a, b) {
  const left = dificuldadeOrdenavel(a);
  const right = dificuldadeOrdenavel(b);

  if (left === right) return 0;
  if (!Number.isFinite(left)) return 1;
  if (!Number.isFinite(right)) return -1;

  return left - right;
}

function criteriosOrdenacaoBloco(bloco = {}) {
  const filtros = bloco.filtros || {};
  const assuntoIds = valuesFrom(filtros.assuntoIds);
  const subassuntoIds = valuesFrom(filtros.subassuntoIds);

  if (subassuntoIds.length === 1) {
    return ['dificuldade'];
  }

  if (subassuntoIds.length > 1) {
    return ['subassunto', 'dificuldade'];
  }

  if (assuntoIds.length === 1) {
    return ['subassunto', 'dificuldade'];
  }

  return ['assunto', 'subassunto', 'dificuldade'];
}

function modoCabecalhosBloco(bloco = {}) {
  const filtros = bloco.filtros || {};
  const assuntoIds = valuesFrom(filtros.assuntoIds);
  const subassuntoIds = valuesFrom(filtros.subassuntoIds);

  if (!filtros.disciplinaId) {
    return 'nenhum';
  }

  if (!assuntoIds.length && !subassuntoIds.length) {
    return 'assunto_subassunto';
  }

  if (assuntoIds.length && !subassuntoIds.length) {
    return 'subassunto';
  }

  return 'nenhum';
}

function nomeAssuntoQuestao(questao = {}) {
  return questao.assunto || questao.assuntoNome || '';
}

function nomeSubassuntoQuestao(questao = {}) {
  return questao.subassunto || questao.subassuntoNome || '';
}

function grupoAssunto(questao = {}) {
  const titulo = nomeAssuntoQuestao(questao).trim() || 'Sem assunto';

  return {
    titulo,
    chave: textoOrdenavel(titulo),
  };
}

function grupoSubassunto(questao = {}) {
  const titulo = nomeSubassuntoQuestao(questao).trim() || 'Sem subassunto';

  return {
    titulo,
    chave: textoOrdenavel(titulo),
  };
}

function compararPorCriterio(a, b, criterio) {
  if (criterio === 'assunto') {
    return compararTextoComVaziosNoFinal(a.assunto, b.assunto);
  }

  if (criterio === 'subassunto') {
    return compararTextoComVaziosNoFinal(a.subassunto, b.subassunto);
  }

  if (criterio === 'dificuldade') {
    return compararDificuldade(a.dificuldade, b.dificuldade);
  }

  return 0;
}

function compararFallback(a, b) {
  return compararTextoComVaziosNoFinal(a.enunciado, b.enunciado)
    || String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    || String(a.id || '').localeCompare(String(b.id || ''));
}

export function ordenarQuestoesDoBloco(questoes = [], bloco = {}) {
  const criterios = criteriosOrdenacaoBloco(bloco);

  return questoes
    .map((questao, index) => ({ questao, index }))
    .sort((a, b) => {
      for (const criterio of criterios) {
        const resultado = compararPorCriterio(a.questao, b.questao, criterio);

        if (resultado !== 0) {
          return resultado;
        }
      }

      return compararFallback(a.questao, b.questao) || a.index - b.index;
    })
    .map(({ questao }) => questao);
}

export function montarItensComCabecalhosDoBloco(questoes = [], bloco = {}) {
  const modo = modoCabecalhosBloco(bloco);

  if (modo === 'nenhum' || !questoes.length) {
    return questoes.map((questao, index) => ({
      tipo: 'questao',
      questao,
      key: `questao-${questao.id || index}`,
    }));
  }

  const itens = [];
  let ultimoAssunto = '';
  let ultimoSubassunto = '';

  questoes.forEach((questao, index) => {
    const assunto = grupoAssunto(questao);
    const subassunto = grupoSubassunto(questao);

    if (modo === 'assunto_subassunto' && assunto.chave !== ultimoAssunto) {
      itens.push({
        tipo: 'cabecalho_assunto',
        titulo: assunto.titulo,
        key: `assunto-${index}-${assunto.chave}`,
      });
      ultimoAssunto = assunto.chave;
      ultimoSubassunto = '';
    }

    if ((modo === 'assunto_subassunto' || modo === 'subassunto') && subassunto.chave !== ultimoSubassunto) {
      itens.push({
        tipo: 'cabecalho_subassunto',
        titulo: subassunto.titulo,
        key: `subassunto-${index}-${subassunto.chave}`,
      });
      ultimoSubassunto = subassunto.chave;
    }

    itens.push({
      tipo: 'questao',
      questao,
      key: `questao-${questao.id || index}`,
    });
  });

  return itens;
}
