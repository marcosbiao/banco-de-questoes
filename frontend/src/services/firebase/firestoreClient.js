import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase.js';

export function requireDb() {
  if (!db) {
    throw new Error('Firebase não configurado. Preencha o .env do frontend.');
  }

  return db;
}

export function nowIso() {
  return new Date().toISOString();
}

export async function listarColecao(collectionName) {
  const snapshot = await getDocs(collection(requireDb(), collectionName));

  return snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  }));
}

export async function buscarDocumento(collectionName, id) {
  if (!id) return null;

  const documentSnapshot = await getDoc(doc(requireDb(), collectionName, id));

  if (!documentSnapshot.exists()) {
    return null;
  }

  return {
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  };
}

export async function salvarDocumento(collectionName, id, data) {
  await setDoc(doc(requireDb(), collectionName, id), data);
  return buscarDocumento(collectionName, id);
}

export async function atualizarDocumento(collectionName, id, data) {
  await updateDoc(doc(requireDb(), collectionName, id), data);
  return buscarDocumento(collectionName, id);
}

export async function excluirDocumento(collectionName, id) {
  await deleteDoc(doc(requireDb(), collectionName, id));
}

export function sortByText(field = 'nome') {
  return (a, b) => String(a[field] || '').localeCompare(String(b[field] || ''), 'pt-BR', {
    sensitivity: 'base',
  });
}
