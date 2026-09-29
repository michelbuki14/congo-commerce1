import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Save, Landmark, Smartphone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import DashboardNav from '@/components/DashboardNav';
import { formatDateTime } from '@/lib/format';

const LINKS = [
  { to: '/seller', key: 'sellerNav.dashboard', end: true },
  { to: '/seller/products', key: 'sellerNav.products' },
  { to: '/seller/orders', key: 'sellerNav.orders' },
  { to: '/seller/wallet', key: 'sellerNav.wallet' },
  { to: '/payout-history', key: 'sellerNav.payouts' },
  { to: '/payout-settings', key: 'sellerNav.payment', end: true },
  { to: '/data-export', key: 'sellerNav.export' },
];

const METHODS = [
  { id: 'mpesa', labelKey: 'pay.mpesaName', kind: 'mobile_money', hintKey: 'payout.mpesaHint' },
  { id: 'airtel', labelKey: 'pay.airtelName', kind: 'mobile_money', hintKey: 'payout.airtelHint' },
  { id: 'orange', labelKey: 'pay.orangeName', kind: 'mobile_money', hintKey: 'payout.orangeHint' },
  { id: 'bank', labelKey: 'payout.bankName', kind: 'bank', hintKey: 'payout.bankHint' },
];

function mask(value) {
  const text = String(value || '');
  if (text.length <= 4) return text ? '••••' : '—';
  return `•••• ${text.slice(-4)}`;
}

export default function PayoutSettings() {
  const { t } = useTranslation();
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [form, setForm] = useState({ payout_method: 'mpesa', payout_holder: '', payout_account: '', payout_bank_name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    if (loadingSeller) return;
    if (!seller) { setLoading(false); return; }
    let active = true;
    base44.functions.invoke('sellerPayout', { action: 'get', seller_id: seller.id })
      .then(({ data }) => {
        if (!active) return;
        const details = data.details;
        setSaved(details);
        setForm({ payout_method: details?.payout_method || 'mpesa', payout_holder: details?.payout_holder || seller.owner_name || '', payout_account: details?.payout_account || '', payout_bank_name: details?.payout_bank_name || '' });
      })
      .catch((error) => { if (active) setMessage(error.response?.data?.error || 'Coordonnées indisponibles.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [seller, loadingSeller]);

  const method = METHODS.find((m) => m.id === form.payout_method) || METHODS[0];
  const current = saved || {};

  const save = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!form.payout_holder.trim() || !form.payout_account.trim()) {
      setMessage(t('payout.needDetails'));
      return;
    }
    setSaving(true);
    try {
      const { data } = await base44.functions.invoke('sellerPayout', { action: 'save', seller_id: seller.id, ...form });
      setSaved(data.details);
      setMessage(t('payout.saved'));
    } catch (error) {
      setMessage(error.response?.data?.error || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingSeller || loading) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;

  if (!seller) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Landmark className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 font-semibold">{t('wallet.noShop')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('payout.settingsTitle')} links={LINKS} />

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          {t('payout.privacyNote')}
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t('payout.current')}</h2>
        {current.payout_account ? (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">{METHODS.find((m) => m.id === current.payout_method) ? t(METHODS.find((m) => m.id === current.payout_method).labelKey) : '—'}</span>
              {' · '}
              {mask(current.payout_account)}
            </p>
            <p>{t('payout.holder')} : {current.payout_holder || '—'}</p>
            {current.payout_bank_name && <p>{t('payout.bank')} : {current.payout_bank_name}</p>}
            <p>{t('payout.lastUpdate')} : {formatDateTime(current.payout_updated_at)}</p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{t('payout.none')}</p>
        )}
      </section>

      <form onSubmit={save} className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Smartphone className="h-4 w-4 text-primary" /> {t('payout.methodTitle')}
        </h2>

        <div className="grid gap-2 md:grid-cols-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setForm({ ...form, payout_method: m.id })}
              className={`rounded-xl border p-3 text-left text-sm font-semibold ${
                form.payout_method === m.id ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              {t(m.labelKey)}
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                {m.kind === 'bank' ? t('payout.bankAccount') : t('payout.mobileMoney')}
              </span>
            </button>
          ))}
        </div>

        <label className="block text-[11px] font-semibold">
          {t('payout.holder')}
          <input
            value={form.payout_holder}
            onChange={(e) => setForm({ ...form, payout_holder: e.target.value })}
            placeholder={t('checkout.fullName')}
            className="mt-0.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </label>

        <label className="block text-[11px] font-semibold">
          {method.kind === 'bank' ? t('payout.bankHint') : t('payout.phoneNumber')}
          <input
            value={form.payout_account}
            onChange={(e) => setForm({ ...form, payout_account: e.target.value })}
            placeholder={t(method.hintKey)}
            className="mt-0.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </label>

        {method.kind === 'bank' && (
          <label className="block text-[11px] font-semibold">
            {t('payout.bank')}
            <input
              value={form.payout_bank_name}
              onChange={(e) => setForm({ ...form, payout_bank_name: e.target.value })}
              placeholder={t('payout.bankNamePlaceholder')}
              className="mt-0.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
        )}

        {message && <p className="text-xs text-primary">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? t('payout.saving') : t('common.save')}
        </button>
        <p className="text-[11px] text-muted-foreground">
          {t('payout.financeNote')}
        </p>
      </form>
    </div>
  );
}