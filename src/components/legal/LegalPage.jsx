import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getCompanyConfig } from '@/lib/config';

export const LEGAL_UPDATED = '26 septembre 2026';

export default function LegalPage({ title, subtitle, children }) {
  const company = getCompanyConfig();
  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à la boutique
      </Link>
      <header className="rounded-2xl border border-border bg-card p-5">
        <h1 className="text-lg font-bold md:text-xl">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        <p className="mt-2 text-[11px] text-muted-foreground">
          {company.trade_name || 'Congo Commerce'} · Dernière mise à jour : {LEGAL_UPDATED}
        </p>
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function LegalSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-bold">{title}</h2>
      <div className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalRow({ label, value }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <span className="font-semibold text-foreground">{label} :</span>
      <span>{value || '—'}</span>
    </div>
  );
}