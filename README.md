# Banco de Questões e Criador de Listas

Sistema web para cadastro, organização e análise pedagógica de questões, com criação de listas de exercícios e exportação em PDF.

O projeto foi pensado para apoiar professores na manutenção de um banco de questões estruturado, com filtros pedagógicos, rubricas, competências, níveis de dificuldade e geração de listas personalizadas.

## Principais Funcionalidades

- Cadastro, edição, arquivamento e exclusão de questões.
- Organização por disciplinas, assuntos, subassuntos e tags.
- Classificação por dificuldade, competência CCI e nível de Bloom.
- Rubricas de correção vinculadas às questões.
- Criação e edição de listas de exercícios.
- Exportação de listas em PDF com ou sem gabarito.
- Dashboard pedagógico com indicadores e matriz de cobertura.
- Autenticação com Google via Firebase Auth.

## Banco de Questões

O banco de questões permite cadastrar e gerenciar questões com os principais metadados pedagógicos:

- disciplina;
- assunto;
- subassunto;
- tipo de questão;
- dificuldade numérica de 1 a 5;
- competência CCI;
- nível de Bloom;
- tags;
- status;
- imagens;
- resposta correta;
- explicação;
- observação pedagógica.

A tela de questões possui filtros por texto, disciplina, assunto, subassunto, tipo, dificuldade, competência, status, tags e presença de rubrica.

Também é possível exportar apenas as questões filtradas em JSON, com ou sem rubricas.

## Rubricas

As rubricas são vinculadas diretamente às questões e podem ser criadas, visualizadas, editadas ou removidas a partir do próprio card da questão.

Cada rubrica possui:

- pontuação total;
- critérios de avaliação;
- pontuação por critério;
- resposta modelo;
- observações de correção;
- status de revisão.

As rubricas ajudam a padronizar a correção de questões discursivas, problemas de programação e análises de código.

## Criação de Listas

O sistema permite criar listas de exercícios a partir do banco de questões.

As listas podem ser montadas com blocos configuráveis por filtros, como disciplina, assunto, subassunto, dificuldade, tipo, competência, nível de Bloom, status e tags.

Durante a montagem, o sistema evita duplicações entre blocos e permite revisar a seleção antes de salvar.

Também é possível editar listas salvas, arquivar listas e excluir listas definitivamente.

## Exportação de Listas em PDF

As listas podem ser exportadas em PDF diretamente pelo navegador.

Existem duas opções:

- PDF sem gabarito;
- PDF com gabarito.

A versão com gabarito inclui respostas, explicações e informações pedagógicas disponíveis. A versão sem gabarito omite esses dados para uso com estudantes.

## Dashboard Pedagógico

O dashboard apresenta uma visão analítica do banco de questões.

Ele inclui:

- total de questões;
- questões ativas;
- questões arquivadas;
- questões em revisão;
- questões com rubrica;
- questões sem rubrica;
- distribuição por dificuldade;
- distribuição por competência CCI;
- distribuição por nível de Bloom;
- distribuição por tipo;
- distribuição por assunto;
- matriz de cobertura por competência e dificuldade;
- alertas pedagógicos sobre lacunas no acervo.

Essa visão ajuda a identificar desequilíbrios no banco e orientar a criação de novas questões.

## Como Usar o Sistema

1. Acesse o sistema e faça login com Google.
2. Cadastre disciplinas, assuntos, subassuntos e tags conforme necessário.
3. Cadastre questões manualmente ou importe questões por JSON.
4. Revise as informações pedagógicas das questões.
5. Crie ou edite rubricas quando necessário.
6. Use os filtros para localizar questões.
7. Monte listas de exercícios a partir dos filtros desejados.
8. Revise a prévia da lista.
9. Salve a lista ou exporte em PDF.
10. Acompanhe a cobertura pedagógica pelo dashboard.
11. Faça backups periódicos dos dados.

## Como Executar Localmente

Requisitos:

- Node.js 18 ou superior;
- npm;
- projeto Firebase configurado.

Passos:

```bash
cd frontend
npm install
npm run dev
```

Depois, abra o endereço informado pelo Vite, normalmente:

```txt
http://localhost:5173/
```

Para gerar uma versão de produção:

```bash
cd frontend
npm run build
```

## Configuração do Firebase

Crie um arquivo `frontend/.env` com as credenciais do projeto Firebase:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_ALLOWED_EMAIL=
VITE_BASE_PATH=/
```

No Firebase Console, habilite:

- Firebase Auth com provedor Google;
- Firestore Database;
- Firebase Storage.

O controle visual de acesso pode usar `VITE_ALLOWED_EMAIL`, mas a proteção real dos dados deve ser feita pelas regras do Firestore.

## Tecnologias Utilizadas

- React;
- Vite;
- JavaScript;
- Firebase Auth;
- Firestore;
- Firebase Storage;
- React Router;
- html2pdf.js;
- Lucide React.
