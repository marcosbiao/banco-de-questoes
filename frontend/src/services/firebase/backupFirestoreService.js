import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase.js';
import { normalizarTextoBusca } from '../../utils/textNormalizer.js';
import { fonteIdFromNome } from './fontesFirestoreService.js';
import { listarColecao, requireDb, salvarDocumento } from './firestoreClient.js';

const BACKUP_COLLECTIONS = ['disciplinas', 'assuntos', 'subassuntos', 'tags', 'fontes', 'questoes', 'rubricas', 'listas', 'provas'];
const BACKUP_VERSION = 1;

export async function exportarBackupCompleto() {
  const data = {};

  for (const collectionName of BACKUP_COLLECTIONS) {
    const documentos = await listarColecao(collectionName);
    data[collectionName] = documentos.map((documento) => ({
      id: documento.id,
      ...serializeDocument(documento),
    }));
  }

  return {
    metadata: {
      sistema: 'Banco de Questões e Gerador de Listas',
      versaoBackup: BACKUP_VERSION,
      geradoEm: new Date().toISOString(),
      colecoes: BACKUP_COLLECTIONS,
    },
    data,
  };
}

export function validarBackupJson(backup) {
  if (!backup || typeof backup !== 'object') {
    return { valid: false, message: 'Backup deve ser um objeto JSON válido.' };
  }

  if (!backup.metadata || typeof backup.metadata !== 'object') {
    return { valid: false, message: 'Backup inválido: metadata ausente.' };
  }

  if (!backup.data || typeof backup.data !== 'object') {
    return { valid: false, message: 'Backup inválido: data ausente.' };
  }

  for (const collectionName of BACKUP_COLLECTIONS) {
    if (!Array.isArray(backup.data[collectionName])) {
      return {
        valid: false,
        message: `Backup inválido: a coleção ${collectionName} deve estar presente como array.`,
      };
    }
  }

  return { valid: true };
}

export function obterResumoBackup(backup) {
  const summary = {};

  for (const collectionName of BACKUP_COLLECTIONS) {
    summary[collectionName] = Array.isArray(backup.data?.[collectionName])
      ? backup.data[collectionName].length
      : 0;
  }

  return summary;
}

export async function importarBackupMesclando(backup) {
  const validation = validarBackupJson(backup);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  for (const collectionName of BACKUP_COLLECTIONS) {
    const docs = backup.data[collectionName];

    for (const documento of docs) {
      if (!documento?.id) {
        throw new Error(`Documento sem id em ${collectionName}.`);
      }

      const documentData = normalizeDocumentData(collectionName, documento);
      await salvarDocumento(collectionName, documento.id, documentData);
    }
  }
}

export async function importarBackupSubstituindo(backup) {
  const validation = validarBackupJson(backup);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  for (const collectionName of BACKUP_COLLECTIONS) {
    await limparColecao(collectionName);
  }

  await importarBackupMesclando(backup);
}

export function baixarArquivoJson(payload, filename) {
  const arquivo = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(arquivo);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function lerArquivoJson(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Nenhum arquivo selecionado.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        resolve(parsed);
      } catch (error) {
        reject(new Error('O arquivo selecionado não é JSON válido.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Falha ao ler o arquivo de backup.'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

function serializeDocument(documento) {
  const copy = { ...documento };
  delete copy.id;
  return copy;
}

function normalizeDocumentData(collectionName, documento) {
  const normalized = { ...documento };
  delete normalized.id;

  if (collectionName === 'questoes') {
    const fonte = normalized.fonte ? String(normalized.fonte).trim() : '';
    normalized.fonte = fonte;
    normalized.fonteBusca = normalizarTextoBusca(fonte);
    normalized.fonteId = fonte ? String(normalized.fonteId || fonteIdFromNome(fonte)).trim() : '';
  }

  if (collectionName === 'fontes') {
    const nome = normalized.nome ? String(normalized.nome).trim() : '';
    normalized.nome = nome;
    normalized.nomeBusca = normalizarTextoBusca(nome);
  }

  return normalized;
}

async function limparColecao(collectionName) {
  if (!db) {
    throw new Error('Firebase não configurado. Preencha o arquivo .env do frontend.');
  }

  const snapshot = await getDocs(collection(db, collectionName));
  const deletions = snapshot.docs.map((documentSnapshot) =>
    deleteDoc(doc(db, collectionName, documentSnapshot.id)),
  );

  await Promise.all(deletions);
}
