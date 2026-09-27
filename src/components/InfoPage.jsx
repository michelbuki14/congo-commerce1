import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Shared shell for the informational pages (help, policies, shipping, seller
 * recruitment): a back link, a titled header card and a stack of sections.
 */
export default function InfoPage({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à la boutique
      </Link>
      <header className="rounded-2xl border border-border bg-card p-5">
        <h1 className="flex items-center gap-2 text-lg font-bold md:text-xl">
          {Icon && <Icon className="h-5 w-5 shrink-0 text-primary" />} {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function InfoSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-bold">{title}</h2>
      <div className="mt-2.5 space-y-2 text-xs leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}