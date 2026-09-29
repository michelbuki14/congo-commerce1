import React, { useEffect, useState } from 'react';
import { CreditCard, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { formatDate, formatUSD } from '@/lib/format';
import { monthlyRecurring, annualRunRate } from '@/lib/saas';

export default function AdminBilling() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dunning, setDunning] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const [inv, subs] = await Promise.all([
      base44.entities.TenantInvoice.list('-issued_at', 100).catch(() => []),
      base44.entities.Subscription.list('-created_date', 200).catch(() => []),
    ]);
    setInvoices(inv);
    setSubscriptions(subs);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const result = await base44.functions.invoke('billing-cron', { action: 'generate-invoices' });
      setMessage(
        result?.message
          ? t('adminBilling.generateSuccess', { msg: result.message })
          : t('adminBilling.generateSuccessDefault', { count: result?.count ?? 0 }),
      );
      await load();
    } catch (err) {
      setMessage(t('adminBilling.generateError', { error: err?.message || 'Erreur inconnue' }));
    } finally {
      setGenerating(false);
    }
  };

  const handleRunDunning = async () => {
    setDunning(true);
    setMessage('');
    try {
      const result = await base44.functions.invoke('billing-cron', { action: 'run-dunning' });
      setMessage(
        result?.message
          ? t('adminBilling.dunningSuccess', { msg: result.message })
          : t('adminBilling.dunningSuccessDefault', { count: result?.count ?? 0 }),
      );
      await load();
    } catch (err) {
      setMessage(t('adminBilling.dunningError', { error: err?.message || 'Erreur inconnue' }));
    } finally {
      setDunning(false);
    }
  };

  const activeSubscriptions = subscriptions.filter((s) => ['active', 'trialing'].includes(s.status));
  const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue');
  const mrr = monthlyRecurring(subscriptions);
  const arr = annualRunRate(subscriptions);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  const kpis = [
    { icon: CreditCard, label: t('adminBilling.mrr'), value: formatUSD(mrr) },
    { icon: TrendingUp, label: t('adminBilling.arr'), value: formatUSD(arr) },
    { icon: AlertTriangle, label: t('adminBilling.activeSubs'), value: activeSubscriptions.length },
    { icon: AlertTriangle, label: t('adminBilling.overdueInvoices'), value: overdueInvoices.length },
  ];

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('adminBilling.title')} links={ADMIN_LINKS} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3.5">
            <k.icon className="h-4 w-4 text-primary" />
            <p className="mt-1.5 text-lg font-bold">{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleGenerateInvoices} disabled={generating}>
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? t('adminBilling.generating') : t('adminBilling.generateBtn')}
        </Button>
        <Button onClick={handleRunDunning} disabled={dunning} variant="outline">
          <AlertTriangle className={`h-4 w-4 ${dunning ? 'animate-pulse' : ''}`} />
          {dunning ? t('adminBilling.dunningRunning') : t('adminBilling.dunningBtn')}
        </Button>
      </div>

      {message && (
        <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('adminBilling.invoicesTitle')}</h2>
        <div className="space-y-2">
          {invoices.slice(0, 20).map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{inv.tenant_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {inv.plan_code} · {inv.invoice_number || '—'} · {formatDate(inv.issued_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase">{inv.status}</span>
                <span className="text-sm font-semibold">{formatUSD(inv.total_usd)}</span>
              </div>
            </div>
          ))}
          {!invoices.length && (
            <p className="text-xs text-muted-foreground">{t('adminBilling.noInvoices')}</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('adminBilling.subscriptionsTitle')}</h2>
        <div className="space-y-2">
          {subscriptions.slice(0, 20).map((sub) => (
            <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{sub.tenant_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {sub.plan_code} · {sub.billing_cycle} · {formatDate(sub.current_period_end)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase">{sub.status}</span>
                <span className="text-sm font-semibold">{formatUSD(sub.amount_usd)}</span>
              </div>
            </div>
          ))}
          {!subscriptions.length && (
            <p className="text-xs text-muted-foreground">{t('adminBilling.noSubscriptions')}</p>
          )}
        </div>
      </section>
    </div>
  );
}
