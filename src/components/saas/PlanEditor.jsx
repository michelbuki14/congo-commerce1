import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { PLAN_FEATURES } from '@/lib/plans';

/** Platform-admin plan editor: prices, limits and features live in the database. */
export default function PlanEditor({ plan, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    price_monthly_usd: plan.price_monthly_usd || 0,
    price_yearly_usd: plan.price_yearly_usd || 0,
    trial_days: plan.trial_days || 0,
    product_limit: plan.product_limit || 0,
    store_limit: plan.store_limit || 0,
    seller_limit: plan.seller_limit || 0,
    member_limit: plan.member_limit || 0,
    commission_rate: plan.commission_rate || 0,
    features: plan.features || [],
    active: plan.active !== false,
    highlighted: Boolean(plan.highlighted),
  });
  const [busy, setBusy] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleFeature = (key) => setForm((f) => ({
    ...f,
    features: f.features.includes(key) ? f.features.filter((k) => k !== key) : [...f.features, key],
  }));

  const save = async () => {
    setBusy(true);
    try {
      const payload = { ...form };
      ['price_monthly_usd', 'price_yearly_usd', 'trial_days', 'product_limit', 'store_limit', 'seller_limit', 'member_limit', 'commission_rate']
        .forEach((k) => { payload[k] = Number(payload[k]) || 0; });
      if (plan.id) await base44.entities.Plan.update(plan.id, payload);
      else await base44.entities.Plan.create({ code: plan.code, name: plan.name, description: plan.description, sort_order: plan.sort_order || 0, ...payload });
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-bold">{plan.name} <span className="font-mono text-xs text-muted-foreground">{plan.code}</span></h3>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> {t('planEditor.active')}
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs">{t('planEditor.monthlyPrice')}<Input type="number" min="0" step="1" value={form.price_monthly_usd} onChange={(e) => set('price_monthly_usd', e.target.value)} /></label>
          <label className="space-y-1 text-xs">{t('planEditor.yearlyPrice')}<Input type="number" min="0" step="1" value={form.price_yearly_usd} onChange={(e) => set('price_yearly_usd', e.target.value)} /></label>
          <label className="space-y-1 text-xs">{t('planEditor.trial')}<Input type="number" min="0" value={form.trial_days} onChange={(e) => set('trial_days', e.target.value)} /></label>
          <label className="space-y-1 text-xs">{t('planEditor.commission')}<Input type="number" min="0" step="0.5" value={form.commission_rate} onChange={(e) => set('commission_rate', e.target.value)} /></label>
          <label className="space-y-1 text-xs">{t('planEditor.products')}<Input type="number" min="0" value={form.product_limit} onChange={(e) => set('product_limit', e.target.value)} /></label>
          <label className="space-y-1 text-xs">{t('planEditor.stores')}<Input type="number" min="0" value={form.store_limit} onChange={(e) => set('store_limit', e.target.value)} /></label>
          <label className="space-y-1 text-xs">{t('planEditor.sellers')}<Input type="number" min="0" value={form.seller_limit} onChange={(e) => set('seller_limit', e.target.value)} /></label>
          <label className="space-y-1 text-xs">{t('planEditor.members')}<Input type="number" min="0" value={form.member_limit} onChange={(e) => set('member_limit', e.target.value)} /></label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PLAN_FEATURES.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => toggleFeature(f.key)}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${form.features.includes(f.key) ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Button size="sm" onClick={save} disabled={busy}>{busy ? t('planEditor.saving') : t('planEditor.save')}</Button>
      </CardContent>
    </Card>
  );
}