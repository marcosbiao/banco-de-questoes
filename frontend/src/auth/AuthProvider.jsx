import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { createContext, useEffect, useMemo, useState } from 'react';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase/firebase.js';

export const AuthContext = createContext(null);

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
      setError(authError.message || 'Não foi possível entrar com Google.');
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
