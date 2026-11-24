import { NavLink, Outlet, useLocation } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle.js';
import PreviewLabel from '../components/PreviewLabel.jsx';
import { isSupabaseConfigured } from '../services/supabase.js';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/join', label: 'Join queue' },
  { to: '/status', label: 'My Status' },
  { to: '/reception', label: 'Reception' },
  { to: '/barber/amit', label: 'Barber' },
  { to: '/display', label: 'Display' },
  { to: '/admin', label: 'Owner' },
];

export default function AppLayout() {
  const { pathname } = useLocation();
  const title = pathname === '/'
    ? 'Home'
    : pathname === '/join'
      ? 'Join Queue'
      : pathname === '/status' || pathname.startsWith('/status/')
        ? 'My Status'
        : pathname === '/reception'
          ? 'Reception Dashboard'
          : pathname.startsWith('/barber/')
            ? 'Barber View'
            : pathname === '/display'
              ? 'Waiting Area Display'
              : pathname === '/admin'
                ? 'Owner Settings'
                : 'Page Not Found';
  usePageTitle(title);

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/" aria-label="Salon home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span className="brand-copy">
            <span className="brand-name">SALON</span>
            <span className="brand-caption">SALON QUEUE</span>
          </span>
        </NavLink>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        {!isSupabaseConfigured && <PreviewLabel>Sample preview</PreviewLabel>}
      </header>
      <main className="page-frame"><Outlet /></main>
      <footer className="site-footer">
        <span>ATELIER <span className="gold-text">•</span> SALON QUEUE</span>
        <span>Designed for a more considered visit</span>
      </footer>
    </div>
  );
}
