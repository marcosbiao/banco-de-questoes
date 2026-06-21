function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function idsArray(value) {
  if (Array.isArray(value)) {
    return value.map(text).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map(text).filter(Boolean);
  }

  return [];
}

function mapById(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

function nome(item, fallback = 'Sem nome') {
  return text(item?.nome) || fallback;
}

function questaoLabel(questao) {
  const id = text(questao?.id) || 'sem-id';
  const enunciado = text(questao?.enunciado || questao?.titulo || questao?.textoAntesCodigo)
    .replace(/\s+/g, ' ');

  if (!enunciado) {
    return id;
  }

  return `${id} - ${enunciado.slice(0, 96)}${enunciado.length > 96 ? '...' : ''}`;
}

function addUniqueBrokenReference(referencias, seen, referencia) {
  const key = [
    referencia.tipo,
    referencia.questaoId,
    referencia.referenciaId,
  ].join('|');

  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  referencias.push(referencia);
}

function tagIdsDaQuestao(questao) {
  const tagsIds = idsArray(questao.tagsIds);

  if (tagsIds.length) {
    return tagsIds;
  }

  return idsArray(questao.tagIds);
}

function ordenarPorNome(items = []) {
  return [...items].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', {
    sensitivity: 'base',
  }));
}

function idsOrdenados(items = []) {
  return items.map((item) => text(item.id)).filter(Boolean).sort();
}

export function assinaturaMetadadosOrfaos(resultado) {
  return JSON.stringify({
    tags: idsOrdenados(resultado?.tagsSemUso),
    fontes: idsOrdenados(resultado?.fontesSemUso),
    subassuntos: idsOrdenados(resultado?.subassuntosSemUso),
    assuntos: idsOrdenados(resultado?.assuntosSemUso),
  });
}

export function metadadosOrfaosIguais(a, b) {
  return assinaturaMetadadosOrfaos(a) === assinaturaMetadadosOrfaos(b);
}

export function temMetadadosOrfaos(resultado) {
  return Boolean(
    resultado?.tagsSemUso?.length
    || resultado?.fontesSemUso?.length
    || resultado?.subassuntosSemUso?.length
    || resultado?.assuntosSemUso?.length,
  );
}

export function montarAnaliseMetadados({
  questoes = [],
  tags = [],
  fontes = [],
  subassuntos = [],
  assuntos = [],
  disciplinas = [],
} = {}) {
  const tagsById = mapById(tags);
  const fontesById = mapById(fontes);
  const subassuntosById = mapById(subassuntos);
  const assuntosById = mapById(assuntos);
  const disciplinasById = mapById(disciplinas);
  const tagsUtilizadas = new Set();
  const fontesUtilizadas = new Set();
  const subassuntosUtilizados = new Set();
  const assuntosUtilizados = new Set();
  const assuntosProtegidosPorSubassunto = new Set();
  const referenciasQuebradas = [];
  const referenciasQuebradasSeen = new Set();

  questoes.forEach((questao) => {
    const questaoId = text(questao.id);
    const label = questaoLabel(questao);

    tagIdsDaQuestao(questao).forEach((tagId) => {
      tagsUtilizadas.add(tagId);

      if (!tagsById.has(tagId)) {
        addUniqueBrokenReference(referenciasQuebradas, referenciasQuebradasSeen, {
          tipo: 'tag',
          questaoId,
          questaoLabel: label,
          referenciaId: tagId,
          mensagem: `Questão ${label} referencia a tag ID ${tagId}, mas o documento não existe.`,
        });
      }
    });

    const fonteId = text(questao.fonteId);
    if (fonteId) {
      fontesUtilizadas.add(fonteId);

      if (!fontesById.has(fonteId)) {
        addUniqueBrokenReference(referenciasQuebradas, referenciasQuebradasSeen, {
          tipo: 'fonte',
          questaoId,
          questaoLabel: label,
          referenciaId: fonteId,
          mensagem: `Questão ${label} referencia a fonte ID ${fonteId}, mas o documento não existe.`,
        });
      }
    }

    const subassuntoId = text(questao.subassuntoId);
    if (subassuntoId) {
      subassuntosUtilizados.add(subassuntoId);

      const subassunto = subassuntosById.get(subassuntoId);
      if (!subassunto) {
        addUniqueBrokenReference(referenciasQuebradas, referenciasQuebradasSeen, {
          tipo: 'subassunto',
          questaoId,
          questaoLabel: label,
          referenciaId: subassuntoId,
          mensagem: `Questão ${label} referencia o subassunto ID ${subassuntoId}, mas o documento não existe.`,
        });
      } else if (text(subassunto.assuntoId)) {
        assuntosProtegidosPorSubassunto.add(text(subassunto.assuntoId));
      }
    }

    const assuntoId = text(questao.assuntoId);
    if (assuntoId) {
      assuntosUtilizados.add(assuntoId);

      if (!assuntosById.has(assuntoId)) {
        addUniqueBrokenReference(referenciasQuebradas, referenciasQuebradasSeen, {
          tipo: 'assunto',
          questaoId,
          questaoLabel: label,
          referenciaId: assuntoId,
          mensagem: `Questão ${label} referencia o assunto ID ${assuntoId}, mas o documento não existe.`,
        });
      }
    }
  });

  const tagsSemUso = ordenarPorNome(tags.filter((tag) => !tagsUtilizadas.has(text(tag.id))))
    .map((tag) => ({
      ...tag,
      nome: nome(tag),
    }));

  const fontesSemUso = ordenarPorNome(fontes.filter((fonte) => !fontesUtilizadas.has(text(fonte.id))))
    .map((fonte) => ({
      ...fonte,
      nome: nome(fonte),
    }));

  const subassuntosSemUso = ordenarPorNome(subassuntos.filter((subassunto) => !subassuntosUtilizados.has(text(subassunto.id))))
    .map((subassunto) => {
      const assunto = assuntosById.get(text(subassunto.assuntoId));

      return {
        ...subassunto,
        nome: nome(subassunto),
        assuntoNome: assunto ? nome(assunto) : 'Assunto não encontrado',
      };
    });

  const subassuntosSemUsoIds = new Set(subassuntosSemUso.map((subassunto) => text(subassunto.id)));
  const assuntosComSubassuntosValidos = new Set();

  subassuntos.forEach((subassunto) => {
    const seraExcluido = subassuntosSemUsoIds.has(text(subassunto.id));
    const assuntoId = text(subassunto.assuntoId);

    if (!seraExcluido && assuntoId) {
      assuntosComSubassuntosValidos.add(assuntoId);
    }
  });

  const assuntosSemUso = ordenarPorNome(assuntos.filter((assunto) => {
    const assuntoId = text(assunto.id);

    return (
      !assuntosUtilizados.has(assuntoId)
      && !assuntosProtegidosPorSubassunto.has(assuntoId)
      && !assuntosComSubassuntosValidos.has(assuntoId)
    );
  })).map((assunto) => {
    const disciplina = disciplinasById.get(text(assunto.disciplinaId));

    return {
      ...assunto,
      nome: nome(assunto),
      disciplinaNome: disciplina ? nome(disciplina) : 'Disciplina não encontrada',
    };
  });

  const resultado = {
    questoesAnalisadas: questoes.length,
    tagsSemUso,
    fontesSemUso,
    subassuntosSemUso,
    assuntosSemUso,
    referenciasQuebradas,
    totais: {
      questoesAnalisadas: questoes.length,
      tagsCadastradas: tags.length,
      tagsSemUso: tagsSemUso.length,
      fontesCadastradas: fontes.length,
      fontesSemUso: fontesSemUso.length,
      subassuntosCadastrados: subassuntos.length,
      subassuntosSemUso: subassuntosSemUso.length,
      assuntosCadastrados: assuntos.length,
      assuntosSemUso: assuntosSemUso.length,
      referenciasQuebradas: referenciasQuebradas.length,
    },
  };

  return {
    ...resultado,
    assinatura: assinaturaMetadadosOrfaos(resultado),
  };
}
