import { LogIn, LogOut } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import useAuth from '../auth/useAuth.js';
import Button from '../components/ui/Button.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';

export default function LoginPage() {
  const {
    allowedEmail,
    error,
    isAuthorized,
    isFirebaseConfigured,
    isUnauthorized,
    loading,
    loginWithGoogle,
    logout,
    user,
  } = useAuth();

  if (loading) {
    return (
      <main className="auth-page">
        <LoadingState message="Carregando autenticação..." />
      </main>
    );
  }

  if (isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Banco de Questões</p>
        <h1>Entrar no sistema</h1>
        <p>Acesso restrito por Firebase Auth. Use a conta Google autorizada para gerenciar questões e listas.</p>

        {!isFirebaseConfigured ? (
          <ErrorMessage message="Firebase ainda não está configurado. Preencha o .env do frontend." />
        ) : null}

        {!allowedEmail ? (
          <div className="message-box message-box-warning" role="alert">
            VITE_ALLOWED_EMAIL não está definido. O controle visual de acesso está desabilitado. Configure o e-mail autorizado em `frontend/.env`.
          </div>
        ) : null}

        {isUnauthorized ? (
          <ErrorMessage message={`O e-mail ${user.email} não está autorizado. Use ${allowedEmail}.`} />
        ) : null}

        <ErrorMessage message={error} />

        <div className="auth-actions">
          {user ? (
            <Button type="button" variant="secondary" icon={LogOut} onClick={logout}>
              Sair
            </Button>
          ) : (
            <Button type="button" icon={LogIn} disabled={!isFirebaseConfigured} onClick={loginWithGoogle}>
              Entrar com Google
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
