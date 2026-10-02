import React, { memo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, formatUSD } from '@/lib/format';
import { cancelSubscription, changePlan, renewSubscription, settleInvoice, subscriptionLabel } from '@/lib/saas';
import { planByCode } from '@/lib/plans';
import { useTranslation } from 'react-i18next';

/** Platform-admin subscription desk: change plan, renew, cancel, settle invoices. */
export default memo(function SubscriptionPanel({ subscriptions, plans, onChange }) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const run = async (row, action) => {
    setBusyId(row.id);
    setError('');
    try {
      await action();
      onChange();
    } catch (e) {
      setError(e?.message || t('subscriptionPanel.opFailed'));
    } finally {
      setBusyId('');
    }
  };

  const invoiceFor = async (row) => {
    const rows = await base44.entities.TenantInvoice.filter({ tenant_id: row.tenant_id, status: 'past_due' }, '-created_date', 1).catch(() => []);
    return rows[0] || null;
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div>
          <h2 className="font-heading text-base font-bold">{t('subscriptionPanel.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('subscriptionPanel.subtitle')}</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2">
          {subscriptions.length === 0 && <p className="text-sm text-muted-foreground">{t('subscriptionPanel.empty')}</p>}
          {subscriptions.map((row) => {
            const plan = planByCode(plans, row.plan_code);
            return (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-[200px]">
                  <p className="text-sm font-semibold">{row.tenant_name || row.tenant_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('subscriptionPanel.rowMeta', { plan: plan.name, cycle: row.billing_cycle === 'yearly' ? t('subscriptionPanel.yearly') : t('subscriptionPanel.monthly'), status: subscriptionLabel(row.status), end: formatDate(row.current_period_end) })}
                    {row.cancel_at_period_end ? t('subscriptionPanel.cancelScheduled') : ''}
                  </p>
                </div>
                <p className="text-sm font-semibold">{formatUSD(row.amount_usd)}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={row.plan_code}
                    onChange={(e) => run(row, () => changePlan(row, planByCode(plans, e.target.value), row.billing_cycle))}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    disabled={busyId === row.id}
                  >
                    {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>
                  <Button size="sm" variant="outline" disabled={busyId === row.id} onClick={() => run(row, () => renewSubscription(row, plan, row.billing_cycle))}>
                    {t('subscriptionPanel.renew')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === row.id}
                    onClick={() => run(row, async () => {
                      const invoice = await invoiceFor(row);
                      if (invoice) await settleInvoice(invoice, `RECOUVRE-${Date.now().toString(36).toUpperCase()}`);
                      await base44.entities.Subscription.update(row.id, { status: 'active' });
                    })}
                  >
                    {t('subscriptionPanel.regularize')}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busyId === row.id} onClick={() => run(row, () => cancelSubscription(row, true))}>
                    {t('subscriptionPanel.cancel')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});