import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Flame, Search, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import { formatUSD } from '@/lib/format';

const DAYS = 14;
const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

export default function MarketTrends() {
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Product.list('-sold_count', 300).catch(() => []),
      base44.entities.Order.list('-created_date', 300).catch(() => []),
      // Search events are recorded at platform level; readable by administrators.
      base44.entities.AnalyticsEvent.list('-created_date', 300).catch(() => []),
    ])
      .then(([p, o, e]) => {
        setProducts(p);
        setOrders(o);
        setEvents(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const mine = useMemo(
    () => (seller ? products.filter((p) => p.seller_id === seller.id) : products),
    [products, seller],
  );

  const trending = useMemo(
    () => [...products].filter((p) => String(p.status || '') === 'published')
      .sort((a, b) => (Number(b.sold_count) || 0) - (Number(a.sold_count) || 0))
      .slice(0, 10),
    [products],
  );

  const categoryStats = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      const name = p.category_name || 'Non classé';
      if (!map[name]) map[name] = { name, sold: 0, count: 0, revenue: 0 };
      map[name].sold += Number(p.sold_count) || 0;
      map[name].count += 1;
      map[name].revenue += (Number(p.sold_count) || 0) * (Number(p.price_usd) || 0);
    });
    return Object.values(map).sort((a, b) => b.sold - a.sold).slice(0, 8);
  }, [products]);

  const demandSeries = useMemo(() => {
    const buckets = {};
    for (let i = DAYS - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets[dayKey(d)] = { day: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), commandes: 0 };
    }
    orders.forEach((o) => {
      const k = dayKey(o.created_date);
      if (buckets[k]) buckets[k].commandes += 1;
    });
    return Object.values(buckets);
  }, [orders]);

  /** Search terms captured by the platform (path like /search?q=...). */
  const searchTerms = useMemo(() => {
    const counts = {};
    events.forEach((e) => {
      const path = String(e.path || '');
      const match = path.match(/[?&]q=([^&]+)/);
      if (!match) return;
      const term = decodeURIComponent(match[1]).replace(/\+/g, ' ').trim().toLowerCase();
      if (!term) return;
      counts[term] = (counts[term] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [events]);

  const soldMine = mine.reduce((sum, p) => sum + (Number(p.sold_count) || 0), 0);

  if (loadingSeller || loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title="Tendances du marché"
        subtitle="Articles les plus vendus, catégories en croissance et signaux de demande pour ajuster votre catalogue."
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Mes articles" value={mine.length} hint={`${mine.filter((p) => String(p.status) === 'published').length} publiés`} />
        <StatCard label="Unités vendues (mes articles)" value={soldMine} tone={soldMine ? 'good' : 'default'} />
        <StatCard label="Commandes (14 j)" value={orders.filter((o) => new Date(o.created_date).getTime() > Date.now() - DAYS * 86400000).length} />
        <StatCard label="Catégorie en tête" value={categoryStats[0]?.name || '—'} hint={categoryStats[0] ? `${categoryStats[0].sold} unités` : 'aucune donnée'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold"><TrendingUp className="h-4 w-4" /> Commandes des 14 derniers jours</h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demandSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="commandes" stroke="#e4572e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold"><Flame className="h-4 w-4" /> Unités vendues par catégorie</h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="name" fontSize={10} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="sold" fill="#111111" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="min-w-0 rounded-2xl border border-border bg-card lg:col-span-2">
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold">Articles les plus demandés</h2>
          </header>
          <div className="divide-y divide-border">
            {trending.length ? trending.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-5 text-xs font-bold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{p.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.category_name || 'Non classé'} · {p.seller_name || 'vendeur'} · stock {Number(p.stock) || 0}
                  </p>
                </div>
                <span className="text-xs font-bold">{Number(p.sold_count) || 0} vendus</span>
                <span className="hidden text-xs text-muted-foreground md:block">{formatUSD(p.price_usd)}</span>
              </div>
            )) : (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Pas encore de données de vente.</p>
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-border bg-card">
          <header className="border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-bold"><Search className="h-4 w-4" /> Recherches les plus fréquentes</h2>
          </header>
          <div className="space-y-2 p-4">
            {searchTerms.length ? searchTerms.map(([term, count]) => (
              <div key={term} className="flex items-center justify-between text-xs">
                <span className="truncate">{term}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
            )) : (
              <p className="text-[11px] text-muted-foreground">
                Les termes de recherche sont enregistrés au niveau de la plateforme et sont visibles par les
                administrateurs. En attendant, les articles les plus commandés ci-contre reflètent la demande réelle.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}