import React, { useCallback, useEffect, useState } from 'react';
import { Building2, CreditCard, TrendingUp, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import PlanEditor from '@/components/saas/PlanEditor';
import SubscriptionPanel from '@/components/saas/SubscriptionPanel';
import TenantForm from '@/components/saas/TenantForm';
import { loadPlans } from '@/lib/plans';
import { annualRunRate, monthlyRecurring } from '@/lib/saas';
import { formatDate, formatUSD } from '@/lib/format';

const STATUS_LABELS = {
  onboarding: 'À configurer',
  trial: 'Essai',
  active: 'Actif',
  suspended: 'Suspendu',
  cancelled: 'Annulé',
};

export default function AdminTenants() {
  const [tenants, setTenants] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [t, s, p, i, d] = await Promise.all([
      base44.entities.Tenant.list('-created_date', 200).catch(() => []),
      base44.entities.Subscription.list('-created_date', 200).catch(() => []),
      loadPlans(),
      base44.entities.TenantInvoice.list('-created_date', 50).catch(() => []),
      base44.entities.TenantDomain.list('-created_date', 200).catch(() => []),
    ]);
    setTenants(t);
    setSubscriptions(s);
    setPlans(p);
    setInvoices(i);
    setDomains(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveTenant = async (form) => {
    setBusy(true);
    try {
      await base44.entities.Tenant.update(editing.id, form);
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (tenant, status) => {
    await base44.entities.Tenant.update(tenant.id, { status });
    await load();
  };

  const verifyDomain = async (domain) => {
    await base44.entities.TenantDomain.update(domain.id, {
      status: 'verified',
      ssl_status: 'active',
      verified_at: new Date().toISOString(),
    });
    await load();
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  const mrr = monthlyRecurring(subscriptions);
  const kpis = [
    { label: 'Enseignes', value: tenants.length, icon: Building2 },
    { label: 'Abonnements actifs', value: subscriptions.filter((s) => ['active', 'trialing'].includes(s.status)).length, icon: Users },
    { label: 'Revenu mensuel (MRR)', value: formatUSD(mrr), icon: TrendingUp },
    { label: 'Revenu annuel projeté', value: formatUSD(annualRunRate(subscriptions)), icon: CreditCard },
  ];

  return (
    <div className="space-y-5 py-2">
      <DashboardNav title="Console plateforme" links={ADMIN_LINKS} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <k.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-heading text-base font-bold">Enseignes clientes</h2>
          {tenants.length === 0 && <p className="text-sm text-muted-foreground">Aucune enseigne créée pour le moment.</p>}
          <div className="space-y-2">
            {tenants.map((t) => {
              const sub = subscriptions.find((s) => s.tenant_id === t.id);
              const tenantDomains = domains.filter((d) => d.tenant_id === t.id);
              return (
                <div key={t.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-[220px]">
                      <p className="text-sm font-semibold">{t.name} <span className="font-mono text-xs text-muted-foreground">/{t.slug}</span></p>
                      <p className="text-xs text-muted-foreground">
                        {t.owner_email || 'sans responsable'} · {t.city || '—'} · {sub ? sub.plan_code : t.plan_code} · {STATUS_LABELS[t.status] || t.status}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {sub ? `${sub.billing_cycle === 'yearly' ? 'annuel' : 'mensuel'} · ${formatUSD(sub.amount_usd)} · période jusqu’au ${formatDate(sub.current_period_end)}` : 'sans abonnement'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(t)}>Modifier</Button>
                      {t.status === 'suspended'
                        ? <Button size="sm" variant="ghost" onClick={() => setStatus(t, 'active')}>Réactiver</Button>
                        : <Button size="sm" variant="ghost" onClick={() => setStatus(t, 'suspended')}>Suspendre</Button>}
                    </div>
                  </div>

                  {tenantDomains.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tenantDomains.map((d) => (
                        <span key={d.id} className="flex items-center gap-2 rounded-full border border-border px-2 py-0.5 text-[11px]">
                          {d.hostname} · {d.status}
                          {d.status !== 'verified' && (
                            <button type="button" className="font-semibold underline" onClick={() => verifyDomain(d)}>valider</button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="font-heading text-base font-bold">Modifier {editing.name}</h2>
            <TenantForm initial={editing} onSubmit={saveTenant} submitting={busy} submitLabel="Enregistrer" />
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Annuler</Button>
          </CardContent>
        </Card>
      )}

      <SubscriptionPanel subscriptions={subscriptions} plans={plans} onChange={load} />

      <div>
        <h2 className="mb-3 font-heading text-base font-bold">Catalogue des formules</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => <PlanEditor key={plan.code} plan={plan} onSaved={load} />)}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-2 p-5">
          <h2 className="font-heading text-base font-bold">Dernières factures d’abonnement</h2>
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">Aucune facture émise.</p>}
          {invoices.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0">
              <span className="font-mono text-xs">{inv.invoice_number}</span>
              <span className="text-muted-foreground">{inv.tenant_name} · {inv.plan_code} · {formatDate(inv.issued_at)}</span>
              <span className="font-semibold">{formatUSD(inv.total_usd)}</span>
              <span className="text-xs">{inv.status === 'paid' ? 'Payée' : inv.status === 'past_due' ? 'Impayée' : inv.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}