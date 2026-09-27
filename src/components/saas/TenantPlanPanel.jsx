import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatDate, formatUSD } from '@/lib/format';
import { BILLING_CYCLES, cancelSubscription, changePlan, renewSubscription, subscriptionLabel } from '@/lib/saas';
import { planByCode, planLimit, usagePercent } from '@/lib/plans';

export default function TenantPlanPanel({ tenant, subscription, plans, invoices, usage, onChange }) {
  const [cycle, setCycle] = useState(subscription?.billing_cycle || 'monthly');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const plan = planByCode(plans, subscription?.plan_code || tenant?.plan_code);
  if (!subscription) {
    return (
      <Card>
        <CardContent className="space-y-2 p-5">
          <h2 className="font-heading text-base font-bold">Abonnement</h2>
          <p className="text-sm text-muted-foreground">Aucun abonnement actif pour cette enseigne.</p>
          <Button asChild variant="outline" size="sm"><a href="/pricing">Voir les plans</a></Button>
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
      setMessage(e?.message || 'Opération impossible.');
    } finally {
      setBusy(false);
    }
  };

  const usageRows = [
    { label: 'Produits publiés', used: usage?.products || 0, limit: planLimit(plan, 'product_limit') },
    { label: 'Boutiques', used: usage?.stores || 0, limit: planLimit(plan, 'store_limit') },
    { label: 'Vendeurs', used: usage?.sellers || 0, limit: planLimit(plan, 'seller_limit') },
    { label: 'Membres d’équipe', used: usage?.members || 0, limit: planLimit(plan, 'member_limit') },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-base font-bold">Abonnement — {plan.name}</h2>
              <p className="text-sm text-muted-foreground">
                Statut {subscriptionLabel(subscription.status)}
                {subscription.trial_end ? ` · essai jusqu’au ${formatDate(subscription.trial_end)}` : ''}
                {' · '}période en cours jusqu’au {formatDate(subscription.current_period_end)}
              </p>
            </div>
            <p className="text-lg font-bold">{formatUSD(subscription.amount_usd)}<span className="text-xs font-normal text-muted-foreground">/{subscription.billing_cycle === 'yearly' ? 'an' : 'mois'}</span></p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select value={cycle} onChange={(e) => setCycle(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {BILLING_CYCLES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => changePlan(subscription, plan, cycle), 'Formule mise à jour.')}>
              Appliquer la formule
            </Button>
            <Button size="sm" disabled={busy} onClick={() => run(() => renewSubscription(subscription, plan, cycle), 'Période renouvelée et facture émise.')}>
              Renouveler
            </Button>
            {subscription.cancel_at_period_end ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => base44.entities.Subscription.update(subscription.id, { cancel_at_period_end: false, cancelled_at: '' }), 'Résiliation annulée.')}>
                Reprendre
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => cancelSubscription(subscription, true), 'Résiliation programmée en fin de période.')}>
                Résilier en fin de période
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
          <h2 className="font-heading text-base font-bold">Factures d’abonnement</h2>
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">Aucune facture émise.</p>}
          {invoices.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0">
              <span className="font-mono text-xs">{inv.invoice_number}</span>
              <span className="text-muted-foreground">{formatDate(inv.issued_at)} · {inv.plan_code} · {inv.billing_cycle === 'yearly' ? 'annuel' : 'mensuel'}</span>
              <span className="font-semibold">{formatUSD(inv.total_usd)}</span>
              <span className="text-xs">{inv.status === 'paid' ? 'Payée' : inv.status === 'past_due' ? 'Impayée' : inv.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}