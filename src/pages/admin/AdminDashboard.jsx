import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, TrendingUp, AlertTriangle, Users, Package, Wallet as WalletIcon, Store, Coins } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardShell from '@/components/DashboardShell';
import StatusBadge from '@/components/StatusBadge';
import AdminLiveOverview from '@/components/admin/AdminLiveOverview';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { formatUSD, formatDateTime } from '@/lib/format';
import { useTranslation } from 'react-i18next';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [orders, fulfillments, products, sellers, returns, disputes, wallets, logs] = await Promise.all([
        base44.entities.Order.list('-created_date', 200).catch(() => []),
        base44.entities.FulfillmentOrder.list('-created_date', 300).catch(() => []),
        base44.entities.Product.list('-created_date', 300).catch(() => []),
        base44.entities.Seller.list('name', 100).catch(() => []),
        base44.entities.Return.list('-created_date', 100).catch(() => []),
        base44.entities.Dispute.list('-created_date', 100).catch(() => []),
        base44.entities.Wallet.filter({ owner_type: 'platform' }).catch(() => []),
        base44.entities.AuditLog.list('-created_date', 15).catch(() => []),
      ]);
      setData({ orders, fulfillments, products, sellers, returns, disputes, wallet: wallets[0] || null, logs });
      setLoading(false);
    })();
  }, []);

  if (loading || !data) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  const { orders, fulfillments, products, sellers, returns, disputes, wallet, logs } = data;
  const gmv = orders.reduce((s, o) => s + (o.total_usd || 0), 0);
  const revenue = fulfillments.reduce((s, f) => s + (f.platform_revenue_usd || 0), 0);
  const pendingFulfillments = fulfillments.filter((f) => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(f.status));
  const openReturns = returns.filter((r) => !['refunded', 'closed', 'rejected'].includes(r.status));
  const openDisputes = disputes.filter((d) => !['resolved_buyer', 'resolved_seller', 'closed'].includes(d.status));

  const kpis = [
    { icon: TrendingUp, label: t('adminDashboard.gmv'), value: formatUSD(gmv) },
    { icon: Coins, label: t('adminDashboard.revenue'), value: formatUSD(revenue) },
    { icon: ShoppingBag, label: t('adminDashboard.orders'), value: orders.length },
    { icon: Package, label: t('adminDashboard.pendingShip'), value: pendingFulfillments.length },
    { icon: Store, label: t('adminDashboard.sellers'), value: sellers.length },
    { icon: Users, label: t('adminDashboard.products'), value: products.length },
    { icon: AlertTriangle, label: t('adminDashboard.openReturns'), value: openReturns.length },
    { icon: WalletIcon, label: t('adminDashboard.treasury'), value: formatUSD(wallet?.balance_usd || 0) },
  ];

  return (
    <DashboardShell nav={ADMIN_LINKS} title={t('adminDashboard.title')}>
      <AdminLiveOverview />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3.5">
            <k.icon className="h-4 w-4 text-primary" />
            <p className="mt-1.5 text-lg font-bold">{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {openDisputes.length > 0 && (
        <Link to="/admin/returns" className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          {t('adminDashboard.disputeBanner', { count: openDisputes.length })}
        </Link>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">{t('adminDashboard.latestOrders')}</h2>
          <Link to="/admin/orders" className="text-xs font-semibold text-primary">{t('adminDashboard.viewAll')}</Link>
        </div>
        <div className="space-y-2">
          {orders.slice(0, 8).map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{o.order_number}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t('adminDashboard.orderMeta', { customer: o.customer_name, city: o.city, count: o.fulfillment_count || 1 })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={o.payment_status} />
                <StatusBadge status={o.status} />
                <span className="text-sm font-semibold">{formatUSD(o.total_usd)}</span>
              </div>
            </div>
          ))}
          {!orders.length && <p className="text-xs text-muted-foreground">{t('adminDashboard.noOrders')}</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('adminDashboard.audit')}</h2>
        <div className="space-y-1.5">
          {logs.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs">
              <span className="font-mono text-[11px]">{l.action}</span>
              <span className="text-muted-foreground">{l.reference || l.entity}</span>
              <span className="text-muted-foreground">{formatDateTime(l.created_date)}</span>
            </div>
          ))}
          {!logs.length && <p className="text-xs text-muted-foreground">{t('adminDashboard.noLogs')}</p>}
        </div>
      </section>
    </DashboardShell>
  );
}