import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const collections = [
  'disciplinas',
  'assuntos',
  'subassuntos',
  'tags',
  'questoes',
  'listas',
];

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Defina ${name} antes de executar o importador.`);
  }

  return value;
}

async function main() {
  const projectId = requiredEnv('FIREBASE_PROJECT_ID');
  requiredEnv('GOOGLE_APPLICATION_CREDENTIALS');

  initializeApp({
    credential: applicationDefault(),
    projectId,
  });

  const firestore = getFirestore();
  const mockPath = path.resolve('backend/storage/app/mock-firestore.json');
  const raw = await readFile(mockPath, 'utf8');
  const data = JSON.parse(raw);

  for (const collectionName of collections) {
    const documents = data[collectionName] || {};
    const entries = Object.entries(documents);

    console.log(`\n${collectionName}: ${entries.length} documentos encontrados`);

    for (const [documentId, documentData] of entries) {
      const documentRef = firestore.collection(collectionName).doc(documentId);
      const snapshot = await documentRef.get();

      if (snapshot.exists) {
        console.log(`- pulando ${collectionName}/${documentId}: já existe`);
        continue;
      }

      await documentRef.set({
        id: documentId,
        ...documentData,
      });
      console.log(`- importado ${collectionName}/${documentId}`);
    }
  }

  console.log('\nImportação concluída.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
