import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import { SELLER_LINKS } from '@/lib/navLinks';
import { formatUSD } from '@/lib/format';
import DashboardNav from '@/components/DashboardNav';
import StatCard from '@/components/ops/StatCard';
import SalesTrendChart from '@/components/reports/SalesTrendChart';

const WEEKS = 8;

function weekly(fulfillments) {
  const now = Date.now();
  const buckets = Array.from({ length: WEEKS }, (_, i) => {
    const start = new Date(now - (WEEKS - i) * 7 * 864e5);
    return { label: start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), sales: 0, orders: 0 };
  });
  fulfillments.forEach((f) => {
    const idx = WEEKS - 1 - Math.floor((now - new Date(f.created_date)) / (7 * 864e5));
    if (idx >= 0 && idx < WEEKS) { buckets[idx].sales += f.subtotal_usd || 0; buckets[idx].orders += 1; }
  });
  return buckets;
}

export default function SellerReports() {
  const { sellers, seller, isAdmin, loading, selectSeller } = useActiveSeller();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!seller) return;
    setData(null);
    Promise.all([
      base44.entities.FulfillmentOrder.filter({ seller_id: seller.id }, '-created_date', 500),
      base44.entities.Review.filter({ seller_id: seller.id, status: 'published' }, '-created_date', 100),
    ]).then(([fulfillments, reviews]) => setData({ fulfillments, reviews }));
  }, [seller]);

  if (loading) return <div className="mx-auto mt-6 h-40 max-w-5xl animate-pulse rounded-2xl bg-secondary" />;
  if (!seller) return <p className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">Aucune boutique n'est associée à votre compte.</p>;

  const valid = (data?.fulfillments || []).filter((f) => !['CANCELLED', 'RETURNED'].includes(f.status));
  const gross = valid.reduce((s, f) => s + (f.subtotal_usd || 0), 0);
  const commission = gross * (seller.commission_rate || 10) / 100;
  const reviews = data?.reviews || [];
  const avg = reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 pb-24">
      <DashboardNav title="Rapports vendeur" links={SELLER_LINKS} />
      {isAdmin && (
        <select value={seller.id} onChange={(e) => selectSeller(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-2 text-sm">
          {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      {!data ? <div className="h-60 animate-pulse rounded-2xl bg-secondary" /> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Ventes brutes" value={formatUSD(gross)} />
            <StatCard label={`Commission (${seller.commission_rate || 10} %)`} value={formatUSD(commission)} />
            <StatCard label="Gains nets" value={formatUSD(gross - commission)} tone="good" />
            <StatCard label="Note moyenne" value={reviews.length ? `${avg.toFixed(1)}/5` : '–'} hint={`${reviews.length} avis`} />
          </div>
          <section className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-bold">Ventes des {WEEKS} dernières semaines</p>
            <SalesTrendChart data={weekly(valid)} />
          </section>
          <section className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-bold">Avis clients récents</p>
            {reviews.length === 0 ? <p className="text-xs text-muted-foreground">Aucun avis pour l'instant.</p> : (
              <div className="divide-y divide-border">
                {reviews.slice(0, 10).map((r) => (
                  <div key={r.id} className="py-2.5 text-xs">
                    <p><span className="font-bold">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span> · {r.product_title} · {new Date(r.created_date).toLocaleDateString('fr-FR')}</p>
                    {r.comment && <p className="mt-0.5 text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}