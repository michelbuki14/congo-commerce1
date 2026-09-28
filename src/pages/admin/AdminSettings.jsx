import React, { useEffect, useState } from 'react';
import { Save, Globe, Coins, Settings2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { DEFAULT_PRICING_CONFIG, DEFAULT_COUNTRY_CONFIG, loadPlatformConfig } from '@/lib/config';
import { useTranslation } from 'react-i18next';

const PRICING_KEYS = ['platform_margin_percent', 'payment_fee_percent', 'seller_commission_percent', 'creator_commission_percent', 'import_cost_percent', 'international_shipping_usd', 'local_logistics_usd', 'free_shipping_threshold_usd'];

const COUNTRY_KEYS = [
  { key: 'code', type: 'text' },
  { key: 'name', type: 'text' },
  { key: 'default_currency', type: 'text' },
  { key: 'usd_to_cdf_rate', type: 'number' },
  { key: 'timezone', type: 'text' },
  { key: 'phone_prefix', type: 'text' },
];

export default function AdminSettings() {
  const { t } = useTranslation();
  const PRICING_FIELDS = PRICING_KEYS.map((key) => ({ key, label: t(`adminSettings.price_${key}`) }));
  const COUNTRY_FIELDS = COUNTRY_KEYS.map((f) => ({ ...f, label: t(`adminSettings.country_${f.key}`) }));
  const [pricing, setPricing] = useState(DEFAULT_PRICING_CONFIG);
  const [country, setCountry] = useState(DEFAULT_COUNTRY_CONFIG);
  const [recordIds, setRecordIds] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState('');
  const [cities, setCities] = useState((DEFAULT_COUNTRY_CONFIG.cities || []).join(', '));

  useEffect(() => {
    (async () => {
      const rows = await base44.entities.PlatformSetting.list().catch(() => []);
      const ids = {};
      rows.forEach((r) => {
        ids[r.key] = r.id;
        if (r.key === 'pricing') setPricing({ ...DEFAULT_PRICING_CONFIG, ...(r.value || {}) });
        if (r.key === 'country') {
          const merged = { ...DEFAULT_COUNTRY_CONFIG, ...(r.value || {}) };
          setCountry(merged);
          setCities((merged.cities || []).join(', '));
        }
      });
      setRecordIds(ids);
      setLoading(false);
    })();
  }, []);

  const persist = async (key, label, group, value) => {
    if (recordIds[key]) {
      await base44.entities.PlatformSetting.update(recordIds[key], { value, label, group });
    } else {
      const created = await base44.entities.PlatformSetting.create({ key, label, group, value });
      setRecordIds((prev) => ({ ...prev, [key]: created.id }));
    }
    await loadPlatformConfig(true);
  };

  const savePricing = async () => {
    await persist('pricing', 'Moteur de tarification', 'commerce', pricing);
    setSaved('pricing');
    setTimeout(() => setSaved(''), 2000);
  };

  const saveCountry = async () => {
    const value = { ...country, cities: cities.split(',').map((c) => c.trim()).filter(Boolean) };
    await persist('country', 'Configuration pays', 'general', value);
    setSaved('country');
    setTimeout(() => setSaved(''), 2000);
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('adminSettings.title')} links={ADMIN_LINKS} />

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Coins className="h-4 w-4 text-primary" /> {t('adminSettings.pricing')}
        </h2>
        <p className="text-[11px] text-muted-foreground">
          {t('adminSettings.pricingHint')}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {PRICING_FIELDS.map((f) => (
            <label key={f.key} className="text-[11px] text-muted-foreground">
              {f.label}
              <input
                type="number"
                step="0.1"
                value={pricing[f.key] ?? 0}
                onChange={(e) => setPricing({ ...pricing, [f.key]: Number(e.target.value) })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              />
            </label>
          ))}
        </div>
        <button type="button" onClick={savePricing} className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          <Save className="h-4 w-4" /> {saved === 'pricing' ? t('adminSettings.saved') : t('adminSettings.savePricing')}
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Globe className="h-4 w-4 text-primary" /> {t('adminSettings.country')}
        </h2>
        <p className="text-[11px] text-muted-foreground">
          {t('adminSettings.countryHint')}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {COUNTRY_FIELDS.map((f) => (
            <label key={f.key} className="text-[11px] text-muted-foreground">
              {f.label}
              <input
                type={f.type}
                value={country[f.key] ?? ''}
                onChange={(e) => setCountry({ ...country, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              />
            </label>
          ))}
        </div>
        <label className="block text-[11px] text-muted-foreground">
          {t('adminSettings.cities')}
          <textarea
            value={cities}
            onChange={(e) => setCities(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground"
          />
        </label>
        <button type="button" onClick={saveCountry} className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          <Save className="h-4 w-4" /> {saved === 'country' ? t('adminSettings.saved') : t('adminSettings.saveCountry')}
        </button>
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Settings2 className="h-4 w-4 text-primary" /> {t('adminSettings.arch')}
        </h2>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• {t('adminSettings.arch1')}</li>
          <li>• {t('adminSettings.arch2')}</li>
          <li>• {t('adminSettings.arch3')}</li>
          <li>• {t('adminSettings.arch4')}</li>
          <li>• {t('adminSettings.arch5')}</li>
        </ul>
      </section>
    </div>
  );
}