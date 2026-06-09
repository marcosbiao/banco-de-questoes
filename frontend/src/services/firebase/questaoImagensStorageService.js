import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firebaseConfig, storage } from '../../firebase/firebase.js';

function requireStorage() {
  if (!storage || !firebaseConfig.storageBucket) {
    throw new Error('Firebase Storage não configurado. Confira VITE_FIREBASE_STORAGE_BUCKET no .env do frontend.');
  }

  return storage;
}

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeFileName(name = 'imagem') {
  const normalized = String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalized || 'imagem';
}

export function storagePathImagemQuestao(fileName) {
  return `questoes/imagens/${randomId()}-${safeFileName(fileName)}`;
}

export async function uploadImagemQuestao(file) {
  if (!file) {
    throw new Error('Selecione uma imagem para enviar.');
  }

  if (!file.type?.startsWith('image/')) {
    throw new Error(`"${file.name}" não parece ser uma imagem.`);
  }

  const path = storagePathImagemQuestao(file.name);
  const storageRef = ref(requireStorage(), path);

  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      nomeOriginal: file.name,
    },
  });

  return {
    url: await getDownloadURL(storageRef),
    path,
    nome: file.name,
    legenda: '',
    textoAlternativo: '',
    fonte: '',
  };
}

export async function removerImagemQuestaoStorage(path) {
  if (!path) return;

  try {
    await deleteObject(ref(requireStorage(), path));
  } catch (error) {
    if (error?.code !== 'storage/object-not-found') {
      throw error;
    }
  }
}
