# Migração de Dados do Mock para Firestore

O frontend agora usa Firebase Firestore diretamente. Se você já usava o modo mock do Laravel, os dados locais ficam em:

```text
backend/storage/app/mock-firestore.json
```

## Importação Automática

1. Crie uma credencial de service account no Firebase Console.
2. Salve o JSON em um caminho fora do repositório.
3. Configure as variáveis no terminal:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/caminho/seguro/service-account.json"
export FIREBASE_PROJECT_ID="seu-project-id"
```

4. Rode na raiz do projeto:

```bash
npm install
npm run import:mock
```

O script preserva os IDs originais e pula documentos que já existem.

## Coleções Importadas

- `disciplinas`
- `assuntos`
- `subassuntos`
- `tags`
- `questoes`
- `listas`

## Segurança

Nunca coloque service account no frontend, no repositório ou no GitHub Pages. O script é apenas para uso local.
