import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import QuestaoCard from '../components/questoes/QuestaoCard.jsx';
import QuestaoFilters from '../components/questoes/QuestaoFilters.jsx';
import RubricaQuestaoModal from '../components/questoes/RubricaQuestaoModal.jsx';
import {
  baixarJsonExportacao,
  montarExportacaoQuestoes,
  montarExportacaoQuestoesComRubricas,
  montarFiltrosAplicadosExportacao,
  nomeArquivoExportacao,
} from '../services/exportacaoQuestoesService.js';
import { METADADOS_ATUALIZADOS_EVENT } from '../services/firebase/limpezaMetadadosService.js';
import { listarListasPorQuestao } from '../services/listasService.js';
import {
  arquivarQuestao,
  buscarQuestoesComFiltros,
  excluirQuestaoComDependencias,
  listarFontes,
  listarAssuntos,
  listarDisciplinas,
  listarSubassuntos,
  listarTags,
} from '../services/questoesService.js';
import {
  clonarFiltrosQuestao,
  possuiBuscaTextualSemFiltroConsultavel,
  possuiFiltroBuscaValido,
} from '../utils/questoesFiltros.js';

const PAGE_SIZE = 20;

const filtrosIniciais = {
  search: '',
  disciplinaId: '',
  assuntoId: '',
  subassuntoId: '',
  tipo: '',
  dificuldade: '',
  competencia: '',
  nivelBloom: '',
  status: '',
  fonteId: '',
  rubrica: 'todas',
  tagIds: [],
};

const CONFIRMACAO_EXCLUSAO_QUESTAO = 'Tem certeza que deseja excluir esta questão? Esta ação não poderá ser desfeita. A rubrica associada também será removida, caso exista.';

function criarFiltrosIniciais() {
  return {
    ...filtrosIniciais,
    tagIds: [],
  };
}

function mensagemFiltroObrigatorio(filtros) {
  if (possuiBuscaTextualSemFiltroConsultavel(filtros)) {
    return 'Use a busca junto com pelo menos um filtro, como disciplina, assunto, fonte, tag, dificuldade, status ou rubrica.';
  }

  return 'Selecione pelo menos um filtro para realizar a busca.';
}

function descricaoExclusaoQuestao(listas = []) {
  if (!listas.length) {
    return CONFIRMACAO_EXCLUSAO_QUESTAO;
  }

  const primeirasListas = listas.slice(0, 5);
  const restantes = listas.length - primeirasListas.length;

  return (
    <>
      <p>Esta questão está presente em {listas.length} lista(s):</p>
      <ul>
        {primeirasListas.map((lista) => (
          <li key={lista.id}>
            {lista.titulo || 'Lista sem título'}
            {lista.status ? ` (${lista.status})` : ''}
          </li>
        ))}
        {restantes > 0 ? <li>e mais {restantes} lista(s).</li> : null}
      </ul>
      <p>Se você excluir esta questão, ela deixará de aparecer nas prévias e PDFs dessas listas.</p>
      <p>A rubrica associada também será removida, caso exista.</p>
      <p>Deseja excluir mesmo assim? Esta ação não poderá ser desfeita.</p>
    </>
  );
}

export default function QuestoesPage() {
  const [filtrosDraft, setFiltrosDraft] = useState(() => criarFiltrosIniciais());
  const [filtrosDaBuscaAtual, setFiltrosDaBuscaAtual] = useState(null);
  const [opcoes, setOpcoes] = useState({ disciplinas: [], assuntos: [], subassuntos: [], tags: [], fontes: [] });
  const [questoes, setQuestoes] = useState([]);
  const [buscaExecutada, setBuscaExecutada] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ultimoDocumento, setUltimoDocumento] = useState(null);
  const [temMaisResultados, setTemMaisResultados] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [arquivarId, setArquivarId] = useState('');
  const [arquivando, setArquivando] = useState(false);
  const [excluirId, setExcluirId] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [verificandoExclusao, setVerificandoExclusao] = useState(false);
  const [listasVinculadasExclusao, setListasVinculadasExclusao] = useState([]);
  const [rubricaQuestao, setRubricaQuestao] = useState(null);
  const [exportando, setExportando] = useState('');
  const canBuscar = possuiFiltroBuscaValido(filtrosDraft) && !loadingOptions;

  useEffect(() => {
    let mounted = true;

    async function loadOptions() {
      setLoadingOptions(true);
      const [disciplinas, assuntos, subassuntos, tags, fontes] = await Promise.all([
        listarDisciplinas(),
        listarAssuntos(),
        listarSubassuntos(),
        listarTags(),
        listarFontes(),
      ]);

      if (mounted) {
        setOpcoes({ disciplinas, assuntos, subassuntos, tags, fontes });
        setLoadingOptions(false);
      }
    }

    if (import.meta.env.DEV) {
      console.info('[Banco de questões] Página aberta sem consulta à coleção questoes.');
    }

    loadOptions().catch((apiError) => {
      if (mounted) {
        setError(apiError.message);
        setLoadingOptions(false);
      }
    });

    function handleMetadadosAtualizados() {
      loadOptions().catch((apiError) => {
        if (mounted) {
          setError(apiError.message);
          setLoadingOptions(false);
        }
      });
    }

    window.addEventListener(METADADOS_ATUALIZADOS_EVENT, handleMetadadosAtualizados);

    return () => {
      mounted = false;
      window.removeEventListener(METADADOS_ATUALIZADOS_EVENT, handleMetadadosAtualizados);
    };
  }, []);

  async function executarBusca({ filtros, ultimo = null, append = false }) {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const resultado = await buscarQuestoesComFiltros(filtros, {
        limite: PAGE_SIZE,
        ultimoDocumento: ultimo,
        metadados: opcoes,
      });

      setQuestoes((current) => {
        if (!append) {
          return resultado.questoes;
        }

        const idsAtuais = new Set(current.map((questao) => questao.id));
        const novasQuestoes = resultado.questoes.filter((questao) => !idsAtuais.has(questao.id));

        return [...current, ...novasQuestoes];
      });
      setUltimoDocumento(resultado.ultimoDocumento);
      setTemMaisResultados(resultado.temMaisResultados);
      setFiltrosDaBuscaAtual(resultado.filtros);
      setBuscaExecutada(true);
    } catch (apiError) {
      console.error('Erro ao buscar questões com filtros:', apiError);
      setError(apiError.message || 'Não foi possível buscar questões.');
      if (!append) {
        setQuestoes([]);
        setUltimoDocumento(null);
        setTemMaisResultados(false);
        setBuscaExecutada(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleBuscarQuestoes() {
    if (!possuiFiltroBuscaValido(filtrosDraft)) {
      setError(mensagemFiltroObrigatorio(filtrosDraft));
      return;
    }

    setQuestoes([]);
    setUltimoDocumento(null);
    setTemMaisResultados(false);
    setFiltrosDaBuscaAtual(clonarFiltrosQuestao(filtrosDraft));
    await executarBusca({ filtros: filtrosDraft });
  }

  async function handleCarregarMais() {
    if (!filtrosDaBuscaAtual || !ultimoDocumento || loading || !temMaisResultados) {
      return;
    }

    await executarBusca({
      filtros: filtrosDaBuscaAtual,
      ultimo: ultimoDocumento,
      append: true,
    });
  }

  function handleLimparFiltros() {
    setFiltrosDraft(criarFiltrosIniciais());
    setFiltrosDaBuscaAtual(null);
    setQuestoes([]);
    setUltimoDocumento(null);
    setTemMaisResultados(false);
    setBuscaExecutada(false);
    setError('');
    setMessage('');
  }

  async function handleArquivar(id) {
    setError('');
    setMessage('');
    setArquivando(true);

    try {
      const questaoArquivada = await arquivarQuestao(id);
      setQuestoes((current) => {
        if (filtrosDaBuscaAtual?.status && questaoArquivada.status !== filtrosDaBuscaAtual.status) {
          return current.filter((questao) => questao.id !== id);
        }

        return current.map((questao) => (questao.id === id ? { ...questao, ...questaoArquivada } : questao));
      });
      setArquivarId('');
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setArquivando(false);
    }
  }

  async function handleExcluir(id) {
    setError('');
    setMessage('');
    setExcluindo(true);

    try {
      await excluirQuestaoComDependencias(id);
      setQuestoes((current) => current.filter((questao) => questao.id !== id));
      setExcluirId('');
      setListasVinculadasExclusao([]);
      setMessage('Questão excluída com sucesso.');
    } catch (apiError) {
      setError(apiError.message || 'Não foi possível excluir a questão.');
    } finally {
      setExcluindo(false);
    }
  }

  async function handleSolicitarExclusao(id) {
    setError('');
    setMessage('');
    setListasVinculadasExclusao([]);
    setVerificandoExclusao(true);

    try {
      const listasVinculadas = await listarListasPorQuestao(id);
      setListasVinculadasExclusao(listasVinculadas);
      setExcluirId(id);
    } catch {
      setError('Não foi possível verificar se esta questão está vinculada a alguma lista. A questão não foi excluída.');
    } finally {
      setVerificandoExclusao(false);
    }
  }

  function cancelarExclusao() {
    setExcluirId('');
    setListasVinculadasExclusao([]);
  }

  function handleAbrirRubrica(questao) {
    setError('');
    setMessage('');
    setRubricaQuestao(questao);
  }

  function atualizarQuestaoNaListaPorRubrica(questaoAtualizada, mensagem) {
    setQuestoes((current) => {
      if (!questaoAtualizada?.id) {
        return current;
      }

      const removerPorFiltroRubrica = (
        (filtrosDaBuscaAtual?.rubrica === 'com' && questaoAtualizada.temRubrica !== true)
        || (filtrosDaBuscaAtual?.rubrica === 'sem' && questaoAtualizada.temRubrica === true)
      );

      if (removerPorFiltroRubrica) {
        return current.filter((questao) => questao.id !== questaoAtualizada.id);
      }

      return current.map((questao) => (
        questao.id === questaoAtualizada.id ? { ...questao, ...questaoAtualizada } : questao
      ));
    });
    setRubricaQuestao(null);
    setMessage(mensagem);
  }

  function filtrosParaExportacao() {
    return montarFiltrosAplicadosExportacao(filtrosDaBuscaAtual || criarFiltrosIniciais(), opcoes);
  }

  function handleExportarSemRubricas() {
    if (!questoes.length) {
      setMessage('Nenhuma questão filtrada para exportar.');
      return;
    }

    setError('');
    setMessage('');

    try {
      const payload = montarExportacaoQuestoes(questoes, {
        filtrosAplicados: filtrosParaExportacao(),
      });
      baixarJsonExportacao(payload, nomeArquivoExportacao({ incluiRubricas: false }));
      setMessage('Exportação gerada com sucesso.');
    } catch (apiError) {
      setError(apiError.message || 'Não foi possível gerar a exportação.');
    }
  }

  async function handleExportarComRubricas() {
    if (!questoes.length) {
      setMessage('Nenhuma questão filtrada para exportar.');
      return;
    }

    if (questoes.length > 50) {
      const confirmado = window.confirm(
        `Serão buscadas rubricas para ${questoes.length} questões. Isso pode gerar ${questoes.length} leituras no Firestore. Deseja continuar?`,
      );

      if (!confirmado) {
        setMessage('Exportação com rubricas cancelada.');
        return;
      }
    }

    setError('');
    setMessage('Buscando rubricas das questões filtradas...');
    setExportando('rubricas');

    try {
      const payload = await montarExportacaoQuestoesComRubricas(questoes, {
        filtrosAplicados: filtrosParaExportacao(),
      });
      baixarJsonExportacao(payload, nomeArquivoExportacao({ incluiRubricas: true }));
      setMessage(
        payload.avisos?.length
          ? `Exportação com rubricas gerada com sucesso, com ${payload.avisos.length} aviso(s).`
          : 'Exportação com rubricas gerada com sucesso.',
      );
    } catch (apiError) {
      setError(apiError.message || 'Não foi possível gerar a exportação.');
    } finally {
      setExportando('');
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Acervo</p>
          <h2>Banco de questões</h2>
        </div>
      </div>

      <QuestaoFilters
        filtros={filtrosDraft}
        opcoes={opcoes}
        onChange={setFiltrosDraft}
        onApply={handleBuscarQuestoes}
        onClear={handleLimparFiltros}
        canApply={canBuscar}
        applying={loading}
      />

      {loadingOptions ? <LoadingState message="Carregando filtros..." /> : null}
      {!loadingOptions && !canBuscar && !buscaExecutada && !error ? (
        <p className="status-message">{mensagemFiltroObrigatorio(filtrosDraft)}</p>
      ) : null}
      {buscaExecutada && !loading && !error ? <p className="status-message">{questoes.length} questões carregadas.</p> : null}
      {loading ? <LoadingState message="Buscando questões..." /> : null}
      {verificandoExclusao ? <LoadingState message="Verificando listas vinculadas..." /> : null}
      {exportando ? <LoadingState message="Buscando rubricas das questões filtradas..." /> : null}
      <ErrorMessage message={error} />
      {message ? <div className="message-box message-box-success">{message}</div> : null}

      {buscaExecutada && !loading && !error ? (
        <section className="card export-filtered-card">
          <div>
            <p className="eyebrow">Exportação filtrada</p>
            <h3>Exportar {questoes.length} questões carregadas</h3>
            <p className="status-message">
              {questoes.length
                ? 'O JSON usa exatamente as questões carregadas agora na tela.'
                : 'Nenhuma questão filtrada para exportar.'}
            </p>
          </div>
          <div className="card-actions">
            <Button type="button" variant="secondary" icon={Download} disabled={!questoes.length || Boolean(exportando)} onClick={handleExportarSemRubricas}>
              Exportar JSON
            </Button>
            <Button type="button" icon={Download} disabled={!questoes.length || Boolean(exportando)} onClick={handleExportarComRubricas}>
              Exportar JSON com rubricas
            </Button>
          </div>
        </section>
      ) : null}

      {!loadingOptions && !buscaExecutada && !loading && !error ? (
        <EmptyState title="Selecione pelo menos um filtro e clique em Buscar questões." description="A página carrega somente os filtros ao abrir; as questões serão consultadas sob demanda." />
      ) : null}

      {buscaExecutada && !loading && !error && questoes.length === 0 ? (
        <EmptyState title="Nenhuma questão foi encontrada com os filtros selecionados." description="Ajuste os filtros e clique em Buscar questões novamente." />
      ) : null}

      <section className="questoes-list">
        {questoes.map((questao) => (
          <QuestaoCard
            key={questao.id}
            questao={questao}
            onArquivar={setArquivarId}
            onExcluir={handleSolicitarExclusao}
            onRubrica={handleAbrirRubrica}
          />
        ))}
      </section>

      {buscaExecutada && questoes.length > 0 ? (
        <div className="card-actions questoes-pagination-actions">
          <Button type="button" variant="secondary" onClick={handleCarregarMais} disabled={loading || !temMaisResultados}>
            {temMaisResultados ? 'Carregar mais' : 'Não há mais resultados'}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(arquivarId)}
        title="Arquivar questão?"
        description="A questão deixará de aparecer nas listas ativas, mas continuará disponível no filtro de arquivadas."
        confirmLabel="Arquivar"
        confirmVariant="warning"
        loading={arquivando}
        onCancel={() => setArquivarId('')}
        onConfirm={() => handleArquivar(arquivarId)}
      />

      <ConfirmDialog
        open={Boolean(excluirId)}
        title={listasVinculadasExclusao.length ? 'Excluir questão vinculada a listas?' : 'Excluir questão?'}
        description={descricaoExclusaoQuestao(listasVinculadasExclusao)}
        confirmLabel="Excluir"
        danger
        loading={excluindo}
        onCancel={cancelarExclusao}
        onConfirm={() => handleExcluir(excluirId)}
      />

      <RubricaQuestaoModal
        open={Boolean(rubricaQuestao)}
        questao={rubricaQuestao}
        onClose={() => setRubricaQuestao(null)}
        onSaved={(questaoAtualizada) => atualizarQuestaoNaListaPorRubrica(questaoAtualizada, 'Rubrica salva com sucesso.')}
        onDeleted={(questaoAtualizada) => atualizarQuestaoNaListaPorRubrica(questaoAtualizada, 'Rubrica removida com sucesso.')}
      />
    </div>
  );
}
