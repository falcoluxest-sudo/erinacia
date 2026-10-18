import { NavLink, Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Cookie,
  FlaskConical,
  Gauge,
  LineChart,
  PawPrint,
  ClipboardList,
  Package,
  Upload,
  Atom,
  Calculator,
  BookA,
} from 'lucide-react';
import { Logo } from './Logo';

const SECTIONS: { title: string; links: { to: string; label: string; icon: typeof Gauge; soon?: boolean }[] }[] = [
  {
    title: 'Geral',
    links: [{ to: '/painel', label: 'Painel', icon: Gauge, soon: true }],
  },
  {
    title: 'Formulação',
    links: [
      { to: '/biblioteca', label: 'Biblioteca científica', icon: BookOpen },
      { to: '/formulas', label: 'Fórmulas metabólicas', icon: Calculator },
      { to: '/glossario', label: 'Glossário', icon: BookA },
      { to: '/dietas', label: 'Dietas', icon: ClipboardList },
    ],
  },
  {
    title: 'Dados',
    links: [
      { to: '/alimentos', label: 'Alimentos', icon: Cookie },
      { to: '/nutrientes', label: 'Nutrientes', icon: Atom, soon: true },
      { to: '/stock', label: 'Stock', icon: Package, soon: true },
      { to: '/importar', label: 'Importar', icon: Upload, soon: true },
    ],
  },
  {
    title: 'Plantel',
    links: [
      { to: '/animais', label: 'Animais', icon: PawPrint, soon: true },
      { to: '/crescimento', label: 'Crescimento', icon: LineChart, soon: true },
    ],
  },
];

export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Menu principal">
      <Link to="/alimentos" className="brand">
        <Logo size={42} />
        <span>
          <span className="brand-name">Erinacia</span>
          <br />
          <span className="brand-sub">wildlife nutrition</span>
        </span>
      </Link>
      <Link to="/dietas" className="cta">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FlaskConical size={18} aria-hidden="true" /> Formular dieta
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </Link>
      {SECTIONS.map((s) => (
        <div key={s.title} className="nav-group">
          <div className="nav-section">{s.title}</div>
          {s.links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}${l.soon ? ' is-soon' : ''}`}>
              <l.icon size={18} aria-hidden="true" />
              {l.label}
              {l.soon && <span className="soon">em breve</span>}
            </NavLink>
          ))}
        </div>
      ))}
      <div className="sidebar-foot">
        <span>Português (Portugal)</span>
        <span>Versão de testes · dados guardados neste browser</span>
      </div>
    </nav>
  );
}
