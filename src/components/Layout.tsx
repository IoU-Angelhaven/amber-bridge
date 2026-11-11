import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ExternalLink,
  FileText,
  GraduationCap,
  House,
  ListChecks,
  Menu,
  MessagesSquare,
  RotateCcw,
  Search,
  Settings,
  SquareKanban,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { t } from '../i18n/en';
import { DEMO_TODAY, fill, formatDate } from '../lib/format';
import type { Permission } from '../lib/permissions';
import { roles, setRole, useSession } from '../store/session';
import { resetDb } from '../store/store';
import { toast, useToast } from '../store/toast';
import type { Role } from '../types';
import Login from '../pages/Login';
import { Modal, Notice } from './ui';

export const OPEN_PLATFORM_URL = 'https://iou-angelhaven.github.io/ehealth-implementation/';

const navItems: { to: string; label: string; icon: LucideIcon; perm: Permission; end?: boolean }[] = [
  { to: '/', label: t.nav.home, icon: House, perm: 'home.view', end: true },
  { to: '/initiatives', label: t.nav.initiatives, icon: SquareKanban, perm: 'initiatives.view' },
  { to: '/documents', label: t.nav.documents, icon: FileText, perm: 'documents.viewApproved' },
  { to: '/discussions', label: t.nav.discussions, icon: MessagesSquare, perm: 'discussions.network' },
  { to: '/calendar', label: t.nav.calendar, icon: CalendarDays, perm: 'calendar.viewOpen' },
  { to: '/network', label: t.nav.network, icon: Users, perm: 'network.view' },
  { to: '/learning', label: t.nav.learning, icon: GraduationCap, perm: 'learning.view' },
  { to: '/guides', label: t.nav.guides, icon: ListChecks, perm: 'guides.view' },
  { to: '/admin', label: t.nav.admin, icon: Settings, perm: 'admin.view' },
];

function Brand() {
  return (
    <Link to="/" className="text-ink flex items-center gap-2 no-underline">
      <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="4" fill="#003399" />
        <path d="M6 21c4-9 16-9 20 0" stroke="#e25d25" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M6 23h20" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="leading-tight">
        <span className="text-brand block text-base font-bold tracking-tight">{t.app.name}</span>
        <span className="text-muted block text-xs">{t.app.subtitle}</span>
      </span>
    </Link>
  );
}

function RoleSwitcher() {
  const { role } = useSession();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-semibold whitespace-nowrap">{t.app.viewAs}</span>
      <select className="input min-h-9 w-auto py-1" value={role} onChange={(e) => setRole(e.target.value as Role)}>
        {roles.map((r) => (
          <option key={r} value={r}>
            {t.roles[r]}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchBox({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <form role="search" onSubmit={submit} className={`relative ${className}`}>
      <Search size={16} className="text-muted pointer-events-none absolute top-2.5 left-3" aria-hidden="true" />
      <input type="search" className="input min-h-9 pl-9" aria-label={t.app.search} placeholder={t.app.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
    </form>
  );
}

function ResetButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        <RotateCcw size={14} aria-hidden="true" />
        {t.app.reset}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.app.reset}>
        <p>{t.app.resetConfirm}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              resetDb();
              setOpen(false);
              navigate('/');
              toast(t.app.resetDone);
            }}
          >
            {t.app.reset}
          </button>
        </div>
      </Modal>
    </>
  );
}

function Toast() {
  const message = useToast();
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {message && <p className="bg-ink pointer-events-auto rounded px-4 py-2.5 text-sm font-semibold text-white shadow-lg">{message}</p>}
    </div>
  );
}

export default function Layout() {
  const session = useSession();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const loggedIn = session.role !== 'visitor';

  // close the mobile menu and move to the top when the page changes
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const nav: ReactNode = (
    <ul className="space-y-0.5">
      {navItems
        .filter((item) => session.can(item.perm))
        .map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2 text-sm font-semibold no-underline ${
                  isActive ? 'bg-brand hover:text-white text-white' : 'text-ink hover:bg-brand-tint hover:text-brand'
                }`
              }
            >
              <item.icon size={18} aria-hidden="true" />
              {item.label}
            </NavLink>
          </li>
        ))}
    </ul>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only-focusable btn fixed top-2 left-2 z-50" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        {t.app.skip}
      </a>

      <header className="border-line sticky top-0 z-30 border-b bg-white">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 lg:px-6">
          {loggedIn && (
            <button type="button" className="btn btn-ghost btn-sm lg:hidden" aria-expanded={menuOpen} aria-controls="main-nav" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
              {menuOpen ? t.app.closeMenu : t.app.menu}
            </button>
          )}
          <Brand />
          <span className="badge bg-sun text-ink">{t.app.prototype}</span>
          {loggedIn && <SearchBox className="hidden min-w-56 flex-1 md:block lg:max-w-md" />}
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <RoleSwitcher />
            <ResetButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {loggedIn && (
          <nav
            id="main-nav"
            aria-label={t.app.mainNav}
            className={`border-line w-64 shrink-0 border-r bg-white p-3 lg:sticky lg:top-[61px] lg:block lg:h-[calc(100vh-61px)] lg:overflow-y-auto ${
              menuOpen ? 'fixed inset-x-0 top-[105px] bottom-0 z-20 w-full overflow-y-auto sm:top-[61px]' : 'hidden'
            }`}
          >
            <SearchBox className="mb-3 md:hidden" />
            {nav}
            {session.user && (
              <p className="text-muted border-line mt-4 border-t px-3 pt-3 text-xs">
                {t.app.signedInAs}
                <strong className="text-ink block text-sm">{session.user.name}</strong>
                {session.user.title} · {t.roles[session.role]}
              </p>
            )}
          </nav>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none lg:px-8 lg:py-8">
            {loggedIn ? <Outlet /> : <Login />}
          </main>

          <footer className="border-line border-t bg-white px-4 py-5 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-3">
              <Notice />
              <div className="text-muted flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs">
                <p className="max-w-3xl">{t.app.footerNote}</p>
                <p>{fill(t.app.demoDate, { date: formatDate(DEMO_TODAY) })}</p>
                <a href={OPEN_PLATFORM_URL} className="inline-flex items-center gap-1">
                  {t.app.openLayer}
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>
      <Toast />
    </div>
  );
}
