import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PlanCard from '@/components/saas/PlanCard';
import TenantForm from '@/components/saas/TenantForm';
import { DEFAULT_PLANS, loadPlans, planByCode } from '@/lib/plans';
import { BILLING_CYCLES, startSubscription } from '@/lib/saas';
import { writeActiveTenantId } from '@/lib/tenancy';

export default function TenantOnboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [planCode, setPlanCode] = useState(params.get('plan') || 'GROWTH');
  const [cycle, setCycle] = useState(params.get('cycle') || 'monthly');
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    loadPlans().then(setPlans);
    base44.auth.me().then(setMe).catch(() => setMe(null));
  }, []);

  const plan = planByCode(plans, planCode);

  const create = async (form) => {
    setBusy(true);
    setError('');
    try {
      const tenant = await base44.entities.Tenant.create({
        ...form,
        owner_email: form.owner_email || me?.email || '',
        status: 'trial',
        plan_code: plan.code,
        subdomain: form.slug,
      });
      await startSubscription({ tenant, plan, cycle, me });
      await base44.entities.TenantDomain.create({
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        owner_email: tenant.owner_email,
        hostname: `${tenant.slug}.congocommerce.app`,
        type: 'subdomain',
        status: 'verified',
        ssl_status: 'active',
        is_primary: true,
      });
      await base44.entities.TenantMember.create({
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        owner_email: tenant.owner_email,
        email: tenant.owner_email,
        full_name: form.owner_name || tenant.name,
        role: 'TENANT_ADMIN',
        permissions: ['PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE', 'ORDER_READ', 'ORDER_UPDATE', 'REFUND_CREATE', 'SELLER_APPROVE', 'SELLER_SUSPEND', 'FINANCE_READ', 'PAYOUT_APPROVE', 'SUPPLIER_MANAGE', 'ANALYTICS_READ', 'DOMAIN_MANAGE', 'TEAM_MANAGE'],
        status: 'active',
        invited_by: tenant.owner_email,
      });
      writeActiveTenantId(tenant.id);
      setDone(tenant);
    } catch (e) {
      setError(e?.message || t('tenantOnboarding.createFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-3 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="font-heading text-xl font-bold">{t('tenantOnboarding.doneTitle', { name: done.name })}</h1>
          <p className="text-sm text-muted-foreground">
            {t('tenantOnboarding.doneDesc', { plan: plan.name })}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate('/tenant')}>{t('tenantOnboarding.openConsole')}</Button>
            <Button variant="outline" onClick={() => navigate('/seller-portal')}>{t('tenantOnboarding.manageProducts')}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 py-2">
      <div>
        <h1 className="font-heading text-2xl font-bold">{t('tenantOnboarding.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('tenantOnboarding.subtitle')}
        </p>
      </div>

      <div className="inline-flex rounded-full border border-border bg-card p-1">
        {BILLING_CYCLES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCycle(c.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${cycle === c.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <PlanCard key={p.code} plan={p} cycle={cycle} current={plan.code} onSelect={() => setPlanCode(p.code)} />
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-heading text-base font-bold">{t('tenantOnboarding.infoTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('tenantOnboarding.chosenPlan')} <span className="font-semibold text-foreground">{plan.name}</span> ({cycle === 'yearly' ? t('tenantOnboarding.yearly') : t('tenantOnboarding.monthly')}).
            </p>
          </div>
          <TenantForm
            initial={{ owner_email: me?.email || '', owner_name: me?.full_name || '' }}
            onSubmit={create}
            submitting={busy}
            submitLabel={t('tenantOnboarding.startTrial', { plan: plan.name })}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}