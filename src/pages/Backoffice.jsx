import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BackofficeNav from '@/components/backoffice/BackofficeNav';
import OverviewList from '@/components/backoffice/OverviewList';

export default function Backoffice() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setError(false);
    setData(null);
    try {
      const response = await base44.functions.invoke('backofficeOverview', {});
      setData(response.data);
    } catch { setError(true); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const summary = data ? [
    ['Commandes récentes', data.orders.length, '/admin/orders'],
    ['Demandes de support', data.tickets.filter(x => !['resolved', 'closed'].includes(x.status)).length, '/support-inbox'],
    ['Workflows en échec', data.executions.filter(x => x.status === 'FAILED').length, '/admin/workflows'],
  ] : [];
  return <div className="min-h-screen bg-background font-body text-foreground md:flex">
    <BackofficeNav />
    <main className="min-w-0 flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Espace réservé · administration</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Vue opérationnelle</h1><p className="text-sm text-muted-foreground">Activité récente de la plateforme.</p></header>
        {!data && !error && <div role="status" aria-label="Chargement" className="grid gap-3 sm:grid-cols-3">{[1,2,3].map(n => <div key={n} className="h-28 animate-pulse rounded-xl bg-secondary" />)}</div>}
        {error && <div role="alert" className="rounded-xl border border-destructive/40 bg-card p-5"><p>Impossible de charger le tableau de bord.</p><button type="button" onClick={load} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Réessayer</button></div>}
        {data && <>
          <div className="grid gap-3 sm:grid-cols-3">{summary.map(([label, count, href]) => <Link key={label} to={href} className="rounded-xl border border-border bg-card p-4"><span className="text-2xl font-bold">{count}</span><span className="mt-1 block text-xs text-muted-foreground">{label} (8 derniers)</span></Link>)}</div>
          <div className="grid gap-4 lg:grid-cols-2">
            <OverviewList title="Commandes" href="/admin/orders" items={data.orders} render={o => <div className="flex justify-between gap-2"><span className="truncate">{o.number}</span><span className="shrink-0 text-muted-foreground">{o.status}</span></div>} />
            <OverviewList title="Support" href="/support-inbox" items={data.tickets} render={t => <div className="flex justify-between gap-2"><span className="truncate">{t.subject || t.number}</span><span className="shrink-0 text-muted-foreground">{t.status}</span></div>} />
            <OverviewList title="Automatisations" href="/admin/workflows" items={data.executions} render={e => <div className="flex justify-between gap-2"><span className="truncate">{e.name}</span><span className="shrink-0 text-muted-foreground">{e.status}</span></div>} />
            <OverviewList title="Journal d’activité" href="/admin/events" items={data.logs} render={l => <div className="flex justify-between gap-2"><span className="truncate">{l.action}</span><span className="shrink-0 text-muted-foreground">{l.reference}</span></div>} />
          </div>
        </>}
      </div>
    </main>
  </div>;
}