import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShoppingBag, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { formatUSD, timeAgo } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';

const PAYMENT_ORDER = ['PAID', 'PENDING', 'AUTHORIZED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED'];

/**
 * Real-time admin panel: total sales, creator commissions and the payment
 * status breakdown. Refreshes itself whenever an order or shipment changes.
 */
export default function AdminLiveOverview() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState(null);
  const [fulfillments, setFulfillments] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async () => {
    const [o, f] = await Promise.all([
      base44.entities.Order.list('-created_date', 300).catch(() => []),
      base44.entities.FulfillmentOrder.list('-created_date', 300).catch(() => []),
    ]);
    setOrders(o);
    setFulfillments(f);
    setUpdatedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    load();
    const refresh = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(load, 600);
    };
    const unsubOrders = base44.entities.Order.subscribe(refresh);
    const unsubFulfillments = base44.entities.FulfillmentOrder.subscribe(refresh);
    return () => {
      clearTimeout(timer.current);
      unsubOrders?.();
      unsubFulfillments?.();
    };
  }, [load]);

  if (!orders) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;

  const live = orders.filter((o) => o.status !== 'CANCELLED');
  const sales = live.reduce((s, o) => s + (o.total_usd || 0), 0);
  const commissioned = fulfillments.filter((f) => (f.creator_commission_usd || 0) > 0);
  const commissions = commissioned.reduce((s, f) => s + (f.creator_commission_usd || 0), 0);

  const byStatus = PAYMENT_ORDER.map((status) => {
    const rows = orders.filter((o) => (o.payment_status || 'PENDING') === status);
    return { status, count: rows.length, amount: rows.reduce((a, o) => a + (o.total_usd || 0), 0) };
  }).filter((r) => r.count > 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{t('adminLiveOverview.title')}</h2>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {t('adminLiveOverview.updated', { ago: timeAgo(updatedAt) })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border p-3.5">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <p className="mt-1.5 text-lg font-bold">{formatUSD(sales)}</p>
          <p className="text-[11px] text-muted-foreground">{t('adminLiveOverview.totalSales', { count: live.length })}</p>
        </div>
        <div className="rounded-xl border border-border p-3.5">
          <Users className="h-4 w-4 text-primary" />
          <p className="mt-1.5 text-lg font-bold">{formatUSD(commissions)}</p>
          <p className="text-[11px] text-muted-foreground">
            {t('adminLiveOverview.creatorCommissions', { count: commissioned.length })}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t('adminLiveOverview.paymentStatus')}
        </p>
        <div className="space-y-1.5">
          {byStatus.map((r) => (
            <div
              key={r.status}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <StatusBadge status={r.status} />
              <span className="text-[11px] text-muted-foreground">{t('adminLiveOverview.orderCount', { count: r.count })}</span>
              <span className="text-sm font-semibold">{formatUSD(r.amount)}</span>
            </div>
          ))}
          {!byStatus.length && <p className="text-xs text-muted-foreground">{t('adminLiveOverview.noPayments')}</p>}
        </div>
      </div>
    </section>
  );
}