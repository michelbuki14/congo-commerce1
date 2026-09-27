import React, { useCallback, useEffect, useState } from 'react';
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
        setMessage(`Formule ${plan.name} appliquée : ${planAmountLabel(plan, cycle)} · commission ${Number(plan.commission_rate) || 0} %.`);
      } else {
        await startSubscription({
          tenant: { id: seller.id, name: seller.name, owner_email: me?.email || seller.email || '', currency: 'USD' },
          plan,
          cycle,
          me,
        });
        setMessage(`Abonnement ${plan.name} ouvert. Vos nouveaux outils sont actifs immédiatement.`);
      }
      await loadMine();
    } catch (e) {
      setError(e?.message || "Le changement de formule n'a pas pu être appliqué.");
    } finally {
      setBusy(false);
    }
  };

  if (loadingSeller || loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  if (!seller) {
    return (
      <EmptyState
        icon={Store}
        title="Aucune boutique rattachée à ce compte"
        description="Les formules d'abonnement s'appliquent à une boutique. Ouvrez la vôtre pour choisir une formule."
        actionLabel="Devenir vendeur"
        actionTo="/seller-application"
      />
    );
  }

  const usageRows = [
    { label: 'Produits', used: usage.products, limit: planLimit(current, 'product_limit') },
    { label: 'Boutiques', used: usage.stores, limit: planLimit(current, 'store_limit') },
    { label: 'Vendeurs', used: usage.sellers, limit: planLimit(current, 'seller_limit') },
    { label: 'Équipe', used: usage.members, limit: planLimit(current, 'member_limit') },
  ];

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title="Formules d'abonnement"
        subtitle="Comparez les formules de la plateforme : plus vous montez, plus les limites augmentent et plus la commission baisse."
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
            <h2 className="text-sm font-bold">Formule actuelle — {current.name}</h2>
            <p className="text-[11px] text-muted-foreground">
              {subscription
                ? `Statut ${subscriptionLabel(subscription.status)}${subscription.trial_end ? ` · essai jusqu'au ${formatDate(subscription.trial_end)}` : ''} · période en cours jusqu'au ${formatDate(subscription.current_period_end)}`
                : 'Aucun abonnement enregistré : la formule gratuite s’applique jusqu’à votre première souscription.'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{planAmountLabel(current, cycle)}</p>
            <p className="text-[11px] text-muted-foreground">
              commission {Number(current.commission_rate) || 0} %
              {subscription ? ` · ${formatUSD(subscription.amount_usd)} facturé` : ''}
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
        Changer de formule s'applique immédiatement : la période en cours est recalculée sur la nouvelle grille et une
        facture d'abonnement est émise à chaque renouvellement. Les commissions sont retenues sur chaque vente réglée.
      </p>
    </div>
  );
}