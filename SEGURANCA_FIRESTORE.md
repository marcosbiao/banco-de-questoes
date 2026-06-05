# Segurança do Firestore

Este documento explica por que as regras do Firestore são obrigatórias e como proteger o acesso ao banco de dados.

## Por que as regras do Firestore são necessárias

A autenticação visual no frontend não basta. Um site mal configurado ou um usuário com ferramentas de desenvolvedor pode tentar acessar o Firestore diretamente.

As regras do Firestore garantem que apenas o usuário autorizado consiga ler e escrever nas coleções do sistema.

## Regra recomendada: UID do usuário autorizado

Use sempre o UID do usuário autenticado em vez do e-mail.

Exemplo de regras recomendadas:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner() {
      return request.auth != null
        && request.auth.uid == "COLOQUE_AQUI_SEU_UID";
    }

    match /disciplinas/{document=**} {
      allow read, write: if isOwner();
    }

    match /assuntos/{document=**} {
      allow read, write: if isOwner();
    }

    match /subassuntos/{document=**} {
      allow read, write: if isOwner();
    }

    match /tags/{document=**} {
      allow read, write: if isOwner();
    }

    match /questoes/{document=**} {
      allow read, write: if isOwner();
    }

    match /listas/{document=**} {
      allow read, write: if isOwner();
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Por que UID é preferível

- O UID não muda se o usuário alterar o e-mail.
- O UID é mais difícil de falsificar do que o e-mail na camada de regras.
- O e-mail pode ser alterado pelo próprio usuário no Firebase Auth.

## Alternativa por e-mail (menos recomendada)

Se você quiser usar e-mail apenas para testes rápidos, a regra pode ser:

```js
function isOwnerByEmail() {
  return request.auth != null
    && request.auth.token.email == "seu-email@example.com";
}
```

Mas lembre-se: use UID em produção.

## Como descobrir o UID do usuário autorizado

1. Faça login no sistema usando o Google Auth.
2. No Firebase Console, abra o menu "Authentication".
3. Localize o usuário autorizado na lista.
4. Clique no registro do usuário.
5. O UID aparecerá como `User UID` (ou similar).
6. Copie esse valor para `firestore.rules.example` e, em seguida, cole no console de regras.

## Como substituir o UID nas regras

1. Abra `firestore.rules.example`.
2. Substitua `COLOQUE_AQUI_SEU_UID` pelo UID copiado.
3. Salve o arquivo.
4. Use essas regras no Firebase Console.

## Como publicar as regras no Firebase Console

1. Abra o projeto no Firebase Console.
2. Vá em `Firestore Database` > `Rules`.
3. Apague o conteúdo atual e cole o conteúdo de `firestore.rules.example`.
4. Clique em `Publish`.

## Como testar as regras

1. Acesse o sistema com o usuário autorizado.
2. Crie, edite e exclua dados normalmente.
3. Em seguida, faça login com uma conta diferente.
4. O sistema deve bloquear o acesso e impedir leitura/escrita.

Evite usar qualquer regra como:

```js
allow read, write: if true;
```

Essa regra libera acesso total ao banco e torna o Firestore inseguro.
