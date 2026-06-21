import { doc, writeBatch } from 'firebase/firestore';
import {
  metadadosOrfaosIguais,
  montarAnaliseMetadados,
} from '../../utils/limpezaMetadados.js';
import { normalizarTextoBusca } from '../../utils/textNormalizer.js';
import { listarColecao, requireDb } from './firestoreClient.js';
import { fonteIdFromNome } from './fontesFirestoreService.js';

export const METADADOS_ATUALIZADOS_EVENT = 'banco-questoes:metadados-atualizados';
const TAMANHO_LOTE_EXCLUSAO = 400;
const TAMANHO_LOTE_ATUALIZACAO_CATALOGO_FONTES = 400;

const ZERO_EXCLUIDOS = {
  tags: 0,
  fontes: 0,
  subassuntos: 0,
  assuntos: 0,
};

export async function analisarMetadadosOrfaos() {
  const [
    questoes,
    tags,
    fontes,
    subassuntos,
    assuntos,
    disciplinas,
  ] = await Promise.all([
    listarColecao('questoes'),
    listarColecao('tags'),
    listarColecao('fontes'),
    listarColecao('subassuntos'),
    listarColecao('assuntos'),
    listarColecao('disciplinas'),
  ]);

  return {
    ...montarAnaliseMetadados({
      questoes,
      tags,
      fontes,
      subassuntos,
      assuntos,
      disciplinas,
    }),
    analisadoEm: new Date().toISOString(),
  };
}

function possuiCampo(documento, campo) {
  return Object.prototype.hasOwnProperty.call(documento, campo);
}

function fonteDataFromNome(nome, now = new Date().toISOString()) {
  const fonteNome = String(nome || '').trim();
  const nomeBusca = normalizarTextoBusca(fonteNome);
  const id = fonteIdFromNome(fonteNome);

  return {
    id,
    nome: fonteNome,
    nomeBusca,
    createdAt: now,
    updatedAt: now,
  };
}

function montarAnaliseCatalogoFontes(questoes = [], fontes = []) {
  const fontesByNomeBusca = new Map(fontes.map((fonte) => [
    fonte.nomeBusca || normalizarTextoBusca(fonte.nome),
    fonte,
  ]));
  const fontesDistintasMap = new Map();
  const questoesParaAtualizar = [];

  const itens = questoes.map((questao) => {
    const fonte = questao.fonte ? String(questao.fonte).trim() : '';
    const fonteBuscaEsperada = normalizarTextoBusca(fonte);
    const fonteBuscaAtual = questao.fonteBusca ?? '';
    const fonteExistente = fonteBuscaEsperada ? fontesByNomeBusca.get(fonteBuscaEsperada) : null;
    const fonteIdEsperada = fonteBuscaEsperada ? (fonteExistente?.id || fonteIdFromNome(fonte)) : '';

    if (fonteBuscaEsperada && !fontesDistintasMap.has(fonteBuscaEsperada)) {
      fontesDistintasMap.set(fonteBuscaEsperada, {
        nome: fonte,
        nomeBusca: fonteBuscaEsperada,
        fonteExistente: fonteExistente || null,
        fonteParaCriar: fonteExistente ? null : fonteDataFromNome(fonte),
      });
    }

    const precisaAtualizar = Boolean(
      questao.id
      && (
        (questao.fonteId || '') !== fonteIdEsperada
        || (questao.fonte || '') !== fonte
        || fonteBuscaAtual !== fonteBuscaEsperada
      )
    );

    const item = {
      id: questao.id,
      fonte,
      fonteIdAtual: questao.fonteId || '',
      fonteIdEsperada,
      fonteBuscaAtual,
      fonteBuscaEsperada,
      temFonteId: possuiCampo(questao, 'fonteId') && Boolean(questao.fonteId),
      temFonteBusca: possuiCampo(questao, 'fonteBusca'),
      precisaAtualizar,
    };

    if (precisaAtualizar) {
      questoesParaAtualizar.push(item);
    }

    return item;
  });
  const fontesDistintas = [...fontesDistintasMap.values()];
  const fontesParaCriar = fontesDistintas
    .map((item) => item.fonteParaCriar)
    .filter(Boolean);

  return {
    totais: {
      questoesAnalisadas: itens.length,
      questoesComFonte: itens.filter((item) => Boolean(item.fonte)).length,
      questoesSemFonte: itens.filter((item) => !item.fonte).length,
      fontesDistintasEncontradas: fontesDistintas.length,
      fontesJaExistentes: fontesDistintas.filter((item) => item.fonteExistente).length,
      fontesParaCriar: fontesParaCriar.length,
      questoesSemFonteId: itens.filter((item) => item.fonte && !item.temFonteId).length,
      questoesComFonteBuscaDesatualizada: itens.filter((item) => item.fonteBuscaAtual !== item.fonteBuscaEsperada).length,
      questoesParaAtualizar: questoesParaAtualizar.length,
      questoesCorretas: itens.length - questoesParaAtualizar.length,
    },
    fontesDistintas,
    fontesParaCriar,
    questoesParaAtualizar,
  };
}

export async function analisarCatalogoFontes() {
  const [questoes, fontes] = await Promise.all([
    listarColecao('questoes'),
    listarColecao('fontes'),
  ]);

  return {
    ...montarAnaliseCatalogoFontes(questoes, fontes),
    analisadoEm: new Date().toISOString(),
  };
}

export async function atualizarCatalogoFontes() {
  const db = requireDb();
  const analise = await analisarCatalogoFontes();
  const erros = [];
  let fontesCriadas = 0;
  let questoesAtualizadas = 0;
  const operacoes = [
    ...analise.fontesParaCriar.map((fonte) => ({
      tipo: 'fonte',
      ref: doc(db, 'fontes', fonte.id),
      data: fonte,
    })),
    ...analise.questoesParaAtualizar.map((questao) => ({
      tipo: 'questao',
      ref: doc(db, 'questoes', questao.id),
      data: {
        fonteId: questao.fonteIdEsperada,
        fonte: questao.fonte,
        fonteBusca: questao.fonteBuscaEsperada,
      },
    })),
  ];

  for (let index = 0; index < operacoes.length; index += TAMANHO_LOTE_ATUALIZACAO_CATALOGO_FONTES) {
    const lote = operacoes.slice(index, index + TAMANHO_LOTE_ATUALIZACAO_CATALOGO_FONTES);
    const batch = writeBatch(db);

    lote.forEach((operacao) => {
      if (operacao.tipo === 'fonte') {
        batch.set(operacao.ref, operacao.data);
        return;
      }

      batch.update(operacao.ref, operacao.data);
    });

    try {
      await batch.commit();
      fontesCriadas += lote.filter((operacao) => operacao.tipo === 'fonte').length;
      questoesAtualizadas += lote.filter((operacao) => operacao.tipo === 'questao').length;
    } catch (error) {
      console.error('Erro ao atualizar lote do catálogo de fontes:', error);
      erros.push({
        lote: Math.floor(index / TAMANHO_LOTE_ATUALIZACAO_CATALOGO_FONTES) + 1,
        operacoes: lote.length,
        mensagem: error?.message || 'Erro ao atualizar lote.',
      });
    }
  }

  return {
    status: erros.length ? 'concluido_com_erros' : 'atualizado',
    analisadas: analise.totais.questoesAnalisadas,
    fontesCriadas,
    questoesAtualizadas,
    questoesIgnoradas: analise.totais.questoesAnalisadas - analise.totais.questoesParaAtualizar,
    erros,
    analise,
  };
}

export async function executarExclusoesEmLotes(referencias, tamanhoLote = TAMANHO_LOTE_EXCLUSAO) {
  const db = requireDb();
  const refs = Array.isArray(referencias) ? referencias.filter(Boolean) : [];

  for (let index = 0; index < refs.length; index += tamanhoLote) {
    const batch = writeBatch(db);
    const lote = refs.slice(index, index + tamanhoLote);

    lote.forEach((referencia) => {
      batch.delete(referencia);
    });

    await batch.commit();
  }

  return refs.length;
}

function referenciasParaExclusao(collectionName, items = []) {
  const db = requireDb();

  return items
    .map((item) => item?.id)
    .filter(Boolean)
    .map((id) => doc(db, collectionName, id));
}

export async function excluirMetadadosOrfaos(resultadoAnalise) {
  const analiseAtual = await analisarMetadadosOrfaos();

  if (resultadoAnalise && !metadadosOrfaosIguais(resultadoAnalise, analiseAtual)) {
    return {
      status: 'reanalisado',
      requerConfirmacao: true,
      analise: analiseAtual,
      excluidos: ZERO_EXCLUIDOS,
    };
  }

  const tagsRefs = referenciasParaExclusao('tags', analiseAtual.tagsSemUso);
  const fontesRefs = referenciasParaExclusao('fontes', analiseAtual.fontesSemUso);
  const subassuntosRefs = referenciasParaExclusao('subassuntos', analiseAtual.subassuntosSemUso);
  const assuntosRefs = referenciasParaExclusao('assuntos', analiseAtual.assuntosSemUso);

  const excluidos = {
    tags: await executarExclusoesEmLotes(tagsRefs),
    fontes: await executarExclusoesEmLotes(fontesRefs),
    subassuntos: await executarExclusoesEmLotes(subassuntosRefs),
    assuntos: await executarExclusoesEmLotes(assuntosRefs),
  };

  return {
    status: 'excluido',
    requerConfirmacao: false,
    analise: analiseAtual,
    excluidos,
  };
}
