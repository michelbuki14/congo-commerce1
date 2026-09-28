import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import OpsHeader from '@/components/ops/OpsHeader';
import EmptyState from '@/components/EmptyState';
import PlanComparisonTable from '@/components/saas/PlanComparisonTable';
import { Progress } from '@/components/ui/progress';
import { BILLING_CYCLES, changePlan, startSubscription, subscriptionLabel } from '@/lib/saas';
import { loadPlans, planAmountLabel, planByCode, planLimit, usagePercent } from '@/lib/plans';
import { formatDate, formatUSD } from '@/lib/format';

export default function SubscriptionPlans() {
  const { t } = useTranslation();
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [me, setMe] = useState(null);
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState({ products: 0, stores: 0, sellers: 0, members: 0 });
  const [cycle, setCycle] = useState('monthly');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setMe).catch(() => setMe(null));
    loadPlans().then(setPlans);
  }, []);

  const loadMine = useCallback(async () => {
    if (!seller && !me) return;
    const [byOwner, byTenant, products, storeSellers, members] = await Promise.all([
      me ? base44.entities.Subscription.filter({ owner_email: me.email }, '-created_date', 5).catch(() => []) : [],
      seller ? base44.entities.Subscription.filter({ tenant_id: seller.id }, '-created_date', 5).catch(() => []) : [],
      seller ? base44.entities.Product.filter({ seller_id: seller.id }, '-created_date', 500).catch(() => []) : [],
      seller ? base44.entities.Seller.filter({ tenant_id: seller.id }, '-created_date', 200).catch(() => []) : [],
      seller ? base44.entities.TenantMember.filter({ tenant_id: seller.id }, '-created_date', 200).catch(() => []) : [],
    ]);
    const sub = byOwner[0] || byTenant[0] || null;
    setSubscription(sub);
    setCycle(sub?.billing_cycle || 'monthly');
    setUsage({ products: products.length, stores: 1, sellers: storeSellers.length || 1, members: members.length });
    setLoading(false);
  }, [seller, me]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const current = planByCode(plans, subscription?.plan_code || seller?.plan_code);

  const choose = async (plan) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (subscription) {
        await changePlan(subscription, plan, cycle);
        setMessage(t('subscriptionPlans.appliedMsg', { plan: plan.name, amount: planAmountLabel(plan, cycle), rate: Number(plan.commission_rate) || 0 }));
      } else {
        await startSubscription({
          tenant: { id: seller.id, name: seller.name, owner_email: me?.email || seller.email || '', currency: 'USD' },
          plan,
          cycle,
          me,
        });
        setMessage(t('subscriptionPlans.openedMsg', { plan: plan.name }));
      }
      await loadMine();
    } catch (e) {
      setError(e?.message || t('subscriptionPlans.changeFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (loadingSeller || loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  if (!seller) {
    return (
      <EmptyState
        icon={Store}
        title={t('subscriptionPlans.noShopTitle')}
        description={t('subscriptionPlans.noShopDesc')}
        actionLabel={t('subscriptionPlans.becomeSeller')}
        actionTo="/seller-application"
      />
    );
  }

  const usageRows = [
    { label: t('subscriptionPlans.usageProducts'), used: usage.products, limit: planLimit(current, 'product_limit') },
    { label: t('subscriptionPlans.usageStores'), used: usage.stores, limit: planLimit(current, 'store_limit') },
    { label: t('subscriptionPlans.usageSellers'), used: usage.sellers, limit: planLimit(current, 'seller_limit') },
    { label: t('subscriptionPlans.usageTeam'), used: usage.members, limit: planLimit(current, 'member_limit') },
  ];

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title={t('subscriptionPlans.title')}
        subtitle={t('subscriptionPlans.subtitle')}
      >
        <div className="flex gap-1 rounded-full bg-secondary p-1">
          {BILLING_CYCLES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCycle(c.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${cycle === c.id ? 'bg-primary text-primary-foreground' : ''}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </OpsHeader>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">{t('subscriptionPlans.currentPlan', { plan: current.name })}</h2>
            <p className="text-[11px] text-muted-foreground">
              {subscription
                ? t('subscriptionPlans.subStatus', { status: subscriptionLabel(subscription.status), trial: subscription.trial_end ? t('subscriptionPlans.trialUntil', { date: formatDate(subscription.trial_end) }) : '', end: formatDate(subscription.current_period_end) })
                : t('subscriptionPlans.noSub')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{planAmountLabel(current, cycle)}</p>
            <p className="text-[11px] text-muted-foreground">
              {t('subscriptionPlans.commissionRate', { rate: Number(current.commission_rate) || 0 })}
              {subscription ? t('subscriptionPlans.billed', { amount: formatUSD(subscription.amount_usd) }) : ''}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {usageRows.map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span>{row.label}</span>
                <span className="text-muted-foreground">{row.used} / {row.limit.toLocaleString('fr-FR')}</span>
              </div>
              <Progress value={usagePercent(row.used, row.limit)} />
            </div>
          ))}
        </div>

        {message ? (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <CheckCircle2 className="h-3.5 w-3.5" /> {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-900">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        ) : null}
      </section>

      <PlanComparisonTable
        plans={plans}
        currentCode={current.code}
        cycle={cycle}
        busy={busy}
        onChoose={choose}
      />

      <p className="rounded-xl border border-border bg-card p-3.5 text-[11px] text-muted-foreground">
{t('subscriptionPlans.changeNote')}
      </p>
    </div>
  );
}