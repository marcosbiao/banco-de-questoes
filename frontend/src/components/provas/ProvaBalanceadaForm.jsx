import { RefreshCcw, Save, Search, Shuffle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { obterCompetenciasPorDisciplina, obterRotuloCompetencia } from '../../constants/competencias.js';
import { DIFICULDADES, obterRotuloDificuldade } from '../../constants/dificuldades.js';
import {
  calcularResumoSelecao,
  criarSeed,
  filtrarQuestoesParaProva,
  gerarProvaBalanceada,
  normalizarTiposQuestao,
  selecionarSubstitutaQuestao,
  validarConfiguracaoProva,
  verificarDisponibilidade,
} from '../../utils/geradorProvaBalanceada.js';
import { tipoOptions } from '../questoes/QuestaoFilters.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorMessage from '../ui/ErrorMessage.jsx';
import Input from '../ui/Input.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import {
  listarAssuntos,
  listarDisciplinas,
  listarQuestoes,
  listarSubassuntos,
  listarTags,
} from '../../services/questoesService.js';

const bloomOptions = [
  { value: 'lembrar', label: 'Lembrar' },
  { value: 'compreender', label: 'Compreender' },
  { value: 'aplicar', label: 'Aplicar' },
  { value: 'analisar', label: 'Analisar' },
  { value: 'avaliar', label: 'Avaliar' },
  { value: 'criar', label: 'Criar' },
];

const quotasDificuldadeVazias = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

const filtrosIniciais = {
  assuntoId: '',
  subassuntoId: '',
  tipos: [],
  niveisBloom: [],
  tagsIds: [],
  somenteComRubrica: false,
  somenteAtivas: true,
};

function valuesArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function normalizarFiltrosForm(filtros = {}) {
  return {
    ...filtrosIniciais,
    ...filtros,
    tipos: normalizarTiposQuestao(filtros.tipos),
    niveisBloom: valuesArray(filtros.niveisBloom),
    tagsIds: valuesArray(filtros.tagsIds || filtros.tagIds),
    somenteComRubrica: Boolean(filtros.somenteComRubrica),
    somenteAtivas: filtros.somenteAtivas !== false,
  };
}

function formInicial(initialData) {
  const configuracao = initialData?.configuracao || {};

  return {
    titulo: initialData?.titulo || '',
    descricao: initialData?.descricao || '',
    disciplinaId: initialData?.disciplinaId || '',
    totalQuestoes: configuracao.totalQuestoes || '',
    quotasDificuldade: { ...quotasDificuldadeVazias, ...(configuracao.quotasDificuldade || {}) },
    quotasCompetencia: configuracao.quotasCompetencia || {},
    filtros: normalizarFiltrosForm(configuracao.filtros),
    seed: configuracao.seed || criarSeed('prova'),
  };
}

function multiValues(event) {
  return Array.from(event.target.selectedOptions).map((option) => option.value);
}

function numberInputValue(value) {
  const numero = Number(value);
  return Number.isInteger(numero) && numero >= 0 ? numero : 0;
}

function somaValores(obj = {}) {
  return Object.values(obj).reduce((total, value) => total + numberInputValue(value), 0);
}

function distribuirIgualmente(total, keys) {
  const totalSeguro = numberInputValue(total);
  const validKeys = keys.filter(Boolean);

  if (!validKeys.length) {
    return {};
  }

  const base = Math.floor(totalSeguro / validKeys.length);
  const resto = totalSeguro % validKeys.length;

  return Object.fromEntries(validKeys.map((key, index) => [key, base + (index < resto ? 1 : 0)]));
}

function uniqueOptions(options = []) {
  return options
    .filter((option) => option?.value)
    .filter((option, index, list) => list.findIndex((item) => item.value === option.value) === index)
    .sort((a, b) => String(a.label || '').localeCompare(String(b.label || ''), 'pt-BR', { sensitivity: 'base' }));
}

function competenciaOptionsFromQuestoes(questoes = []) {
  return uniqueOptions(questoes
    .map((questao) => String(questao.competencia || '').trim().toUpperCase())
    .filter(Boolean)
    .map((competencia) => ({ value: competencia, label: obterRotuloCompetencia(competencia) })));
}

function questoesFromItens(itens = []) {
  return itens
    .slice()
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
    .map((item) => ({
      id: item.questaoId,
      ...item.questaoSnapshot,
      ...item.gabaritoSnapshot,
      questaoSnapshot: item.questaoSnapshot,
      gabaritoSnapshot: item.gabaritoSnapshot,
      rubricaSnapshot: item.rubricaSnapshot || null,
      temRubrica: item.rubricaSnapshot ? true : item.questaoSnapshot?.temRubrica === true,
    }));
}

function tipoLabel(tipo) {
  return tipoOptions.find((option) => option.value === tipo)?.label || tipo || 'Sem tipo';
}

function tiposPermitidosLabel(tipos = []) {
  const normalizados = normalizarTiposQuestao(tipos);

  if (!normalizados.length) {
    return 'Todos';
  }

  return normalizados.map(tipoLabel).join(', ');
}

function bloomLabel(value) {
  return bloomOptions.find((option) => option.value === value)?.label || value || 'Não informado';
}

function statusLabel(status = 'ativa') {
  const labels = {
    ativa: 'Ativa',
    em_revisao: 'Em revisão',
    inativa: 'Inativa',
    arquivada: 'Arquivada',
  };

  return labels[status] || status;
}

function ResumoDistribuicao({ titulo, valores = {}, labels = {} }) {
  const items = Object.entries(valores).filter(([, quantidade]) => quantidade > 0);

  return (
    <div className="prova-summary-box">
      <strong>{titulo}</strong>
      {items.length ? (
        <div className="tag-row">
          {items.map(([key, quantidade]) => (
            <Badge key={key}>{labels[key] || key}: {quantidade}</Badge>
          ))}
        </div>
      ) : <p className="muted-text">Nenhum item.</p>}
    </div>
  );
}

function QuotaStatus({ total, soma }) {
  const restante = total - soma;

  if (restante === 0 && total > 0) {
    return <p className="success-message">Fechou exatamente o total de {total} questões.</p>;
  }

  if (restante < 0) {
    return <p className="error-message">A distribuição ultrapassou o total em {Math.abs(restante)} questões.</p>;
  }

  return <p className="status-message">{soma} configuradas, {restante} restantes.</p>;
}

function ProblemasEncontrados({ problemas = [], sugestoes = [] }) {
  if (!problemas.length) {
    return null;
  }

  return (
    <section className="prova-diagnostics">
      <div className="section-title">
        <p className="eyebrow">Diagnóstico</p>
        <h3>Problemas encontrados</h3>
      </div>
      <div className="diagnostic-list">
        {problemas.map((problema, index) => (
          <div key={`${problema.tipo}-${index}`} className="diagnostic-item">
            <strong>{problema.mensagem}</strong>
            {problema.solicitada !== null && problema.solicitada !== undefined ? (
              <span>Solicitada: {problema.solicitada} · Disponível: {problema.disponivel ?? 0}</span>
            ) : null}
          </div>
        ))}
      </div>
      {sugestoes.length ? (
        <div className="notice-box">
          <strong>Sugestões de ajuste</strong>
          <ul className="simple-list">
            {sugestoes.map((sugestao) => <li key={sugestao}>{sugestao}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export default function ProvaBalanceadaForm({ initialData, mode = 'create', onSave }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => formInicial(initialData));
  const [opcoes, setOpcoes] = useState({ disciplinas: [], assuntos: [], subassuntos: [], tags: [] });
  const [questoesDisciplina, setQuestoesDisciplina] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingQuestoes, setLoadingQuestoes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultado, setResultado] = useState(() => {
    const questoes = questoesFromItens(initialData?.itens || []);
    return questoes.length
      ? {
        ok: true,
        seed: initialData?.configuracao?.seed || '',
        questoesSelecionadas: questoes,
        resumo: calcularResumoSelecao(questoes),
        problemas: [],
      }
      : null;
  });
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    async function loadOptions() {
      setLoadingOptions(true);
      setError('');

      try {
        const [disciplinas, assuntos, subassuntos, tags] = await Promise.all([
          listarDisciplinas(),
          listarAssuntos(),
          listarSubassuntos(),
          listarTags(),
        ]);

        setOpcoes({ disciplinas, assuntos, subassuntos, tags });
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingOptions(false);
      }
    }

    loadOptions();
  }, []);

  useEffect(() => {
    if (!form.disciplinaId) {
      setQuestoesDisciplina([]);
      return;
    }

    async function loadQuestoes() {
      setLoadingQuestoes(true);
      setError('');

      try {
        const questoes = await listarQuestoes({ disciplinaId: form.disciplinaId });
        setQuestoesDisciplina(questoes);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingQuestoes(false);
      }
    }

    loadQuestoes();
  }, [form.disciplinaId]);

  const disciplinaSelecionada = useMemo(
    () => opcoes.disciplinas.find((disciplina) => disciplina.id === form.disciplinaId),
    [form.disciplinaId, opcoes.disciplinas],
  );

  const filtrosComDisciplina = useMemo(() => ({
    ...form.filtros,
    disciplinaId: form.disciplinaId,
  }), [form.disciplinaId, form.filtros]);

  const candidatosFiltrados = useMemo(
    () => filtrarQuestoesParaProva(questoesDisciplina, filtrosComDisciplina),
    [filtrosComDisciplina, questoesDisciplina],
  );

  const competenciasCatalogo = useMemo(() => {
    const catalogo = obterCompetenciasPorDisciplina(disciplinaSelecionada?.nome);
    if (catalogo.length) return catalogo;
    return competenciaOptionsFromQuestoes(questoesDisciplina);
  }, [disciplinaSelecionada?.nome, questoesDisciplina]);

  const assuntoOptions = useMemo(() => opcoes.assuntos
    .filter((assunto) => !form.disciplinaId || assunto.disciplinaId === form.disciplinaId)
    .map((assunto) => ({ value: assunto.id, label: assunto.nome })), [form.disciplinaId, opcoes.assuntos]);

  const subassuntoOptions = useMemo(() => opcoes.subassuntos
    .filter((subassunto) => !form.filtros.assuntoId || subassunto.assuntoId === form.filtros.assuntoId)
    .map((subassunto) => ({ value: subassunto.id, label: subassunto.nome })), [form.filtros.assuntoId, opcoes.subassuntos]);

  const configuracao = useMemo(() => ({
    titulo: form.titulo,
    disciplinaId: form.disciplinaId,
    totalQuestoes: numberInputValue(form.totalQuestoes),
    quotasDificuldade: form.quotasDificuldade,
    quotasCompetencia: form.quotasCompetencia,
    filtros: form.filtros,
    seed: form.seed,
  }), [form]);

  const validacao = useMemo(() => validarConfiguracaoProva(configuracao), [configuracao]);
  const disponibilidade = useMemo(
    () => verificarDisponibilidade(candidatosFiltrados, configuracao),
    [candidatosFiltrados, configuracao],
  );

  const totalQuestoes = numberInputValue(form.totalQuestoes);
  const somaDificuldade = somaValores(form.quotasDificuldade);
  const somaCompetencia = somaValores(form.quotasCompetencia);
  const competenciasSelecionadas = Object.keys(form.quotasCompetencia).filter((competencia) => form.quotasCompetencia[competencia] >= 0);
  const podeGerar = validacao.valida && !loadingQuestoes && form.disciplinaId && candidatosFiltrados.length > 0;
  const resumoAtual = resultado?.questoesSelecionadas?.length ? calcularResumoSelecao(resultado.questoesSelecionadas) : null;

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setResultado(null);
    setFeedback('');
  }

  function updateFiltro(field, value) {
    const nextValue = field === 'tipos' ? normalizarTiposQuestao(value) : value;

    setForm((current) => ({
      ...current,
      filtros: {
        ...current.filtros,
        [field]: nextValue,
        ...(field === 'assuntoId' ? { subassuntoId: '' } : {}),
      },
    }));
    setResultado(null);
    setFeedback('');
  }

  function toggleTipoQuestao(tipo, checked) {
    const tipoNormalizado = normalizarTiposQuestao([tipo])[0];
    const atuais = normalizarTiposQuestao(form.filtros.tipos);

    if (!tipoNormalizado) {
      return;
    }

    updateFiltro('tipos', checked
      ? [...new Set([...atuais, tipoNormalizado])]
      : atuais.filter((item) => item !== tipoNormalizado));
  }

  function updateDisciplina(disciplinaId) {
    setForm((current) => ({
      ...current,
      disciplinaId,
      filtros: {
        ...current.filtros,
        assuntoId: '',
        subassuntoId: '',
      },
      quotasCompetencia: {},
    }));
    setResultado(null);
    setFeedback('');
  }

  function updateQuotaDificuldade(dificuldade, value) {
    setForm((current) => ({
      ...current,
      quotasDificuldade: {
        ...current.quotasDificuldade,
        [dificuldade]: numberInputValue(value),
      },
    }));
    setResultado(null);
    setFeedback('');
  }

  function toggleCompetencia(competencia, checked) {
    setForm((current) => {
      const next = { ...current.quotasCompetencia };

      if (checked) {
        next[competencia] = next[competencia] ?? 0;
      } else {
        delete next[competencia];
      }

      return { ...current, quotasCompetencia: next };
    });
    setResultado(null);
    setFeedback('');
  }

  function updateQuotaCompetencia(competencia, value) {
    setForm((current) => ({
      ...current,
      quotasCompetencia: {
        ...current.quotasCompetencia,
        [competencia]: numberInputValue(value),
      },
    }));
    setResultado(null);
    setFeedback('');
  }

  function distribuirDificuldades() {
    setForm((current) => ({
      ...current,
      quotasDificuldade: distribuirIgualmente(current.totalQuestoes, DIFICULDADES.map((dificuldade) => String(dificuldade.value))),
    }));
    setResultado(null);
  }

  function distribuirCompetencias() {
    setForm((current) => ({
      ...current,
      quotasCompetencia: distribuirIgualmente(current.totalQuestoes, Object.keys(current.quotasCompetencia)),
    }));
    setResultado(null);
  }

  function gerar(seed = form.seed) {
    setError('');
    setFeedback('');

    const config = { ...configuracao, seed };
    const validacaoAtual = validarConfiguracaoProva(config);

    if (!validacaoAtual.valida) {
      setError(validacaoAtual.erros[0]);
      return;
    }

    if (!candidatosFiltrados.length) {
      setError('Não há candidatos compatíveis com os filtros básicos.');
      return;
    }

    const data = gerarProvaBalanceada(candidatosFiltrados, config);
    setForm((current) => ({ ...current, seed: data.seed }));
    setResultado(data);

    if (data.ok) {
      setFeedback('Prova gerada. Revise a seleção antes de salvar.');
      return;
    }

    setError(data.problemas[0]?.mensagem || 'Não foi possível gerar uma combinação válida.');
  }

  function gerarOutraCombinacao() {
    gerar(criarSeed('prova'));
  }

  function substituirQuestao(questao) {
    const substituta = selecionarSubstitutaQuestao(
      candidatosFiltrados,
      questao,
      resultado?.questoesSelecionadas || [],
      criarSeed('substituir'),
    );

    if (!substituta) {
      setError('Não há outra questão disponível com esta competência e dificuldade.');
      return;
    }

    const nextSelecionadas = resultado.questoesSelecionadas.map((item) => (item.id === questao.id ? substituta : item));
    setResultado((current) => ({
      ...current,
      ok: true,
      questoesSelecionadas: nextSelecionadas,
      resumo: calcularResumoSelecao(nextSelecionadas),
      problemas: [],
    }));
    setError('');
    setFeedback('Questão substituída mantendo competência e dificuldade.');
  }

  async function handleSalvar() {
    if (!resultado?.ok || !resultado.questoesSelecionadas?.length) {
      setError('Gere e revise a prova antes de salvar.');
      return;
    }

    setSaving(true);
    setError('');
    setFeedback('');

    try {
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao,
        disciplinaId: form.disciplinaId,
        disciplinaNome: disciplinaSelecionada?.nome || initialData?.disciplinaNome || '',
        status: initialData?.status || 'rascunho',
        tipoGeracao: 'balanceada',
        configuracao: {
          totalQuestoes,
          quotasDificuldade: form.quotasDificuldade,
          quotasCompetencia: form.quotasCompetencia,
          filtros: form.filtros,
          seed: form.seed,
        },
        questoesSelecionadas: resultado.questoesSelecionadas,
        resumo: calcularResumoSelecao(resultado.questoesSelecionadas),
      };
      const saved = await onSave(payload);
      navigate(`/provas/${saved.id}`);
    } catch (apiError) {
      setError(apiError.message || 'Não foi possível salvar a prova.');
    } finally {
      setSaving(false);
    }
  }

  if (loadingOptions) {
    return <LoadingState message="Carregando opções da prova..." />;
  }

  const dificuldadeLabels = Object.fromEntries(DIFICULDADES.map((dificuldade) => [String(dificuldade.value), dificuldade.label]));
  const tipoLabels = Object.fromEntries(tipoOptions.map((tipo) => [tipo.value, tipo.label]));
  const tiposPermitidosTexto = tiposPermitidosLabel(form.filtros.tipos);

  return (
    <section className="builder-grid">
      <div className="form-panel">
        <div className="section-title">
          <p className="eyebrow">Configuração</p>
          <h3>Dados básicos</h3>
        </div>
        <div className="form-grid">
          <Input label="Título da prova" name="titulo-prova" requiredMark value={form.titulo} onChange={(event) => updateForm('titulo', event.target.value)} />
          <Input label="Total de questões" name="total-questoes" type="number" min="1" step="1" requiredMark value={form.totalQuestoes} onChange={(event) => updateForm('totalQuestoes', numberInputValue(event.target.value))} />
          <Select
            label="Disciplina"
            name="disciplina-prova"
            requiredMark
            value={form.disciplinaId}
            options={opcoes.disciplinas.map((disciplina) => ({ value: disciplina.id, label: disciplina.nome }))}
            onChange={(event) => updateDisciplina(event.target.value)}
          />
          <Textarea label="Descrição ou observação" name="descricao-prova" className="span-2" rows={3} value={form.descricao} onChange={(event) => updateForm('descricao', event.target.value)} />
        </div>

        <div className="section-title inline-title">
          <div>
            <p className="eyebrow">Filtros</p>
            <h3>Banco de candidatos</h3>
          </div>
          {loadingQuestoes ? <Badge variant="warning">Carregando questões</Badge> : <Badge>{candidatosFiltrados.length} candidatas</Badge>}
        </div>
        <div className="form-grid compact">
          <Select label="Assunto" name="assunto-prova" value={form.filtros.assuntoId} options={assuntoOptions} onChange={(event) => updateFiltro('assuntoId', event.target.value)} />
          <Select label="Subassunto" name="subassunto-prova" value={form.filtros.subassuntoId} options={subassuntoOptions} disabled={!form.filtros.assuntoId} onChange={(event) => updateFiltro('subassuntoId', event.target.value)} />
          <div className="field tipo-checkbox-panel">
            <span>Tipos de questão</span>
            <div className="checkbox-actions">
              <Button type="button" variant="secondary" size="sm" onClick={() => updateFiltro('tipos', tipoOptions.map((tipo) => tipo.value))}>
                Selecionar todos
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => updateFiltro('tipos', [])}>
                Limpar seleção
              </Button>
            </div>
            <div className="checkbox-option-list">
              {tipoOptions.map((tipo) => (
                <label key={tipo.value} className="mini-check">
                  <input
                    type="checkbox"
                    checked={normalizarTiposQuestao(form.filtros.tipos).includes(tipo.value)}
                    onChange={(event) => toggleTipoQuestao(tipo.value, event.target.checked)}
                  />
                  <span>{tipo.label}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="field" htmlFor="bloom-prova">
            <span>Níveis de Bloom permitidos</span>
            <select id="bloom-prova" className="input multi-select" multiple value={form.filtros.niveisBloom} onChange={(event) => updateFiltro('niveisBloom', multiValues(event))}>
              {bloomOptions.map((nivel) => <option key={nivel.value} value={nivel.value}>{nivel.label}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="tags-prova">
            <span>Tags</span>
            <select id="tags-prova" className="input multi-select" multiple value={form.filtros.tagsIds} onChange={(event) => updateFiltro('tagsIds', multiValues(event))}>
              {opcoes.tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.nome}</option>)}
            </select>
          </label>
          <div className="check-stack">
            <label className="check-field compact-check">
              <input type="checkbox" checked={form.filtros.somenteComRubrica} onChange={(event) => updateFiltro('somenteComRubrica', event.target.checked)} />
              <span>Somente questões com rubrica</span>
            </label>
            <label className="check-field compact-check">
              <input type="checkbox" checked={form.filtros.somenteAtivas} onChange={(event) => updateFiltro('somenteAtivas', event.target.checked)} />
              <span>Somente questões ativas</span>
            </label>
          </div>
        </div>

        <div className="section-title inline-title">
          <div>
            <p className="eyebrow">Dificuldade</p>
            <h3>Distribuição por dificuldade</h3>
          </div>
          <Button type="button" variant="secondary" icon={RefreshCcw} onClick={distribuirDificuldades}>
            Distribuir igualmente
          </Button>
        </div>
        <QuotaStatus total={totalQuestoes} soma={somaDificuldade} />
        <div className="quota-grid">
          {DIFICULDADES.map((dificuldade) => (
            <Input
              key={dificuldade.value}
              label={dificuldade.label}
              name={`dificuldade-${dificuldade.value}`}
              type="number"
              min="0"
              step="1"
              value={form.quotasDificuldade[dificuldade.value] ?? 0}
              onChange={(event) => updateQuotaDificuldade(dificuldade.value, event.target.value)}
            />
          ))}
        </div>

        <div className="section-title inline-title">
          <div>
            <p className="eyebrow">Competências</p>
            <h3>Distribuição por competência</h3>
          </div>
          <Button type="button" variant="secondary" icon={RefreshCcw} disabled={!competenciasSelecionadas.length} onClick={distribuirCompetencias}>
            Distribuir igualmente
          </Button>
        </div>
        <QuotaStatus total={totalQuestoes} soma={somaCompetencia} />
        {!form.disciplinaId ? (
          <EmptyState title="Selecione uma disciplina" description="As competências serão carregadas de acordo com a disciplina escolhida." />
        ) : null}
        {form.disciplinaId && !competenciasCatalogo.length && !loadingQuestoes ? (
          <EmptyState title="Nenhuma competência encontrada" description="Cadastre competências nas questões desta disciplina para usar a geração balanceada." />
        ) : null}
        <div className="competencia-quota-list">
          {competenciasCatalogo.map((competencia) => {
            const checked = Object.prototype.hasOwnProperty.call(form.quotasCompetencia, competencia.value);

            return (
              <div key={competencia.value} className="competencia-quota-row">
                <label className="mini-check">
                  <input type="checkbox" checked={checked} onChange={(event) => toggleCompetencia(competencia.value, event.target.checked)} />
                  <span>{competencia.label}</span>
                </label>
                <Input
                  label="Quantidade"
                  name={`quota-${competencia.value}`}
                  type="number"
                  min="0"
                  step="1"
                  value={checked ? form.quotasCompetencia[competencia.value] : 0}
                  disabled={!checked}
                  onChange={(event) => updateQuotaCompetencia(competencia.value, event.target.value)}
                />
              </div>
            );
          })}
        </div>

        <div className="form-footer">
          {feedback ? <p className="success-message">{feedback}</p> : null}
          <ErrorMessage message={error} />
          {validacao.erros.map((mensagem) => <p key={mensagem} className="error-message">{mensagem}</p>)}
          {!loadingQuestoes && form.disciplinaId && candidatosFiltrados.length === 0 ? <p className="error-message">Não há candidatos compatíveis com os filtros básicos.</p> : null}
          <Button type="button" icon={Search} disabled={!podeGerar} onClick={() => gerar()}>
            Gerar prova
          </Button>
          <Button type="button" variant="secondary" icon={Shuffle} disabled={!resultado?.ok} onClick={gerarOutraCombinacao}>
            Gerar outra combinação
          </Button>
          <Button type="button" icon={Save} disabled={saving || !resultado?.ok} onClick={handleSalvar}>
            {saving ? 'Salvando...' : mode === 'edit' ? 'Salvar alterações' : 'Salvar prova'}
          </Button>
        </div>
      </div>

      <div className="preview-panel">
        <div className="section-title inline-title">
          <div>
            <p className="eyebrow">Revisão</p>
            <h3>Prévia da seleção</h3>
          </div>
          {resultado?.ok ? <Badge variant="success">{resultado.questoesSelecionadas.length} questões</Badge> : null}
        </div>

        {loadingQuestoes ? <LoadingState message="Carregando candidatos..." /> : null}

        <div className="prova-filter-summary">
          <strong>Tipos permitidos</strong>
          <span>{tiposPermitidosTexto}</span>
        </div>

        {!resultado?.ok ? (
          <>
            <div className="prova-summary-grid">
              <div className="prova-summary-box">
                <strong>Candidatas filtradas</strong>
                <span>{candidatosFiltrados.length}</span>
              </div>
              <div className="prova-summary-box">
                <strong>Competências configuradas</strong>
                <span>{Object.keys(form.quotasCompetencia).length}</span>
              </div>
            </div>
            <ProblemasEncontrados problemas={resultado?.problemas || disponibilidade.problemas.filter((problema) => problema.tipo !== 'celula_sem_candidatas')} sugestoes={disponibilidade.sugestoes} />
            {!resultado?.problemas?.length ? (
              <EmptyState title="Nenhuma prova gerada" description="Configure as quotas e gere uma seleção para revisar." />
            ) : null}
          </>
        ) : null}

        {resultado?.ok ? (
          <div className="lista-review">
            <div className="prova-summary-grid">
              <div className="prova-summary-box">
                <strong>Total</strong>
                <span>{resultado.questoesSelecionadas.length}</span>
              </div>
              <div className="prova-summary-box">
                <strong>Com rubrica</strong>
                <span>{resumoAtual?.comRubrica || 0}</span>
              </div>
              <div className="prova-summary-box">
                <strong>Sem rubrica</strong>
                <span>{resumoAtual?.semRubrica || 0}</span>
              </div>
            </div>

            <ResumoDistribuicao titulo="Por competência" valores={resumoAtual?.porCompetencia} />
            <ResumoDistribuicao titulo="Por dificuldade" valores={resumoAtual?.porDificuldade} labels={dificuldadeLabels} />
            <ResumoDistribuicao titulo="Por tipo" valores={resumoAtual?.porTipo} labels={tipoLabels} />

            {resultado.questoesSelecionadas.map((questao, index) => (
              <article key={`${questao.id}-${index}`} className="prova-question-review">
                <div className="review-question-number">{index + 1}.</div>
                <div className="prova-question-body">
                  <p className="review-question-text">{questao.enunciado}</p>
                  <div className="meta-grid">
                    <span>{tipoLabel(questao.tipo)}</span>
                    <span>{questao.assunto || questao.assuntoNome || 'Sem assunto'}</span>
                    <span>{questao.subassunto || questao.subassuntoNome || 'Sem subassunto'}</span>
                    <span>{questao.competencia || 'Sem competência'}</span>
                    <span>{obterRotuloDificuldade(questao.dificuldade)}</span>
                    <span>Bloom: {bloomLabel(questao.nivelBloom)}</span>
                    <span>{questao.temRubrica === true ? 'Com rubrica' : 'Sem rubrica'}</span>
                    <span>{statusLabel(questao.status)}</span>
                  </div>
                </div>
                <div className="icon-actions">
                  <Button type="button" variant="secondary" size="sm" icon={Shuffle} onClick={() => substituirQuestao(questao)}>
                    Substituir
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
