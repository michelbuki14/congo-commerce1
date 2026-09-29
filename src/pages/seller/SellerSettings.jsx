import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Store, BadgeCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import DashboardNav from '@/components/DashboardNav';
import { getCities } from '@/lib/config';



export default function SellerSettings() {
  const { t } = useTranslation();
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (seller) {
      setForm({
        name: seller.name || '',
        description: seller.description || '',
        city: seller.city || getCities()[0],
        phone: seller.phone || '',
        email: seller.email || '',
        logo_url: seller.logo_url || '',
        banner_url: seller.banner_url || '',
        delivery_info: seller.delivery_info || '',
      });
    }
  }, [seller]);

  const submit = async (e) => {
    e.preventDefault();
    if (!seller || !form) return;
    setSaving(true);
    setError('');
    try {
      const { name, description, city, phone, logo_url, banner_url, delivery_info } = form;
      await base44.functions.invoke('sellerProfile', { action: 'profile', seller_id: seller.id, profile: { name, description, city, phone, logo_url, banner_url, delivery_info } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingSeller || !form) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('sellerSettings.title')} links={[
        { to: '/seller', label: t('sellerSettings.navDashboard'), end: true },
        { to: '/seller/products', label: t('sellerSettings.navProducts') },
        { to: '/seller/orders', label: t('sellerSettings.navOrders') },
        { to: '/seller/import', label: t('sellerSettings.navImport') },
        { to: '/seller/wallet', label: t('sellerSettings.navWallet') },
        { to: '/seller/settings', label: t('sellerSettings.navShop') },
      ]} />

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Store className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            {seller.name}
            {seller.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t('sellerSettings.commissionLine', { rate: seller.commission_rate ?? 10, status: seller.status })}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t('sellerSettings.infoTitle')}</h2>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('sellerSettings.phName')}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <select
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          >
            {getCities().map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder={t('sellerSettings.phPhone')}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={form.email}
            readOnly
            title="Contactez un administrateur pour changer l'adresse de connexion"
            placeholder={t('sellerSettings.phEmail')}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          placeholder={t('sellerSettings.phDescription')}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            placeholder={t('sellerSettings.phLogo')}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={form.banner_url}
            onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
            placeholder={t('sellerSettings.phBanner')}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        <textarea
          value={form.delivery_info}
          onChange={(e) => setForm({ ...form, delivery_info: e.target.value })}
          rows={2}
          placeholder={t('sellerSettings.phDelivery')}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saved ? t('sellerSettings.saved') : saving ? t('sellerSettings.saving') : t('sellerSettings.save')}
        </button>
      </form>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t('sellerSettings.verifyTitle')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('sellerSettings.verifyDesc', { status: seller.verified ? t('sellerSettings.verified') : t('sellerSettings.pendingVerification') })}
        </p>
      </section>
    </div>
  );
}