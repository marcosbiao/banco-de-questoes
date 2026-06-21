import {
  ChevronRight,
  ClipboardList,
  Database,
  FilePlus2,
  FileText,
  FileUp,
  LayoutDashboard,
  LibraryBig,
  ListChecks,
  ListPlus,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const menuGroups = [
  {
    id: 'questoes',
    title: 'Questões',
    icon: LibraryBig,
    items: [
      { to: '/questoes', label: 'Banco de questões', icon: LibraryBig },
      { to: '/questoes/nova', label: 'Nova questão', icon: FilePlus2 },
      { to: '/importar-questoes', label: 'Importar questões', icon: FileUp },
    ],
  },
  {
    id: 'listas',
    title: 'Listas',
    icon: ListChecks,
    items: [
      { to: '/listas', label: 'Gerenciar listas', icon: ListChecks },
      { to: '/listas/nova', label: 'Nova lista', icon: ListPlus },
    ],
  },
  {
    id: 'provas',
    title: 'Provas',
    icon: ClipboardList,
    items: [
      { to: '/provas', label: 'Minhas provas', icon: ClipboardList },
      { to: '/provas/nova', label: 'Gerar prova balanceada', icon: FileText },
    ],
  },
  {
    id: 'analise',
    title: 'Análise pedagógica',
    icon: LayoutDashboard,
    items: [
      { to: '/dashboard', label: 'Dashboard pedagógico', icon: LayoutDashboard },
    ],
  },
  {
    id: 'sistema',
    title: 'Sistema',
    icon: Database,
    items: [
      { to: '/backup', label: 'Backup e restauração', icon: Database },
      { to: '/limpeza-metadados', label: 'Limpeza de metadados', icon: RefreshCw },
    ],
  },
];

function pathMatchesItem(pathname, itemPath) {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function activeGroupId(pathname) {
  const matches = menuGroups.flatMap((group) => (
    group.items
      .filter((item) => pathMatchesItem(pathname, item.to))
      .map((item) => ({ groupId: group.id, length: item.to.length }))
  ));
  const match = matches.sort((a, b) => b.length - a.length)[0];

  return match?.groupId || 'questoes';
}

export default function Sidebar() {
  const location = useLocation();
  const currentGroupId = useMemo(() => activeGroupId(location.pathname), [location.pathname]);
  const [openGroups, setOpenGroups] = useState(() => ({ [currentGroupId]: true }));

  useEffect(() => {
    setOpenGroups((current) => ({ ...current, [currentGroupId]: true }));
  }, [currentGroupId]);

  function toggleGroup(groupId) {
    setOpenGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">BQ</div>
        <div>
          <strong>Banco</strong>
          <span>Questões, listas e provas</span>
        </div>
      </div>

      <nav className="sidebar-nav sidebar-nav-groups" aria-label="Navegação principal">
        {menuGroups.map((group) => {
          const GroupIcon = group.icon;
          const isOpen = Boolean(openGroups[group.id]);

          return (
            <section className="sidebar-group" key={group.id}>
              <button
                type="button"
                className={`sidebar-group-toggle ${isOpen ? 'open' : ''}`}
                aria-expanded={isOpen}
                aria-controls={`sidebar-group-${group.id}`}
                onClick={() => toggleGroup(group.id)}
              >
                <span className="sidebar-group-title">
                  <GroupIcon size={16} aria-hidden="true" />
                  <span>{group.title}</span>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>

              {isOpen ? (
                <div className="sidebar-group-items" id={`sidebar-group-${group.id}`}>
                  {group.items.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/questoes' || to === '/listas' || to === '/provas' || to === '/dashboard' || to === '/backup' || to === '/limpeza-metadados'}
                      className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
