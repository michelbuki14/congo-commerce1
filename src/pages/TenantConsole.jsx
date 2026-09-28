import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import TenantForm from '@/components/saas/TenantForm';
import TenantDomainPanel from '@/components/saas/TenantDomainPanel';
import TenantTeamPanel from '@/components/saas/TenantTeamPanel';
import TenantPlanPanel from '@/components/saas/TenantPlanPanel';
import { useActiveTenant } from '@/lib/tenancy';
import { loadPlans } from '@/lib/plans';

export default function TenantConsole() {
  const { t } = useTranslation();
  const { tenant, tenants, isAdmin, loading, selectTenant, reload } = useActiveTenant();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [domains, setDomains] = useState([]);
  const [members, setMembers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [usage, setUsage] = useState({ products: 0, stores: 0, sellers: 0, members: 0 });
  const [busy, setBusy] = useState(false);
  const [access, setAccess] = useState(null);
  const [accessError, setAccessError] = useState('');

  const loadTenantData = useCallback(async () => {
    if (!tenant || !access?.granted) return;
    const has = (key) => access.owner || access.permissions.includes(key);
    const [subs, doms, mems, invs, products, sellers] = await Promise.all([
      access.owner ? base44.entities.Subscription.filter({ tenant_id: tenant.id }, '-created_date', 1).catch(() => []) : [],
      access.owner ? base44.entities.TenantDomain.filter({ tenant_id: tenant.id }, '-created_date', 20).catch(() => []) : [],
      has('TEAM_MANAGE') ? base44.functions.invoke('manageTenantTeam', { action: 'list', tenantId: tenant.id }).then(r => r.data.members) : [],
      access.owner ? base44.entities.TenantInvoice.filter({ tenant_id: tenant.id }, '-created_date', 20).catch(() => []) : [],
      access.owner ? base44.entities.Product.filter({ tenant_id: tenant.id }, '-created_date', 500).catch(() => []) : [],
      access.owner ? base44.entities.Seller.filter({ tenant_id: tenant.id }, '-created_date', 200).catch(() => []) : [],
    ]);
    setSubscription(subs[0] || null);
    setDomains(doms);
    setMembers(mems);
    setInvoices(invs);
    setUsage({ products: products.length, stores: 1, sellers: sellers.length, members: mems.length });
  }, [tenant, access]);

  useEffect(() => {
    let alive = true;
    setAccess(null);
    setAccessError('');
    if (tenant) base44.functions.invoke('manageTenantTeam', { action: 'access', tenantId: tenant.id })
      .then(r => { if (alive) setAccess({ ...r.data, tenantId: tenant.id }); })
      .catch(() => { if (alive) setAccessError('Impossible de vérifier vos droits.'); });
    return () => { alive = false; };
  }, [tenant?.id]);

  useEffect(() => {
    if (access && tenant && access.tenantId === tenant.id && access.owner) loadPlans().then(setPlans);
  }, [tenant?.id, access]);

  useEffect(() => {
    if (access?.tenantId === tenant?.id) loadTenantData();
  }, [access, loadTenantData, tenant?.id]);

  const saveTenant = async (form) => {
    setBusy(true);
    try {
      await base44.entities.Tenant.update(tenant.id, { ...form, owner_email: tenant.owner_email });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;
  }

  if (!tenant) {
    return (
      <EmptyState
        icon={Store}
        title={t('tenantConsole.emptyTitle')}
        description={t('tenantConsole.emptyDesc')}
        actionLabel={t('tenantConsole.emptyAction')}
        actionTo="/tenant-onboarding"
      />
    );
  }

  if (accessError) return <p role="alert" className="p-6 text-destructive">{accessError}</p>;
  if (!access || access.tenantId !== tenant.id) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;
  if (!access.granted) return <p role="alert" className="p-6">Accès refusé à cette enseigne.</p>;
  const has = (key) => access.owner || access.permissions.includes(key);

  return (
    <div className="space-y-5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold md:text-2xl">{tenant.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t('tenantConsole.meta', { email: tenant.owner_email || t('tenantConsole.noOwner'), status: tenant.status })}
          </p>
        </div>
        {tenants.length > 1 && (
          <select
            value={tenant.id}
            onChange={(e) => selectTenant(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => { window.location.href = '/admin/tenants'; }}>
            {t('tenantConsole.platformConsole')}
          </Button>
        )}
      </div>

      {access.owner && <TenantPlanPanel tenant={tenant} subscription={subscription} plans={plans} invoices={invoices} usage={usage} onChange={loadTenantData} />}

      {access.owner && <TenantDomainPanel tenant={tenant} domains={domains} onChange={loadTenantData} />}

      {has('TEAM_MANAGE') && <TenantTeamPanel tenant={tenant} members={members} onChange={loadTenantData} permissions={access.permissions} owner={access.owner} />}

      {access.owner && <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-heading text-base font-bold">{t('tenantConsole.brandTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('tenantConsole.brandDesc')}</p>
          </div>
          <TenantForm initial={tenant} lockOwnerEmail onSubmit={saveTenant} submitting={busy} submitLabel={t('tenantConsole.saveIdentity')} />
        </CardContent>
      </Card>}
      {!has('TEAM_MANAGE') && !access.owner && <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Vos droits portent sur les opérations de cette enseigne, accessibles depuis votre espace métier.</p>}
    </div>
  );
}