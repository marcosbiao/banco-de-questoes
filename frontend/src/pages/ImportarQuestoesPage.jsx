import { CheckCircle, FileText, RotateCcw, Search, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ImportacaoQuestoesPreview from '../components/importacao/ImportacaoQuestoesPreview.jsx';
import ImportacaoQuestoesResumo from '../components/importacao/ImportacaoQuestoesResumo.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import Select from '../components/ui/Select.jsx';
import {
  detectarPossiveisDuplicidades,
  importarQuestoesParaFirestore,
  lerArquivoJsonImportacao,
  normalizarQuestaoImportada,
  obterResumoImportacao,
  prepararImportacaoQuestoes,
} from '../services/importacaoQuestoesService.js';

const filtroOptions = [
  { value: 'todas', label: 'Todas' },
  { value: 'validas', label: 'Válidas' },
  { value: 'alertas', label: 'Com alerta' },
  { value: 'duplicidades', label: 'Possíveis duplicidades' },
];

const statusImportacaoOptions = [
  { value: 'em_revisao', label: 'Importar como em revisão' },
  { value: 'ativa', label: 'Importar como ativa' },
];

function filtrarQuestoes(questoes, filtro) {
  const ativas = questoes.filter((questao) => !questao.removida);

  if (filtro === 'validas') {
    return ativas.filter((questao) => questao.valida);
  }

  if (filtro === 'alertas') {
    return ativas.filter((questao) => questao.alertas?.length);
  }

  if (filtro === 'duplicidades') {
    return ativas.filter((questao) => questao.possivelDuplicidade);
  }

  return ativas;
}

function reportItem(label, value) {
  return (
    <li key={label}>
      <strong>{label}:</strong> {value}
    </li>
  );
}

export default function ImportarQuestoesPage() {
  const [fileName, setFileName] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [questoes, setQuestoes] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [statusImportacao, setStatusImportacao] = useState('em_revisao');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [report, setReport] = useState(null);

  const resumo = useMemo(() => obterResumoImportacao(questoes), [questoes]);
  const questoesFiltradas = useMemo(() => filtrarQuestoes(questoes, filtro), [questoes, filtro]);

  function resetImportacao() {
    setFileName('');
    setMetadata(null);
    setQuestoes([]);
    setFiltro('todas');
    setReport(null);
    setMessage('');
    setError('');
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setLoading(true);
    setError('');
    setMessage('');
    setReport(null);

    try {
      const json = await lerArquivoJsonImportacao(file);
      const prepared = await prepararImportacaoQuestoes(json);

      setFileName(file.name);
      setMetadata(prepared.metadata);
      setQuestoes(prepared.questoes);
      setMessage('Arquivo carregado. Revise os alertas antes de importar.');
    } catch (apiError) {
      resetImportacao();
      setError(apiError.message || 'Falha ao preparar a importação.');
    } finally {
      setLoading(false);
    }
  }

  function revalidarQuestaoLocal(questao, index) {
    return normalizarQuestaoImportada(questao, questao.originalIndex ?? index);
  }

  function handleChangeQuestao(uid, field, value) {
    setReport(null);
    setMessage('');
    setQuestoes((current) => current.map((questao, index) => {
      if (questao.uid !== uid) return questao;
      const nextQuestao = {
        ...questao,
        [field]: value,
        ...(field === 'enunciado' ? { possivelDuplicidade: false, duplicidade: null, duplicidadeDecisao: '' } : {}),
      };

      return revalidarQuestaoLocal(nextQuestao, index);
    }));
  }

  function handleRemoveQuestao(uid) {
    setReport(null);
    setMessage('');
    setQuestoes((current) => current.map((questao) => (
      questao.uid === uid ? { ...questao, removida: true } : questao
    )));
  }

  function handleSelecionarTodasValidas() {
    setReport(null);
    setMessage('');
    setQuestoes((current) => current.map((questao) => (
      questao.removida ? questao : { ...questao, selecionada: Boolean(questao.valida) }
    )));
  }

  function handleDesmarcarTodas() {
    setReport(null);
    setMessage('');
    setQuestoes((current) => current.map((questao) => (
      questao.removida ? questao : { ...questao, selecionada: false }
    )));
  }

  async function handleRevalidarDuplicidades() {
    setLoading(true);
    setError('');

    try {
      const normalizadas = questoes.map(revalidarQuestaoLocal);
      setQuestoes(await detectarPossiveisDuplicidades(normalizadas));
      setMessage('Alertas e duplicidades revalidados.');
    } catch (apiError) {
      setError(apiError.message || 'Falha ao revalidar duplicidades.');
    } finally {
      setLoading(false);
    }
  }

  async function handleImportar() {
    setImporting(true);
    setError('');
    setMessage('');
    setReport(null);

    try {
      const atualizadas = await detectarPossiveisDuplicidades(questoes.map(revalidarQuestaoLocal));
      setQuestoes(atualizadas);

      const selecionadasValidas = atualizadas.filter((questao) => (
        !questao.removida && questao.valida && questao.selecionada !== false
      ));

      if (!selecionadasValidas.length) {
        setMessage('Nenhuma questão válida selecionada para importação.');
        return;
      }

      const result = await importarQuestoesParaFirestore(atualizadas, { status: statusImportacao });
      const errosQuestao = result.questoesErroImportacao?.length || 0;
      const errosRubrica = result.rubricasErro?.length || 0;
      const puladas = result.questoesPuladas?.length || 0;

      setReport(result);
      setMessage(
        errosQuestao || errosRubrica || puladas
          ? `${result.questoesImportadas.length} questões importadas. Revise os avisos no relatório final.`
          : `${result.questoesImportadas.length} questões importadas com sucesso.`,
      );
    } catch (apiError) {
      setError(apiError.message || 'Falha ao importar questões.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Importação</p>
          <h2>Importar questões por JSON</h2>
        </div>
      </div>

      <Card>
        <div className="import-upload-grid">
          <div>
            <p className="status-message">
              Carregue um JSON gerado por uma IA externa, revise as questões, corrija inconsistências e importe para o Firestore.
            </p>
            {fileName ? <p className="status-message"><strong>Arquivo:</strong> {fileName}</p> : null}
            {metadata?.origem ? <p className="status-message"><strong>Origem:</strong> {metadata.origem}</p> : null}
          </div>
          <div className="page-actions">
            <label className="button button-primary button-md" htmlFor="importacao-json">
              <FileText size={18} aria-hidden="true" />
              <span>Selecionar JSON</span>
            </label>
            <input id="importacao-json" className="visually-hidden" type="file" accept="application/json,.json" onChange={handleFileChange} />
            <Button type="button" variant="secondary" icon={RotateCcw} disabled={!questoes.length && !fileName} onClick={resetImportacao}>
              Limpar
            </Button>
          </div>
        </div>
      </Card>

      {loading ? <LoadingState message="Processando arquivo..." /> : null}
      <ErrorMessage message={error} />
      {message ? <div className="message-box message-box-success">{message}</div> : null}

      {questoes.length ? (
        <>
          <ImportacaoQuestoesResumo resumo={resumo} />

          <section className="filters-panel import-controls">
            <Select
              label="Filtro visual"
              name="filtroImportacao"
              value={filtro}
              options={filtroOptions}
              onChange={(event) => setFiltro(event.target.value)}
            />
            <Select
              label="Status ao importar"
              name="statusImportacao"
              value={statusImportacao}
              options={statusImportacaoOptions}
              onChange={(event) => setStatusImportacao(event.target.value)}
            />
            <Button type="button" variant="secondary" icon={Search} disabled={loading || importing} onClick={handleRevalidarDuplicidades}>
              Revalidar duplicidades
            </Button>
            <Button type="button" variant="secondary" icon={CheckCircle} disabled={loading || importing || resumo.validas === 0} onClick={handleSelecionarTodasValidas}>
              Selecionar todas válidas
            </Button>
            <Button type="button" variant="secondary" icon={RotateCcw} disabled={loading || importing || resumo.total === 0} onClick={handleDesmarcarTodas}>
              Desmarcar todas
            </Button>
            <Button type="button" icon={Upload} disabled={importing || resumo.selecionadas === 0} onClick={handleImportar}>
              {importing ? 'Importando...' : 'Importar questões'}
            </Button>
          </section>

          <ImportacaoQuestoesPreview
            questoes={questoesFiltradas}
            onChangeQuestao={handleChangeQuestao}
            onRemoveQuestao={handleRemoveQuestao}
          />
        </>
      ) : null}

      {report ? (
        <Card className="import-report-card">
          <div className="inline-title">
            <div>
              <p className="eyebrow">Relatório final</p>
              <h3>Importação concluída</h3>
            </div>
            <CheckCircle size={22} aria-hidden="true" />
          </div>
          <ul className="import-report-list">
            {reportItem('Total no arquivo', report.totalAnalisadas ?? questoes.length)}
            {reportItem('Total selecionado', report.totalSelecionadas ?? 0)}
            {reportItem('Questões importadas', report.questoesImportadas.length)}
            {reportItem('Erros ao importar questões', report.questoesErroImportacao?.length || 0)}
            {reportItem('Disciplinas criadas', report.disciplinasCriadas.length)}
            {reportItem('Assuntos criados', report.assuntosCriados.length)}
            {reportItem('Subassuntos criados', report.subassuntosCriados.length)}
            {reportItem('Tags criadas', report.tagsCriadas.length)}
            {reportItem('Questões com rubrica', report.rubricasImportadas.length)}
            {reportItem('Rubricas salvas', report.rubricasImportadas.length)}
            {reportItem('Erros ao salvar rubricas', report.rubricasErro?.length || 0)}
            {reportItem('Questões sem rubrica', report.questoesSemRubrica.length)}
            {reportItem('Questões puladas', report.questoesPuladas.length)}
            {reportItem('Ignoradas ou desmarcadas', report.questoesIgnoradas?.length || 0)}
            {reportItem('Possíveis duplicidades analisadas', report.duplicidadesAnalisadas || 0)}
            {reportItem('Duplicidades importadas mesmo assim', report.duplicidadesImportadas.length)}
            {reportItem('Duplicidades ignoradas', report.duplicidadesIgnoradas?.length || 0)}
          </ul>
          {report.questoesPuladas.length ? (
            <div className="import-alert-list">
              {report.questoesPuladas.map((questao, index) => (
                <p key={`pulada-${index}`} className="error-message">
                  {questao.referencia || `Questão ${questao.numero}`} pulada: {questao.motivos.join(' ')}
                </p>
              ))}
            </div>
          ) : null}
          {report.questoesErroImportacao?.length ? (
            <div className="import-alert-list">
              {report.questoesErroImportacao.map((questao, index) => (
                <p key={`erro-questao-${index}`} className="error-message">
                  {questao.referencia || `Questão ${questao.numero}`}: {questao.mensagem}
                </p>
              ))}
            </div>
          ) : null}
          {report.rubricasErro?.length ? (
            <div className="import-alert-list">
              {report.rubricasErro.map((rubrica, index) => (
                <p key={`erro-rubrica-${index}`} className="error-message">
                  Rubrica de {rubrica.referencia || rubrica.questaoId}: {rubrica.mensagem}
                </p>
              ))}
            </div>
          ) : null}
          {report.questoesIgnoradas?.length ? (
            <div className="import-alert-list">
              {report.questoesIgnoradas.map((questao, index) => (
                <p key={`ignorada-${index}`} className="status-message">
                  {questao.referencia || `Questão ${questao.numero}`} ignorada: {questao.motivo}
                </p>
              ))}
            </div>
          ) : null}
          <div className="card-actions">
            <Link className="button button-primary button-md" to="/questoes">
              Ir para o banco de questões
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
