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
import { useTranslation } from 'react-i18next';

export default function AdminTenants() {
  const { t } = useTranslation();
  const STATUS_LABELS = {
    onboarding: t('adminTenants.statusOnboarding'),
    trial: t('adminTenants.statusTrial'),
    active: t('adminTenants.statusActive'),
    suspended: t('adminTenants.statusSuspended'),
    cancelled: t('adminTenants.statusCancelled'),
  };
  const [tenants, setTenants] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [tx, s, p, i, d] = await Promise.all([
      base44.entities.Tenant.list('-created_date', 200).catch(() => []),
      base44.entities.Subscription.list('-created_date', 200).catch(() => []),
      loadPlans(),
      base44.entities.TenantInvoice.list('-created_date', 50).catch(() => []),
      base44.entities.TenantDomain.list('-created_date', 200).catch(() => []),
    ]);
    setTenants(tx);
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
    { label: t('adminTenants.kpiTenants'), value: tenants.length, icon: Building2 },
    { label: t('adminTenants.kpiActive'), value: subscriptions.filter((s) => ['active', 'trialing'].includes(s.status)).length, icon: Users },
    { label: t('adminTenants.kpiMrr'), value: formatUSD(mrr), icon: TrendingUp },
    { label: t('adminTenants.kpiArr'), value: formatUSD(annualRunRate(subscriptions)), icon: CreditCard },
  ];

  return (
    <div className="space-y-5 py-2">
      <DashboardNav title={t('adminTenants.title')} links={ADMIN_LINKS} />

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
          <h2 className="font-heading text-base font-bold">{t('adminTenants.tenants')}</h2>
          {tenants.length === 0 && <p className="text-sm text-muted-foreground">{t('adminTenants.noTenants')}</p>}
          <div className="space-y-2">
            {tenants.map((tx) => {
              const sub = subscriptions.find((s) => s.tenant_id === tx.id);
              const tenantDomains = domains.filter((d) => d.tenant_id === tx.id);
              return (
                <div key={tx.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-[220px]">
                      <p className="text-sm font-semibold">{tx.name} <span className="font-mono text-xs text-muted-foreground">/{tx.slug}</span></p>
                      <p className="text-xs text-muted-foreground">
                        {t('adminTenants.rowMeta', { owner: tx.owner_email || t('adminTenants.noOwner'), city: tx.city || '—', plan: sub ? sub.plan_code : tx.plan_code, status: STATUS_LABELS[tx.status] || tx.status })}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {sub ? t('adminTenants.subMeta', { cycle: sub.billing_cycle === 'yearly' ? t('adminTenants.yearly') : t('adminTenants.monthly'), amount: formatUSD(sub.amount_usd), end: formatDate(sub.current_period_end) }) : t('adminTenants.noSub')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(tx)}>{t('adminTenants.edit')}</Button>
                      {tx.status === 'suspended'
                        ? <Button size="sm" variant="ghost" onClick={() => setStatus(tx, 'active')}>{t('adminTenants.reactivate')}</Button>
                        : <Button size="sm" variant="ghost" onClick={() => setStatus(tx, 'suspended')}>{t('adminTenants.suspend')}</Button>}
                    </div>
                  </div>

                  {tenantDomains.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tenantDomains.map((d) => (
                        <span key={d.id} className="flex items-center gap-2 rounded-full border border-border px-2 py-0.5 text-[11px]">
                          {d.hostname} · {d.status}
                          {d.status !== 'verified' && (
                            <button type="button" className="font-semibold underline" onClick={() => verifyDomain(d)}>{t('adminTenants.validate')}</button>
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
            <h2 className="font-heading text-base font-bold">{t('adminTenants.editTitle', { name: editing.name })}</h2>
            <TenantForm initial={editing} onSubmit={saveTenant} submitting={busy} submitLabel={t('adminTenants.save')} />
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>{t('adminTenants.cancel')}</Button>
          </CardContent>
        </Card>
      )}

      <SubscriptionPanel subscriptions={subscriptions} plans={plans} onChange={load} />

      <div>
        <h2 className="mb-3 font-heading text-base font-bold">{t('adminTenants.plans')}</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => <PlanEditor key={plan.code} plan={plan} onSaved={load} />)}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-2 p-5">
          <h2 className="font-heading text-base font-bold">{t('adminTenants.invoices')}</h2>
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">{t('adminTenants.noInvoices')}</p>}
          {invoices.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0">
              <span className="font-mono text-xs">{inv.invoice_number}</span>
              <span className="text-muted-foreground">{inv.tenant_name} · {inv.plan_code} · {formatDate(inv.issued_at)}</span>
              <span className="font-semibold">{formatUSD(inv.total_usd)}</span>
              <span className="text-xs">{inv.status === 'paid' ? t('adminTenants.paid') : inv.status === 'past_due' ? t('adminTenants.pastDue') : inv.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}