import { Navigate } from 'react-router-dom';
import useAuth from '../../auth/useAuth.js';
import Button from '../ui/Button.jsx';
import LoadingState from '../ui/LoadingState.jsx';

export default function ProtectedRoute({ children }) {
  const { isAuthorized, isUnauthorized, loading, logout, user } = useAuth();

  if (loading) {
    return <LoadingState message="Verificando acesso..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isUnauthorized) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="eyebrow">Acesso restrito</p>
          <h1>Este usuário não está autorizado a acessar o sistema.</h1>
          <p>O e-mail {user.email} não está autorizado a acessar este sistema.</p>
          <Button type="button" variant="secondary" onClick={logout}>
            Sair
          </Button>
        </section>
      </main>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
