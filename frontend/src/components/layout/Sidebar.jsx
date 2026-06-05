import { Database, FilePlus2, LayoutDashboard, LibraryBig, ListChecks, ListPlus } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/questoes', label: 'Banco de questões', icon: LibraryBig },
  { to: '/questoes/nova', label: 'Nova questão', icon: FilePlus2 },
  { to: '/listas', label: 'Listas', icon: ListChecks },
  { to: '/listas/nova', label: 'Criar lista', icon: ListPlus },
  { to: '/backup', label: 'Backup', icon: Database },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">BQ</div>
        <div>
          <strong>Banco</strong>
          <span>Questões e listas</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Navegação principal">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
