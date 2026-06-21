# Banco de Questões e Gerador de Listas

Sistema web para cadastro de questões, montagem de listas de exercícios e exportação de PDF.

## Nova Arquitetura

O uso em produção não depende mais do Laravel:

- Frontend React hospedável no GitHub Pages.
- Firebase Auth com login Google.
- Firestore como banco de dados.
- Apenas um usuário autorizado deve acessar o sistema.
- PDF gerado diretamente no frontend com `html2pdf.js`.
- Backend Laravel mantido no repositório apenas como legado/referência.

## Estrutura

- `frontend/`: aplicação React, services Firestore, autenticação e PDF local.
- `backend/`: API Laravel legada, útil apenas como referência ou apoio local antigo.
- `scripts/import-mock-firestore-to-firebase.mjs`: importador opcional do mock local para Firestore.
- `firestore.rules.example`: exemplo de regras restritas a um único usuário.
- `MIGRACAO_DADOS.md`: guia curto de migração dos dados do mock.

## Requisitos

- Node.js 18 ou superior
- npm
- Projeto Firebase com Firestore e Firebase Auth
- Provedor Google ativado no Firebase Auth

Para usar o importador local, também é necessária uma service account do Firebase Admin SDK. Não use service account no frontend.

## Configurar Firebase

1. Crie um projeto no Firebase.
2. Ative Firestore.
3. Ative Firebase Auth com provedor Google.
4. Em `frontend`, copie o exemplo de ambiente:

```bash
cd frontend
cp .env.example .env
```

5. Preencha:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ALLOWED_EMAIL=seu-email@example.com
VITE_BASE_PATH=/
```

`VITE_ALLOWED_EMAIL` é apenas controle visual no frontend. A proteção real deve ser feita nas regras do Firestore.

## Regras do Firestore

Use `firestore.rules.example` como base. A regra recomendada é por UID:

```js
function isOwner() {
  return request.auth != null
    && request.auth.uid == "COLOQUE_AQUI_SEU_UID";
}
```

Para descobrir o UID, faça login no sistema com sua conta Google autorizada, abra o Firebase Console em `Authentication`, selecione o usuário e copie o UID exibido.

Substitua `COLOQUE_AQUI_SEU_UID` no arquivo `firestore.rules.example` e publique as regras no console do Firestore.

Há uma alternativa por e-mail comentada no arquivo, mas UID é preferível.

Para detalhes completos, veja também `SEGURANCA_FIRESTORE.md`.

## Rodar Localmente Sem Laravel

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`, faça login com Google e use a conta definida em `VITE_ALLOWED_EMAIL`.

### Backup e restauração

A aplicação agora inclui uma página de backup em `/backup` que permite:

- exportar todas as coleções principais em JSON;
- importar backups em modo `Mesclar com dados existentes` ou `Substituir banco atual pelo backup`;
- preservar IDs de documentos ao restaurar.

Sempre exporte um backup antes de usar o modo `Substituir banco atual pelo backup`.

Fluxo esperado:

1. Entrar com Google.
2. Cadastrar disciplina.
3. Cadastrar assunto.
4. Cadastrar subassunto.
5. Cadastrar questão.
6. Montar lista.
7. Salvar lista.
8. Abrir prévia.
9. Exportar PDF sem gabarito.
10. Exportar PDF com gabarito.

## GitHub Pages

O app usa `HashRouter`, então refresh de página funciona em GitHub Pages.

Para Project Pages, configure no `.env`:

```env
VITE_BASE_PATH=/nome-do-repositorio/
```

Build local:

```bash
cd frontend
npm run build
npm run preview
```

Deploy:

```bash
cd frontend
npm run deploy
```

O script usa `gh-pages -d dist`.

## PDF Sem Backend

Na prévia da lista existem dois botões:

- `Exportar PDF sem gabarito`
- `Exportar PDF com gabarito`

A geração usa `html2pdf.js` no navegador. A versão sem gabarito oculta resposta correta, explicação, observação pedagógica, marcação de alternativa correta e tags. A versão com gabarito mostra esses dados quando preenchidos.

## Importar Dados do Mock Local

Se você usava `FIREBASE_ENABLED=false`, os dados podem estar em:

```text
backend/storage/app/mock-firestore.json
```

Na raiz do projeto:

```bash
npm install
export GOOGLE_APPLICATION_CREDENTIALS="/caminho/seguro/service-account.json"
export FIREBASE_PROJECT_ID="seu-project-id"
npm run import:mock
```

O script preserva IDs originais e pula documentos já existentes. Veja [MIGRACAO_DADOS.md](</home/biao/All/VsCode/banco de questoes/MIGRACAO_DADOS.md>).

## Coleções Firestore

- `disciplinas`
- `assuntos`
- `subassuntos`
- `tags`
- `questoes`
- `listas`

Os services do frontend mantêm os nomes públicos antigos, mas agora acessam Firestore diretamente.

## Funcionalidades

- Firebase Auth com Google.
- Bloqueio visual por `VITE_ALLOWED_EMAIL`.
- CRUD de disciplinas, assuntos, subassuntos, tags e questões.
- Listagem, filtros, edição e arquivamento de questões.
- Tags com normalização e prevenção de duplicidade.
- Montagem semiautomática de listas por filtros opcionais.
- Remoção de duplicatas entre blocos.
- Remoção, restauração e reordenação de questões na lista.
- Salvamento e edição de listas no Firestore.
- Prévia com e sem gabarito.
- Exportação PDF sem backend.

## Testes Recomendados

1. Rodar apenas o frontend.
2. Acessar a tela de login.
3. Entrar com Google.
4. Testar usuário não autorizado.
5. Testar usuário autorizado.
6. Criar disciplina, assunto e subassunto.
7. Criar tag repetida com acento e sem acento.
8. Criar, editar e arquivar questão.
9. Filtrar questões por disciplina, assunto, subassunto, tag e status.
10. Criar lista apenas por disciplina.
11. Criar lista apenas por tag.
12. Criar lista com dois blocos e verificar duplicatas ignoradas.
13. Remover e reordenar questões.
14. Salvar lista no Firestore.
15. Abrir prévia salva.
16. Exportar PDF sem gabarito.
17. Exportar PDF com gabarito.
18. Rodar `npm run build`.
19. Rodar `npm run preview`.
20. Publicar com `npm run deploy`.

## Backend Legado

O backend Laravel permanece no repositório, mas não é necessário para produção. Ele pode ser usado como referência da arquitetura anterior ou para consultar regras de negócio já migradas para JavaScript.

## Limitações Atuais

- Sem cadastro público.
- Sem login por senha.
- Sem área de aluno.
- Sem upload real de imagens e arquivos.
- Sem importação em massa pela interface.
- Sem histórico de desempenho.
- Sem Cloud Functions.
- Sem banco relacional.
