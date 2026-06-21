import { LogOut, Search } from 'lucide-react';
import useAuth from '../../auth/useAuth.js';
import Button from '../ui/Button.jsx';

export default function Header() {
  const { logout, user } = useAuth();

  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Banco de Questões</p>
        <h1>Questões, Listas e Provas</h1>
      </div>
      <div className="header-actions">
        <div className="header-search" aria-label="Status da aplicação">
          <Search size={18} aria-hidden="true" />
          <span>{user?.email || 'Firebase'}</span>
        </div>
        <Button type="button" variant="secondary" size="sm" icon={LogOut} onClick={logout}>
          Sair
        </Button>
      </div>
    </header>
  );
}
