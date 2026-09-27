import React, { useCallback, useEffect, useState } from 'react';
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
  const { tenant, tenants, isAdmin, loading, selectTenant, reload } = useActiveTenant();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [domains, setDomains] = useState([]);
  const [members, setMembers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [usage, setUsage] = useState({ products: 0, stores: 0, sellers: 0, members: 0 });
  const [busy, setBusy] = useState(false);

  const loadTenantData = useCallback(async () => {
    if (!tenant) return;
    const [subs, doms, mems, invs, products, sellers] = await Promise.all([
      base44.entities.Subscription.filter({ tenant_id: tenant.id }, '-created_date', 1).catch(() => []),
      base44.entities.TenantDomain.filter({ tenant_id: tenant.id }, '-created_date', 20).catch(() => []),
      base44.entities.TenantMember.filter({ tenant_id: tenant.id }, '-created_date', 50).catch(() => []),
      base44.entities.TenantInvoice.filter({ tenant_id: tenant.id }, '-created_date', 20).catch(() => []),
      base44.entities.Product.filter({ tenant_id: tenant.id }, '-created_date', 500).catch(() => []),
      base44.entities.Seller.filter({ tenant_id: tenant.id }, '-created_date', 200).catch(() => []),
    ]);
    setSubscription(subs[0] || null);
    setDomains(doms);
    setMembers(mems);
    setInvoices(invs);
    setUsage({ products: products.length, stores: 1, sellers: sellers.length, members: mems.length });
  }, [tenant]);

  useEffect(() => {
    loadPlans().then(setPlans);
  }, []);

  useEffect(() => {
    loadTenantData();
  }, [loadTenantData]);

  const saveTenant = async (form) => {
    setBusy(true);
    try {
      await base44.entities.Tenant.update(tenant.id, form);
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
        title="Aucune enseigne rattachée à ce compte"
        description="Créez votre enseigne pour gérer votre vitrine, vos vendeurs et votre abonnement."
        actionLabel="Créer mon enseigne"
        actionTo="/tenant-onboarding"
      />
    );
  }

  return (
    <div className="space-y-5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold md:text-2xl">{tenant.name}</h1>
          <p className="text-sm text-muted-foreground">
            Console enseigne · {tenant.owner_email || 'sans responsable'} · statut {tenant.status}
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
            Console plateforme
          </Button>
        )}
      </div>

      <TenantPlanPanel
        tenant={tenant}
        subscription={subscription}
        plans={plans}
        invoices={invoices}
        usage={usage}
        onChange={loadTenantData}
      />

      <TenantDomainPanel tenant={tenant} domains={domains} onChange={loadTenantData} />

      <TenantTeamPanel tenant={tenant} members={members} onChange={loadTenantData} />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-heading text-base font-bold">Identité & marque blanche</h2>
            <p className="text-sm text-muted-foreground">Couleurs, logo et coordonnées appliqués à votre vitrine et à vos factures.</p>
          </div>
          <TenantForm initial={tenant} onSubmit={saveTenant} submitting={busy} submitLabel="Enregistrer l’identité" />
        </CardContent>
      </Card>
    </div>
  );
}