import React from 'react';

export default function CreatorConversionRates({ creators }) {
  return <section className="min-w-0 rounded-2xl border border-border bg-card p-4">
    <h2 className="text-sm font-bold">Conversion des créateurs</h2>
    <p className="mt-1 text-xs text-muted-foreground">Sessions avec une commande payée / sessions de clics de parrainage · 30 jours</p>
    {creators.length ? <div className="mt-4 space-y-3">
      {creators.map(creator => <div key={creator.id} className="rounded-xl border border-border p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 truncate font-semibold">{creator.name}</span>
          <span className="shrink-0 font-bold text-primary">{creator.rate.toLocaleString('fr-FR')} %</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(creator.rate, 100)}%` }} /></div>
        <p className="mt-1.5 text-xs text-muted-foreground">{creator.conversions} conversions / {creator.clicks} sessions cliquées</p>
      </div>)}
    </div> : <p className="mt-6 text-sm text-muted-foreground">Aucun clic de parrainage sur cette période.</p>}
  </section>;
}