export const LISTA_DRAFT_STORAGE_KEY = 'bancoQuestoes_listaDraft';

function canUseSessionStorage() {
  return typeof window !== 'undefined' && Boolean(window.sessionStorage);
}

function isValidDraft(draft) {
  return Boolean(
    draft
    && typeof draft === 'object'
    && (draft.form || draft.listaMontada)
  );
}

function mergeBlocos(formBlocos = [], listaBlocos = []) {
  const blocos = formBlocos.length ? formBlocos : listaBlocos;

  return blocos.map((bloco, index) => {
    const blocoMontado = listaBlocos.find((item) => item.id === bloco.id) || {};
    const questoes = blocoMontado.questoes ?? bloco.questoes ?? [];
    const questoesRemovidas = blocoMontado.questoesRemovidas ?? bloco.questoesRemovidas ?? [];

    return {
      ...blocoMontado,
      ...bloco,
      ordem: index + 1,
      questoes,
      questoesIds: questoes.length ? questoes.map((questao) => questao.id) : blocoMontado.questoesIds ?? bloco.questoesIds ?? [],
      questoesRemovidas,
      questoesRemovidasIds: blocoMontado.questoesRemovidasIds ?? bloco.questoesRemovidasIds ?? [],
      duplicadasIgnoradasIds: bloco.duplicadasIgnoradasIds ?? blocoMontado.duplicadasIgnoradasIds ?? [],
    };
  });
}

export function montarListaTemporaria(draft) {
  if (!isValidDraft(draft)) return null;

  const form = draft.form || {};
  const listaMontada = draft.listaMontada || null;

  if (!listaMontada) return form;

  return {
    ...listaMontada,
    ...form,
    blocos: mergeBlocos(form.blocos, listaMontada.blocos),
  };
}

export function salvarListaDraft(draft) {
  if (!canUseSessionStorage()) return;

  const nextDraft = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };

  sessionStorage.setItem(LISTA_DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
}

export function carregarListaDraft() {
  if (!canUseSessionStorage()) return null;

  const stored = sessionStorage.getItem(LISTA_DRAFT_STORAGE_KEY);

  if (!stored) return null;

  try {
    const draft = JSON.parse(stored);

    if (!isValidDraft(draft)) {
      limparListaDraft();
      return null;
    }

    return draft;
  } catch {
    limparListaDraft();
    return null;
  }
}

export function limparListaDraft() {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(LISTA_DRAFT_STORAGE_KEY);
}

export function existeListaDraft() {
  return Boolean(carregarListaDraft());
}

export function listaTemporariaFromDraft() {
  const draft = carregarListaDraft();

  if (!draft) return null;

  return montarListaTemporaria(draft);
}
