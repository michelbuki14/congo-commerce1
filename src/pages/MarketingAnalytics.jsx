import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, ShoppingCart, CreditCard, Percent, PackageCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EventTrendChart from '@/components/marketing/EventTrendChart';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { formatUSD } from '@/lib/format';

const DAY = 86400000;
const RANGES = [
  { days: 7, label: '7 jours' },
  { days: 14, label: '14 jours' },
  { days: 30, label: '30 jours' },
];

function Tile({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </p>
      <p className="mt-1.5 text-2xl font-black">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function MarketingAnalytics() {
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  useEffect(() => {
    (async () => {
      const [ev, ord, prod] = await Promise.all([
        base44.entities.AnalyticsEvent.list('-created_date', 500).catch(() => []),
        base44.entities.Order.list('-created_date', 200).catch(() => []),
        base44.entities.Product.list('-sold_count', 100).catch(() => []),
      ]);
      setEvents(ev);
      setOrders(ord);
      setProducts(prod);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const since = Date.now() - days * DAY;
    const inRange = (row) => new Date(row.created_date).getTime() >= since;

    const recent = events.filter(inRange);
    const cartAdds = recent.filter((e) => e.name === 'cart_add');
    const checkouts = recent.filter((e) => e.name === 'order_checkout_started');
    const cartSessions = new Set(cartAdds.map((e) => e.session_id).filter(Boolean));
    const checkoutSessions = new Set(checkouts.map((e) => e.session_id).filter(Boolean));
    const abandoned = [...cartSessions].filter((s) => !checkoutSessions.has(s)).length;

    const ordersInRange = orders.filter(inRange);
    const paid = ordersInRange.filter((o) => o.payment_status === 'PAID');

    const counts = {};
    cartAdds.forEach((e) => {
      if (e.product_id) counts[e.product_id] = (counts[e.product_id] || 0) + 1;
    });
    const topProducts = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count, title: products.find((p) => p.id === id)?.title || 'Produit retiré' }));

    const chart = Array.from({ length: days }, (_, i) => {
      const key = new Date(Date.now() - (days - 1 - i) * DAY).toISOString().slice(0, 10);
      return {
        day: key.slice(5),
        cart: cartAdds.filter((e) => String(e.created_date).slice(0, 10) === key).length,
        checkout: checkouts.filter((e) => String(e.created_date).slice(0, 10) === key).length,
      };
    });

    return {
      cartSessions: cartSessions.size,
      checkoutSessions: checkoutSessions.size,
      abandoned,
      abandonmentRate: cartSessions.size ? Math.round((abandoned / cartSessions.size) * 100) : 0,
      ordersCount: ordersInRange.length,
      paidCount: paid.length,
      revenue: paid.reduce((s, o) => s + (Number(o.total_usd) || 0), 0),
      topProducts,
      chart,
    };
  }, [events, orders, products, days]);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Marketing" links={ADMIN_LINKS} />

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            type="button"
            onClick={() => setDays(r.days)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              days === r.days ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <Tile
          icon={ShoppingCart}
          label="Paniers créés"
          value={stats.cartSessions}
          hint={`${stats.abandoned} panier(s) sans paiement entamé`}
        />
        <Tile
          icon={CreditCard}
          label="Paiements entamés"
          value={stats.checkoutSessions}
          hint={`${stats.abandonmentRate} % d’abandon entre panier et paiement`}
        />
        <Tile
          icon={PackageCheck}
          label="Commandes enregistrées"
          value={stats.ordersCount}
          hint={`${stats.paidCount} payée(s) · ${formatUSD(stats.revenue)}`}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <TrendingUp className="h-4 w-4 text-primary" /> Paniers et paiements par jour
        </h2>
        <div className="mt-3">
          <EventTrendChart data={stats.chart} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Percent className="h-4 w-4 text-primary" /> Taux d’abandon
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Part des visiteurs ayant ajouté un article au panier sans entamer le paiement sur la période.
        </p>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, stats.abandonmentRate)}%` }} />
        </div>
        <p className="mt-2 text-xs font-semibold">{stats.abandonmentRate} % d’abandon</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Produits les plus ajoutés au panier</h2>
        {stats.topProducts.length ? (
          <div className="mt-2 space-y-1.5">
            {stats.topProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs">
                <span className="truncate">{p.title}</span>
                <span className="font-bold">{p.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Aucun ajout au panier enregistré sur la période.</p>
        )}
      </section>

      <p className="rounded-2xl border border-dashed border-border bg-card p-4 text-[11px] text-muted-foreground">
        Les événements sont enregistrés depuis la mise en place du suivi et couvrent uniquement les visiteurs ayant
        accepté les statistiques d’usage anonymes.
      </p>
    </div>
  );
}