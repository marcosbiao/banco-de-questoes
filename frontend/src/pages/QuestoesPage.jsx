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
import { listarListasPorQuestao } from '../services/listasService.js';
import {
  arquivarQuestao,
  excluirQuestaoComDependencias,
  listarAssuntos,
  listarDisciplinas,
  listarQuestoes,
  listarSubassuntos,
  listarTags,
} from '../services/questoesService.js';

const filtrosIniciais = {
  search: '',
  disciplinaId: '',
  assuntoId: '',
  subassuntoId: '',
  tipo: '',
  dificuldade: '',
  competencia: '',
  status: '',
  rubrica: 'todas',
  tagIds: [],
};

const CONFIRMACAO_EXCLUSAO_QUESTAO = 'Tem certeza que deseja excluir esta questão? Esta ação não poderá ser desfeita. A rubrica associada também será removida, caso exista.';

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
  const [filtrosDraft, setFiltrosDraft] = useState(filtrosIniciais);
  const [filtrosAplicados, setFiltrosAplicados] = useState(filtrosIniciais);
  const [opcoes, setOpcoes] = useState({ disciplinas: [], assuntos: [], subassuntos: [], tags: [] });
  const [questoes, setQuestoes] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    async function loadOptions() {
      const [disciplinas, assuntos, subassuntos, tags] = await Promise.all([
        listarDisciplinas(),
        listarAssuntos(),
        listarSubassuntos(),
        listarTags(),
      ]);

      setOpcoes({ disciplinas, assuntos, subassuntos, tags });
    }

    loadOptions().catch((apiError) => setError(apiError.message));
  }, []);

  useEffect(() => {
    async function loadQuestoes(params) {
      setLoading(true);
      setError('');

      try {
        const data = await listarQuestoes(params);
        setQuestoes(data);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    }

    loadQuestoes(filtrosAplicados);
  }, [filtrosAplicados]);

  async function handleArquivar(id) {
    setError('');
    setMessage('');
    setArquivando(true);

    try {
      const questaoArquivada = await arquivarQuestao(id);
      setQuestoes((current) => {
        if (filtrosAplicados.status === 'ativa') {
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
        (filtrosAplicados.rubrica === 'com' && questaoAtualizada.temRubrica !== true)
        || (filtrosAplicados.rubrica === 'sem' && questaoAtualizada.temRubrica === true)
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
    return montarFiltrosAplicadosExportacao(filtrosAplicados, opcoes);
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
        onApply={() => setFiltrosAplicados(filtrosDraft)}
        onClear={() => {
          setFiltrosDraft(filtrosIniciais);
          setFiltrosAplicados(filtrosIniciais);
        }}
      />

      {!loading && !error ? <p className="status-message">{questoes.length} questões encontradas.</p> : null}
      {loading ? <LoadingState message="Carregando questões..." /> : null}
      {verificandoExclusao ? <LoadingState message="Verificando listas vinculadas..." /> : null}
      {exportando ? <LoadingState message="Buscando rubricas das questões filtradas..." /> : null}
      <ErrorMessage message={error} />
      {message ? <div className="message-box message-box-success">{message}</div> : null}

      {!loading && !error ? (
        <section className="card export-filtered-card">
          <div>
            <p className="eyebrow">Exportação filtrada</p>
            <h3>Exportar {questoes.length} questões filtradas</h3>
            <p className="status-message">
              {questoes.length
                ? 'O JSON usa exatamente as questões exibidas agora na tela.'
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

      {!loading && !error && questoes.length === 0 ? (
        <EmptyState title="Nenhuma questão encontrada" description="Ajuste os filtros para ampliar a busca." />
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
