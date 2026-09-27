import React from 'react';

/** Card wrapper for one monitored area of the platform. */
export default function HealthSection({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          {subtitle ? <p className="text-[11px] text-muted-foreground">{subtitle}</p> : null}
        </div>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}