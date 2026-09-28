import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatDate, formatUSD } from '@/lib/format';
import { BILLING_CYCLES, cancelSubscription, changePlan, renewSubscription, subscriptionLabel } from '@/lib/saas';
import { planByCode, planLimit, usagePercent } from '@/lib/plans';
import { useTranslation } from 'react-i18next';

export default function TenantPlanPanel({ tenant, subscription, plans, invoices, usage, onChange }) {
  const { t } = useTranslation();
  const [cycle, setCycle] = useState(subscription?.billing_cycle || 'monthly');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const plan = planByCode(plans, subscription?.plan_code || tenant?.plan_code);
  if (!subscription) {
    return (
      <Card>
        <CardContent className="space-y-2 p-5">
          <h2 className="font-heading text-base font-bold">{t('tenantPlanPanel.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('tenantPlanPanel.noSubscription')}</p>
          <Button asChild variant="outline" size="sm"><a href="/pricing">{t('tenantPlanPanel.viewPlans')}</a></Button>
        </CardContent>
      </Card>
    );
  }

  const run = async (action, successMessage) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      onChange();
    } catch (e) {
      setMessage(e?.message || t('tenantPlanPanel.opFailed'));
    } finally {
      setBusy(false);
    }
  };

  const usageRows = [
    { label: t('tenantPlanPanel.usageProducts'), used: usage?.products || 0, limit: planLimit(plan, 'product_limit') },
    { label: t('tenantPlanPanel.usageStores'), used: usage?.stores || 0, limit: planLimit(plan, 'store_limit') },
    { label: t('tenantPlanPanel.usageSellers'), used: usage?.sellers || 0, limit: planLimit(plan, 'seller_limit') },
    { label: t('tenantPlanPanel.usageMembers'), used: usage?.members || 0, limit: planLimit(plan, 'member_limit') },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-base font-bold">{t('tenantPlanPanel.currentTitle', { plan: plan.name })}</h2>
              <p className="text-sm text-muted-foreground">
                {t('tenantPlanPanel.statusLine', { status: subscriptionLabel(subscription.status) })}
                {subscription.trial_end ? t('tenantPlanPanel.trialLine', { date: formatDate(subscription.trial_end) }) : ''}
                {t('tenantPlanPanel.periodLine', { date: formatDate(subscription.current_period_end) })}
              </p>
            </div>
            <p className="text-lg font-bold">{formatUSD(subscription.amount_usd)}<span className="text-xs font-normal text-muted-foreground">/{subscription.billing_cycle === 'yearly' ? t('tenantPlanPanel.perYear') : t('tenantPlanPanel.perMonth')}</span></p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select value={cycle} onChange={(e) => setCycle(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {BILLING_CYCLES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => changePlan(subscription, plan, cycle), t('tenantPlanPanel.planUpdated'))}>
              {t('tenantPlanPanel.apply')}
            </Button>
            <Button size="sm" disabled={busy} onClick={() => run(() => renewSubscription(subscription, plan, cycle), t('tenantPlanPanel.renewed'))}>
              {t('tenantPlanPanel.renew')}
            </Button>
            {subscription.cancel_at_period_end ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => base44.entities.Subscription.update(subscription.id, { cancel_at_period_end: false, cancelled_at: '' }), t('tenantPlanPanel.resumed'))}>
                {t('tenantPlanPanel.resume')}
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => cancelSubscription(subscription, true), t('tenantPlanPanel.cancelScheduled'))}>
                {t('tenantPlanPanel.cancelAtPeriodEnd')}
              </Button>
            )}
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            {usageRows.map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{row.label}</span>
                  <span className="text-muted-foreground">{row.used} / {row.limit.toLocaleString('fr-FR')}</span>
                </div>
                <Progress value={usagePercent(row.used, row.limit)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-5">
          <h2 className="font-heading text-base font-bold">{t('tenantPlanPanel.invoices')}</h2>
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">{t('tenantPlanPanel.noInvoices')}</p>}
          {invoices.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0">
              <span className="font-mono text-xs">{inv.invoice_number}</span>
              <span className="text-muted-foreground">{t('tenantPlanPanel.invoiceMeta', { date: formatDate(inv.issued_at), plan: inv.plan_code, cycle: inv.billing_cycle === 'yearly' ? t('tenantPlanPanel.yearly') : t('tenantPlanPanel.monthly') })}</span>
              <span className="font-semibold">{formatUSD(inv.total_usd)}</span>
              <span className="text-xs">{inv.status === 'paid' ? t('tenantPlanPanel.paid') : inv.status === 'past_due' ? t('tenantPlanPanel.pastDue') : inv.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}