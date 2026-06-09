import { FileText, Plus, Save, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listarAssuntos,
  listarDisciplinas,
  listarQuestoes,
  listarSubassuntos,
  listarTags,
} from '../../services/questoesService.js';
import { limparListaDraft, montarListaTemporaria, salvarListaDraft } from '../../utils/listaDraftStorage.js';
import Button from '../ui/Button.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import ErrorMessage from '../ui/ErrorMessage.jsx';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import ListaBlocoForm from './ListaBlocoForm.jsx';
import ListaHeaderForm from './ListaHeaderForm.jsx';
import ListaQuestoesSelecionadas from './ListaQuestoesSelecionadas.jsx';

const cabecalhoInicial = {
  instituicao: '',
  curso: '',
  disciplinaTexto: '',
  professor: '',
  turma: '',
  data: '',
  tituloExibicao: '',
};

function uuid(prefix) {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}-${id}`;
}

function novoBloco(ordem = 1) {
  return {
    id: uuid('bloco'),
    ordem,
    tituloBloco: `Bloco ${ordem}`,
    filtros: {
      disciplinaId: '',
      assuntoIds: [],
      subassuntoIds: [],
      tagIds: [],
      tipo: '',
      dificuldade: '',
      competencia: '',
      nivelBloom: '',
      status: 'ativa',
      search: '',
    },
    questoesIds: [],
    questoesRemovidasIds: [],
    duplicadasIgnoradasIds: [],
  };
}

function normalizeInitialData(initialData) {
  if (!initialData) {
    return {
      titulo: 'Lista de exercícios',
      cabecalho: cabecalhoInicial,
      instrucoes: 'Resolva as questões com atenção.',
      incluirGabarito: true,
      status: 'ativa',
      blocos: [novoBloco(1)],
    };
  }

  return {
    titulo: initialData.titulo || 'Lista de exercícios',
    cabecalho: { ...cabecalhoInicial, ...(initialData.cabecalho || {}) },
    instrucoes: initialData.instrucoes || '',
    incluirGabarito: Boolean(initialData.incluirGabarito),
    status: initialData.status || 'ativa',
    blocos: (initialData.blocos?.length ? initialData.blocos : [novoBloco(1)]).map((bloco, index) => ({
      ...novoBloco(index + 1),
      ...bloco,
      ordem: index + 1,
      filtros: { ...novoBloco(index + 1).filtros, ...(bloco.filtros || {}) },
      questoesIds: bloco.questoesIds || bloco.questoes?.map((questao) => questao.id) || [],
      questoes: bloco.questoes || [],
      questoesRemovidasIds: bloco.questoesRemovidasIds || [],
      questoesRemovidas: bloco.questoesRemovidas || [],
    })),
  };
}

function addUniqueOption(items, item) {
  if (!item?.value || items.some((option) => option.value === item.value)) {
    return items;
  }

  return [...items, item];
}

function opcoesFromQuestoes(questoes = []) {
  return questoes.reduce((acc, questao) => {
    acc.disciplinas = addUniqueOption(acc.disciplinas, { value: questao.disciplinaId, label: questao.disciplina });
    acc.assuntos = addUniqueOption(acc.assuntos, { value: questao.assuntoId, label: questao.assunto, disciplinaId: questao.disciplinaId });

    if (questao.subassuntoId) {
      acc.subassuntos = addUniqueOption(acc.subassuntos, {
        value: questao.subassuntoId,
        label: questao.subassunto,
        disciplinaId: questao.disciplinaId,
        assuntoId: questao.assuntoId,
      });
    }

    (questao.tagsNomes || questao.tags || []).forEach((tag, index) => {
      acc.tags = addUniqueOption(acc.tags, {
        value: questao.tagsIds?.[index] || tag,
        label: tag,
      });
    });

    if (questao.competencia) {
      acc.competencias = addUniqueOption(acc.competencias, {
        value: questao.competencia,
        label: questao.competencia,
      });
    }

    if (questao.status) {
      acc.statuses = addUniqueOption(acc.statuses, {
        value: questao.status,
        label: questao.status,
      });
    }

    return acc;
  }, { disciplinas: [], assuntos: [], subassuntos: [], tags: [], competencias: [], statuses: [] });
}

function draftFromState(form, listaMontada) {
  return {
    form,
    listaMontada,
  };
}

export default function ListaForm({ initialData, initialDraft, mode = 'create', onSave, onMountList }) {
  const navigate = useNavigate();
  const hasMountedDraftSave = useRef(false);
  const [form, setForm] = useState(() => normalizeInitialData(initialDraft?.form || initialData));
  const [listaMontada, setListaMontada] = useState(initialDraft?.listaMontada || initialData || null);
  const [opcoes, setOpcoes] = useState({ disciplinas: [], assuntos: [], subassuntos: [], tags: [], competencias: [], statuses: [] });
  const [questoesDisponiveis, setQuestoesDisponiveis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [blocoParaRemover, setBlocoParaRemover] = useState('');

  useEffect(() => {
    if (initialData) {
      setForm(normalizeInitialData(initialData));
      setListaMontada(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    if (mode !== 'create') return;

    if (!hasMountedDraftSave.current) {
      hasMountedDraftSave.current = true;
      return;
    }

    salvarListaDraft(draftFromState(form, listaMontada));
  }, [form, listaMontada, mode]);

  useEffect(() => {
    async function loadOptions() {
      const [disciplinas, assuntos, subassuntos, tags, questoes] = await Promise.all([
        listarDisciplinas(),
        listarAssuntos(),
        listarSubassuntos(),
        listarTags(),
        listarQuestoes({}),
      ]);
      const opcoesQuestoes = opcoesFromQuestoes(questoes);

      setQuestoesDisponiveis(questoes);
      setOpcoes({
        disciplinas: opcoesQuestoes.disciplinas.length ? opcoesQuestoes.disciplinas : disciplinas.map((disciplina) => ({ value: disciplina.id, label: disciplina.nome })),
        assuntos: opcoesQuestoes.assuntos.length ? opcoesQuestoes.assuntos : assuntos.map((assunto) => ({ value: assunto.id, label: assunto.nome, disciplinaId: assunto.disciplinaId })),
        subassuntos: opcoesQuestoes.subassuntos.length ? opcoesQuestoes.subassuntos : subassuntos.map((subassunto) => ({
          value: subassunto.id,
          label: subassunto.nome,
          disciplinaId: subassunto.disciplinaId,
          assuntoId: subassunto.assuntoId,
        })),
        tags: opcoesQuestoes.tags.length ? opcoesQuestoes.tags : tags.map((tag) => ({ value: tag.id, label: tag.nome })),
        competencias: opcoesQuestoes.competencias,
        statuses: opcoesQuestoes.statuses,
      });
    }

    loadOptions().catch((apiError) => setError(apiError.message));
  }, []);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const updateBloco = (id, nextBloco) => {
    setForm((current) => ({
      ...current,
      blocos: current.blocos.map((bloco) => (bloco.id === id ? nextBloco : bloco)).map((bloco, index) => ({ ...bloco, ordem: index + 1 })),
    }));
    setListaMontada((current) => {
      if (!current?.blocos?.some((bloco) => bloco.id === id)) return current;

      const next = {
        ...current,
        blocos: current.blocos.map((bloco) => (bloco.id === id ? { ...bloco, ...nextBloco } : bloco)),
      };

      return next;
    });
  };

  const moveBloco = (id, direction) => {
    setForm((current) => {
      const index = current.blocos.findIndex((bloco) => bloco.id === id);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.blocos.length) {
        return current;
      }

      const blocos = [...current.blocos];
      const [removed] = blocos.splice(index, 1);
      blocos.splice(nextIndex, 0, removed);

      return {
        ...current,
        blocos: blocos.map((bloco, blocoIndex) => ({ ...bloco, ordem: blocoIndex + 1 })),
      };
    });
    setListaMontada((current) => {
      if (!current?.blocos?.length) return current;

      const index = current.blocos.findIndex((bloco) => bloco.id === id);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.blocos.length) {
        return current;
      }

      const blocos = [...current.blocos];
      const [removed] = blocos.splice(index, 1);
      blocos.splice(nextIndex, 0, removed);
      const next = { ...current, blocos: blocos.map((bloco, blocoIndex) => ({ ...bloco, ordem: blocoIndex + 1 })) };

      return next;
    });
  };

  const deleteBloco = (id) => {
    setForm((current) => ({
      ...current,
      blocos: current.blocos.length > 1
        ? current.blocos.filter((bloco) => bloco.id !== id).map((bloco, index) => ({ ...bloco, ordem: index + 1 }))
        : current.blocos,
    }));
    setListaMontada((current) => {
      if (!current?.blocos?.length) return current;

      const blocos = current.blocos
        .filter((bloco) => bloco.id !== id)
        .map((bloco, index) => ({ ...bloco, ordem: index + 1 }));
      const next = { ...current, blocos };

      return next;
    });
  };

  const requestRemoveBloco = (id) => {
    const bloco = listaMontada?.blocos?.find((item) => item.id === id) || form.blocos.find((item) => item.id === id);

    if (form.blocos.length <= 1) {
      setError('A lista precisa ter pelo menos um bloco.');
      return;
    }

    if (bloco?.questoes?.length) {
      setBlocoParaRemover(id);
      return;
    }

    deleteBloco(id);
  };

  function payloadBase() {
    return {
      ...form,
      blocos: form.blocos.map((bloco, index) => ({
        ...(listaMontada?.blocos?.find((item) => item.id === bloco.id) || {}),
        ...bloco,
        ordem: index + 1,
        questoesIds: listaMontada?.blocos?.find((item) => item.id === bloco.id)?.questoes?.map((questao) => questao.id) || bloco.questoesIds || [],
      })),
    };
  }

  function validarBlocos() {
    if (!form.titulo.trim()) {
      setError('Informe o título da lista.');
      return false;
    }

    return true;
  }

  async function handleMontar() {
    setError('');
    setFeedback('');

    if (!validarBlocos()) {
      return;
    }

    setLoading(true);

    try {
      const data = await onMountList(payloadBase());
      setListaMontada(data);
      setForm((current) => ({
        ...current,
        blocos: data.blocos.map((bloco) => ({ ...bloco, questoesRemovidas: [] })),
      }));
      setFeedback('Lista montada. Revise as questões antes de salvar.');
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvar() {
    setError('');
    setFeedback('');

    if (!validarBlocos()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...(listaMontada || payloadBase()),
        ...form,
        blocos: form.blocos.map((bloco, index) => {
          const blocoMontado = listaMontada?.blocos?.find((item) => item.id === bloco.id) || {};

          return {
            ...blocoMontado,
            ...bloco,
            ordem: index + 1,
            questoes: blocoMontado.questoes || bloco.questoes || [],
            questoesIds: blocoMontado.questoes?.map((questao) => questao.id) || bloco.questoesIds || [],
          };
        }),
      };
      const saved = await onSave(payload);
      if (mode === 'create') {
        limparListaDraft();
      }
      navigate(`/listas/${saved.id}/preview`);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  function updateListaMontada(nextBlocos) {
    setListaMontada((current) => {
      const next = {
        ...current,
        ...form,
        blocos: nextBlocos,
        questoesSelecionadas: nextBlocos.flatMap((bloco) => (bloco.questoes || []).map((questao, index) => ({
          blocoId: bloco.id,
          questaoId: questao.id,
          ordem: index + 1,
          removida: false,
          origemAutomatica: true,
        }))),
      };
      return next;
    });
  }

  function removeQuestao(blocoId, questaoId) {
    if (!listaMontada) return;
    setFeedback('Questão removida da lista. Use Restaurar se quiser desfazer.');
    updateListaMontada(listaMontada.blocos.map((bloco) => {
      if (bloco.id !== blocoId) return bloco;
      const questao = bloco.questoes.find((item) => item.id === questaoId);
      return {
        ...bloco,
        questoes: bloco.questoes.filter((item) => item.id !== questaoId),
        questoesIds: bloco.questoesIds.filter((id) => id !== questaoId),
        questoesRemovidasIds: [...new Set([...(bloco.questoesRemovidasIds || []), questaoId])],
        questoesRemovidas: questao ? [...(bloco.questoesRemovidas || []), questao] : bloco.questoesRemovidas || [],
      };
    }));
  }

  function restoreQuestao(blocoId, questaoId) {
    if (!listaMontada) return;
    setFeedback('Questão restaurada na lista.');
    updateListaMontada(listaMontada.blocos.map((bloco) => {
      if (bloco.id !== blocoId) return bloco;
      const questao = (bloco.questoesRemovidas || []).find((item) => item.id === questaoId);
      if (!questao) return bloco;
      return {
        ...bloco,
        questoes: [...(bloco.questoes || []), questao],
        questoesIds: [...(bloco.questoesIds || []), questao.id],
        questoesRemovidasIds: (bloco.questoesRemovidasIds || []).filter((id) => id !== questaoId),
        questoesRemovidas: (bloco.questoesRemovidas || []).filter((item) => item.id !== questaoId),
      };
    }));
  }

  function moveQuestao(blocoId, questaoId, direction) {
    if (!listaMontada) return;
    updateListaMontada(listaMontada.blocos.map((bloco) => {
      if (bloco.id !== blocoId) return bloco;
      const index = bloco.questoes.findIndex((questao) => questao.id === questaoId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= bloco.questoes.length) return bloco;
      const questoes = [...bloco.questoes];
      const [removed] = questoes.splice(index, 1);
      questoes.splice(nextIndex, 0, removed);
      return { ...bloco, questoes, questoesIds: questoes.map((questao) => questao.id) };
    }));
  }

  return (
    <section className="builder-grid">
      <div className="form-panel">
        <div className="form-grid">
          <Input label="Título da lista" name="titulo" value={form.titulo} onChange={(event) => updateForm('titulo', event.target.value)} />
          <label className="check-field">
            <input type="checkbox" checked={form.incluirGabarito} onChange={(event) => updateForm('incluirGabarito', event.target.checked)} />
            <span>Incluir gabarito</span>
          </label>
          <Textarea label="Instruções" name="instrucoes" className="span-2" rows={3} value={form.instrucoes} onChange={(event) => updateForm('instrucoes', event.target.value)} />
        </div>

        <div className="section-title inline-title">
          <div>
            <p className="eyebrow">Cabeçalho</p>
            <h3>Dados de exibição</h3>
          </div>
        </div>
        <ListaHeaderForm value={form.cabecalho} onChange={(cabecalho) => updateForm('cabecalho', cabecalho)} />

        <div className="section-title inline-title">
          <div>
            <p className="eyebrow">Seleção</p>
            <h3>Blocos</h3>
          </div>
          <Button type="button" variant="secondary" icon={Plus} onClick={() => setForm((current) => ({ ...current, blocos: [...current.blocos, novoBloco(current.blocos.length + 1)] }))}>
            Adicionar bloco
          </Button>
        </div>

        <div className="blocos-stack">
          {form.blocos.map((bloco, index) => (
            <ListaBlocoForm
              key={bloco.id}
              bloco={bloco}
              index={index}
              total={form.blocos.length}
              opcoes={opcoes}
              questoesDisponiveis={questoesDisponiveis}
              onChange={updateBloco}
              onMove={moveBloco}
              onRemove={requestRemoveBloco}
            />
          ))}
        </div>

        <div className="form-footer">
          {feedback ? <p className="success-message">{feedback}</p> : null}
          <ErrorMessage message={error} />
          <Button type="button" icon={Search} disabled={loading} onClick={handleMontar}>
            {loading ? 'Montando...' : mode === 'edit' ? 'Remontar lista' : 'Montar lista'}
          </Button>
          <Button type="button" icon={Save} disabled={saving || !listaMontada} onClick={handleSalvar}>
            {saving ? 'Salvando...' : 'Salvar lista'}
          </Button>
          {listaMontada ? (
            <Button
              type="button"
              variant="secondary"
              icon={FileText}
              onClick={() => {
                const draft = draftFromState(form, listaMontada);
                salvarListaDraft(draft);
                navigate('/listas/preview', { state: { lista: montarListaTemporaria(draft), temporaria: true } });
              }}
            >
              Prévia temporária
            </Button>
          ) : null}
        </div>
      </div>

      <div className="preview-panel">
        <div className="section-title inline-title">
          <div>
            <p className="eyebrow">Revisão</p>
            <h3>Questões selecionadas</h3>
          </div>
        </div>
        <ListaQuestoesSelecionadas
          lista={listaMontada}
          onRemoveQuestao={removeQuestao}
          onRestoreQuestao={restoreQuestao}
          onMoveQuestao={moveQuestao}
        />
      </div>

      <ConfirmDialog
        open={Boolean(blocoParaRemover)}
        title="Remover bloco?"
        description="Este bloco já possui questões carregadas. A remoção também tirará essas questões da revisão da lista."
        confirmLabel="Remover bloco"
        danger
        onCancel={() => setBlocoParaRemover('')}
        onConfirm={() => {
          deleteBloco(blocoParaRemover);
          setBlocoParaRemover('');
          setFeedback('Bloco removido da lista.');
        }}
      />
    </section>
  );
}
