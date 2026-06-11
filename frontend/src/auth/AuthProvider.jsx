import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { createContext, useEffect, useMemo, useState } from 'react';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase/firebase.js';

export const AuthContext = createContext(null);

function authErrorMessage(error) {
  const code = error?.code || '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'este domínio';

  const messages = {
    'auth/unauthorized-domain': `Domínio não autorizado no Firebase Auth: ${origin}. Use http://localhost:5173/ ou adicione este domínio em Authentication > Settings > Authorized domains.`,
    'auth/popup-blocked': 'O navegador bloqueou a janela de login do Google. Permita popups para este site e tente novamente.',
    'auth/popup-closed-by-user': 'A janela de login foi fechada antes de concluir a autenticação.',
    'auth/operation-not-allowed': 'O provedor Google não está habilitado no Firebase Auth.',
    'auth/invalid-api-key': 'A chave do Firebase no .env está inválida.',
    'auth/configuration-not-found': 'Configuração de autenticação não encontrada no Firebase. Confira o projeto e o provedor Google.',
    'auth/network-request-failed': 'Falha de rede ao conectar com o Firebase Auth.',
  };

  return messages[code] || error?.message || 'Não foi possível entrar com Google.';
}

export default function AuthProvider({ children }) {
  const allowedEmail = (import.meta.env.VITE_ALLOWED_EMAIL || '').trim().toLowerCase();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const userEmail = user?.email?.toLowerCase() || '';
  const isAuthorized = Boolean(user) && (!allowedEmail || userEmail === allowedEmail);
  const isUnauthorized = Boolean(user) && !isAuthorized;

  async function loginWithGoogle() {
    setError('');

    if (!auth || !isFirebaseConfigured) {
      setError('Configure o Firebase no arquivo .env do frontend antes de entrar.');
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (authError) {
      setError(authErrorMessage(authError));
    }
  }

  async function logout() {
    if (!auth) return;
    await signOut(auth);
  }

  const value = useMemo(() => ({
    allowedEmail,
    error,
    isAuthorized,
    isFirebaseConfigured,
    isUnauthorized,
    loading,
    loginWithGoogle,
    logout,
    user,
  }), [allowedEmail, error, isAuthorized, isUnauthorized, loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
