import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatUSD } from '@/lib/format';
import BackofficeNav from '@/components/backoffice/BackofficeNav';
import SalesTrend from '@/components/backoffice/SalesTrend';
import TopSellingCategories from '@/components/backoffice/TopSellingCategories';
import CreatorConversionRates from '@/components/backoffice/CreatorConversionRates';

export default function SalesIntelligence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await base44.functions.invoke('superAdminSales', {});
      setData(response.data);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return <div className="min-h-screen bg-background font-body text-foreground md:flex">
    <BackofficeNav />
    <main className="min-w-0 flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Super Admin · Pilotage</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Performance commerciale</h1>
          <p className="mt-1 text-sm text-muted-foreground">Les 30 derniers jours, hors commandes annulées, remboursées ou de démonstration.</p>
        </header>
        {loading && <div role="status" className="h-64 animate-pulse rounded-2xl bg-secondary"><span className="sr-only">Chargement des ventes</span></div>}
        {!loading && error && <div role="alert" className="rounded-xl border border-destructive bg-card p-5 text-sm">Impossible de charger les ventes. <button type="button" onClick={load} className="ml-2 font-semibold text-primary underline">Réessayer</button></div>}
        {!loading && !error && data && <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Ventes payées</p><p className="mt-1 text-xl font-bold">{formatUSD(data.totalRevenue)}</p></div>
            <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Commandes payées</p><p className="mt-1 text-xl font-bold">{data.totalOrders}</p></div>
          </div>
          <SalesTrend data={data.daily} />
          <div className="grid gap-4 lg:grid-cols-2"><TopSellingCategories categories={data.categories} /><CreatorConversionRates creators={data.creators} /></div>
        </>}
      </div>
    </main>
  </div>;
}