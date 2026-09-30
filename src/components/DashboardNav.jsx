import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function DashboardNav({ title, links, variant }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = [...links].sort((a, b) => b.to.length - a.to.length).find(l => pathname === l.to || (!l.end && pathname.startsWith(`${l.to}/`)));
  const paper = variant === 'paper';

  return (
    <div className={paper ? 'paper-head' : 'space-y-3'}>
      <h1 className={paper ? 'paper-title' : 'text-2xl font-bold tracking-tight md:text-3xl'}>{title}</h1>
      <select aria-label={title} value={active?.to || ''} onChange={e => navigate(e.target.value)} className={paper ? 'paper-select' : 'h-12 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold md:hidden'}>
        {!active && <option value="" disabled>{title}</option>}
        {links.map(l => <option key={l.to} value={l.to}>{l.key ? t(l.key) : l.label}</option>)}
      </select>
      <nav aria-label={title} className={paper ? 'paper-nav' : 'hidden gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 md:flex'}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              paper
                ? `paper-nav-link${isActive ? ' paper-nav-active' : ''}`
                : `inline-flex min-h-11 shrink-0 items-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
                  }`
            }
          >
            {l.key ? t(l.key) : l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default DashboardNav;