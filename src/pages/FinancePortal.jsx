import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import ReconciliationTable from '@/components/finance/ReconciliationTable';
import { providerLabel } from '@/lib/payments';
import { formatUSD, formatDateTime, round2 } from '@/lib/format';
import { useTranslation } from 'react-i18next';

const PAID = ['PAID', 'AUTHORIZED'];
const FAILED = ['FAILED', 'CANCELLED', 'REFUNDED'];

export default function FinancePortal() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list('-created_date', 500),
      base44.entities.Base44Purchase.list('-created_date', 200).catch(() => []),
      base44.entities.WalletTransaction.filter({ type: 'PAYOUT' }, '-created_date', 200),
    ]).then(([o, p, w]) => {
      setOrders(o.filter((x) => !x.is_demo));
      setPurchases(p);
      setPayouts(w);
      setLoading(false);
    });
  }, []);

  const rows = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const k = o.payment_provider || 'autre';
      map[k] ||= { provider: k, label: providerLabel(k), count: 0, paid: 0, pending: 0, failed: 0 };
      const t = Number(o.total_usd) || 0;
      map[k].count += 1;
      if (PAID.includes(o.payment_status)) map[k].paid += t;
      else if (FAILED.includes(o.payment_status)) map[k].failed += t;
      else map[k].pending += t;
    });
    return Object.values(map).sort((a, b) => b.paid - a.paid);
  }, [orders]);

  const sum = (key) => round2(rows.reduce((s, r) => s + r[key], 0));
  const vat = round2(orders.filter((o) => PAID.includes(o.payment_status)).reduce((s, o) => s + (Number(o.vat_usd) || 0), 0));
  const pendingPayouts = payouts.filter((p) => p.status === 'pending');
  const byNumber = Object.fromEntries(orders.map((o) => [o.order_number, o]));
  const mismatches = purchases.filter((p) => p.status === 'paid' && byNumber[p.productId]?.payment_status !== 'PAID');

  if (loading) return <p className="p-6 text-sm text-muted-foreground">{t('financePortal.loading')}</p>;

  return (
    <div className="space-y-5">
      <DashboardNav title={t('financePortal.admin')} links={ADMIN_LINKS} />
      <OpsHeader title={t('financePortal.title')} subtitle={t('financePortal.subtitle')}>
        <Link to="/admin/payouts" className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">{t('financePortal.processPayouts')}</Link>
      </OpsHeader>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label={t('financePortal.collected')} value={formatUSD(sum('paid'))} tone="good" />
        <StatCard label={t('financePortal.pending')} value={formatUSD(sum('pending'))} tone="warn" />
        <StatCard label={t('financePortal.vat')} value={formatUSD(vat)} />
        <StatCard label={t('financePortal.payoutsDue')} value={formatUSD(round2(pendingPayouts.reduce((s, p) => s + (Number(p.amount_usd) || 0), 0)))} hint={t('financePortal.requestCount', { count: pendingPayouts.length })} tone={pendingPayouts.length ? 'warn' : 'default'} />
        <StatCard label={t('financePortal.cardGaps')} value={mismatches.length} tone={mismatches.length ? 'bad' : 'good'} hint={t('financePortal.cardGapsHint')} />
      </div>
      <ReconciliationTable rows={rows} />
      <section className="space-y-2">
        <h2 className="text-sm font-bold">{t('financePortal.cardPayments')}</h2>
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {purchases.slice(0, 30).map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-semibold">{p.productName || p.productId}</p>
                <p className="text-xs text-muted-foreground">{p.buyerEmail || t('financePortal.anonymousBuyer')} · {formatDateTime(p.created_date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatUSD(Number(p.amount) || 0)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {p.status === 'paid' ? t('financePortal.paid') : p.status === 'canceled' ? t('financePortal.canceled') : t('financePortal.awaiting')}
                </span>
              </div>
            </div>
          ))}
          {!purchases.length && <p className="p-6 text-center text-sm text-muted-foreground">{t('financePortal.noCardPayments')}</p>}
        </div>
      </section>
    </div>
  );
}