import { useMemo, useState } from 'react';
import { Download, Upload, Database, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import {
  baixarArquivoJson,
  exportarBackupCompleto,
  importarBackupMesclando,
  importarBackupSubstituindo,
  lerArquivoJson,
  obterResumoBackup,
  validarBackupJson,
} from '../services/firebase/backupFirestoreService.js';

const IMPORT_MODES = {
  MERGE: 'merge',
  REPLACE: 'replace',
};

export default function BackupPage() {
  const [backupFile, setBackupFile] = useState(null);
  const [backupData, setBackupData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [importMode, setImportMode] = useState(IMPORT_MODES.MERGE);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const summaryItems = useMemo(() => {
    if (!summary) return null;

    return [
      { label: 'Disciplinas', value: summary.disciplinas },
      { label: 'Assuntos', value: summary.assuntos },
      { label: 'Subassuntos', value: summary.subassuntos },
      { label: 'Tags', value: summary.tags },
      { label: 'Questões', value: summary.questoes },
      { label: 'Listas', value: summary.listas },
      { label: 'Rubricas', value: summary.rubricas },
    ];
  }, [summary]);

  async function handleExport() {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const backup = await exportarBackupCompleto();
      const filename = `backup_banco_questoes_${new Date().toISOString().slice(0, 10)}_${new Date()
        .toISOString()
        .slice(11, 16)
        .replace(':', '-')}.json`;
      baixarArquivoJson(backup, filename);
      setMessage('Backup exportado com sucesso. O arquivo foi baixado no seu navegador.');
    } catch (exportError) {
      setError(exportError.message || 'Erro ao exportar backup.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(event) {
    setError('');
    setMessage('');
    setSummary(null);
    setBackupData(null);
    setBackupFile(null);

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBackupFile(file);

    try {
      const json = await lerArquivoJson(file);
      const validation = validarBackupJson(json);

      if (!validation.valid) {
        throw new Error(validation.message);
      }

      setBackupData(json);
      setSummary(obterResumoBackup(json));
      setMessage('Arquivo de backup carregado e validado com sucesso.');
    } catch (readError) {
      setError(readError.message || 'Arquivo de backup inválido.');
    }
  }

  async function handleImport() {
    if (!backupData) {
      setError('Selecione um arquivo de backup JSON antes de importar.');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (importMode === IMPORT_MODES.REPLACE) {
        const confirmation = window.confirm(
          'Esta ação apagará os dados atuais das coleções principais e substituirá pelo conteúdo do backup. Esta operação não pode ser desfeita. Confirme apenas se você já exportou uma cópia recente.',
        );

        if (!confirmation) {
          setMessage('Importação cancelada. Nenhuma alteração foi feita.');
          return;
        }

        await importarBackupSubstituindo(backupData);
        setMessage('Importação concluída com sucesso. O banco atual foi substituído pelo backup.');
      } else {
        await importarBackupMesclando(backupData);
        setMessage('Importação concluída com sucesso. Os dados do backup foram mesclados ao banco atual.');
      }
    } catch (importError) {
      setError(importError.message || 'Erro ao importar backup.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Backup e restauração</p>
          <h2>Backup e restauração de dados</h2>
        </div>
      </div>

      <section className="card">
        <p className="card-description">
          Exporte e importe os dados do Firestore em JSON. O backup preserva IDs e os principais campos das coleções do sistema.
        </p>

        <div className="actions-row">
          <Button type="button" icon={Download} onClick={handleExport} disabled={loading}>
            Exportar backup completo
          </Button>
          {loading ? <LoadingState message="Processando backup..." /> : null}
        </div>
      </section>

      <section className="card">
        <h3>Importar backup</h3>
        <p>Selecione um arquivo JSON gerado por este sistema e escolha o modo de importação.</p>

        <div className="form-group">
          <label htmlFor="backupFile">Arquivo JSON de backup</label>
          <input id="backupFile" type="file" accept="application/json" onChange={handleFileChange} />
        </div>

        {backupFile ? <p>Arquivo selecionado: {backupFile.name}</p> : null}

        {summary ? (
          <div className="summary-box">
            <h4>Resumo do backup</h4>
            <ul>
              {summaryItems.map(({ label, value }) => (
                <li key={label}>
                  <strong>{label}:</strong> {value}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="form-group">
          <fieldset>
            <legend>Modo de importação</legend>
            <label className="radio-label">
              <input
                type="radio"
                name="importMode"
                value={IMPORT_MODES.MERGE}
                checked={importMode === IMPORT_MODES.MERGE}
                onChange={() => setImportMode(IMPORT_MODES.MERGE)}
              />
              Mesclar com dados existentes
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="importMode"
                value={IMPORT_MODES.REPLACE}
                checked={importMode === IMPORT_MODES.REPLACE}
                onChange={() => setImportMode(IMPORT_MODES.REPLACE)}
              />
              Substituir banco atual pelo backup
            </label>
          </fieldset>
        </div>

        {importMode === IMPORT_MODES.REPLACE ? (
          <div className="alert-box alert-box-warning">
            <AlertTriangle size={18} aria-hidden="true" />
            <p>
              Esta ação apagará os dados atuais das coleções principais e substituirá pelo conteúdo do backup.
              Faça isso apenas após exportar uma cópia recente.
            </p>
          </div>
        ) : null}

        <div className="actions-row">
          <Button type="button" icon={Upload} onClick={handleImport} disabled={loading || !backupData}>
            Importar backup
          </Button>
        </div>

        <ErrorMessage message={error} />
        {message ? <div className="message-box message-box-success">{message}</div> : null}
      </section>
    </div>
  );
}
