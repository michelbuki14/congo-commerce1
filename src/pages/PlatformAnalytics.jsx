import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import ActivityChart from '@/components/analytics/ActivityChart';
import VolumeChart from '@/components/analytics/VolumeChart';
import CategoryRanking from '@/components/analytics/CategoryRanking';
import { compactNumber, formatUSD, round2 } from '@/lib/format';

const DAYS = 14;
const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

export default function PlatformAnalytics() {
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.AnalyticsEvent.list('-created_date', 1000).catch(() => []),
      base44.entities.Order.list('-created_date', 500).catch(() => []),
      base44.entities.Product.list('-sold_count', 500).catch(() => []),
      base44.entities.Seller.list('name', 200).catch(() => []),
    ])
      .then(([e, o, p, s]) => {
        setEvents(e);
        setOrders(o);
        setProducts(p);
        setSellers(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const series = useMemo(() => {
    const buckets = {};
    for (let i = DAYS - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets[dayKey(d)] = {
        day: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        sessions: new Set(),
        volume: 0,
        commandes: 0,
        payees: 0,
      };
    }
    events.forEach((e) => {
      const bucket = buckets[dayKey(e.created_date)];
      if (bucket && e.session_id) bucket.sessions.add(e.session_id);
    });
    orders.forEach((o) => {
      const bucket = buckets[dayKey(o.created_date)];
      if (!bucket) return;
      bucket.volume = round2(bucket.volume + (Number(o.total_usd) || 0));
      bucket.commandes += 1;
      if (String(o.payment_status || '') === 'PAID') bucket.payees += 1;
    });
    return Object.entries(buckets).map(([key, b]) => ({
      key,
      day: b.day,
      actifs: b.sessions.size,
      volume: b.volume,
      commandes: b.commandes,
      payees: b.payees,
    }));
  }, [events, orders]);

  const categories = useMemo(() => {
    const byId = {};
    products.forEach((p) => { byId[p.id] = p; });
    const map = {};
    let sawItems = false;
    orders.forEach((o) => (o.items || []).forEach((it) => {
      sawItems = true;
      const product = byId[it.product_id];
      const name = it.category_name || product?.category_name || 'Non classé';
      if (!map[name]) map[name] = { name, units: 0, revenue: 0 };
      map[name].units += Number(it.quantity) || 1;
      map[name].revenue = round2(map[name].revenue + (Number(it.line_total_usd) || 0));
    }));
    if (!sawItems) {
      products.forEach((p) => {
        const name = p.category_name || 'Non classé';
        if (!map[name]) map[name] = { name, units: 0, revenue: 0 };
        map[name].units += Number(p.sold_count) || 0;
        map[name].revenue = round2(map[name].revenue + (Number(p.sold_count) || 0) * (Number(p.price_usd) || 0));
      });
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [orders, products]);

  const totals = useMemo(() => {
    const today = dayKey(new Date());
    const last = series[series.length - 1] || { actifs: 0 };
    const gmv = series.reduce((sum, d) => sum + d.volume, 0);
    const orderCount = series.reduce((sum, d) => sum + d.commandes, 0);
    const paid = series.reduce((sum, d) => sum + d.payees, 0);
    const uniqueSessions = new Set(events.filter((e) => dayKey(e.created_date) >= series[0]?.key).map((e) => e.session_id).filter(Boolean)).size;
    return {
      today,
      dauToday: last.actifs,
      activeUsers: uniqueSessions,
      gmv,
      orderCount,
      paid,
      aov: orderCount ? round2(gmv / orderCount) : 0,
    };
  }, [series, events]);

  const publishedProducts = products.filter((p) => String(p.status || '') === 'published').length;

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title="Analytique plateforme"
        subtitle="Vue d'ensemble de la plateforme sur les 14 derniers jours : audience, volume de transactions et catégories qui tirent les ventes."
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
        <StatCard label="Actifs aujourd'hui" value={totals.dauToday} hint="sessions distinctes" tone={totals.dauToday ? 'good' : 'default'} />
        <StatCard label="Actifs (14 j)" value={totals.activeUsers} hint="visiteurs uniques" />
        <StatCard label="Volume (14 j)" value={formatUSD(totals.gmv)} hint={`${totals.orderCount} commandes`} />
        <StatCard label="Panier moyen" value={formatUSD(totals.aov)} hint="sur la période" />
        <StatCard label="Commandes payées" value={`${totals.paid}/${totals.orderCount}`} hint="paiement confirmé" tone={totals.paid ? 'good' : 'default'} />
        <StatCard label="Catalogue" value={compactNumber(publishedProducts)} hint={`${sellers.length} vendeurs · ${products.length} articles`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityChart data={series} />
        <VolumeChart data={series} />
      </div>

      <CategoryRanking categories={categories} />
    </div>
  );
}