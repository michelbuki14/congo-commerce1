import React, { useEffect, useState } from 'react';
import { ShieldCheck, Save, Landmark, Smartphone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import DashboardNav from '@/components/DashboardNav';
import { formatDateTime } from '@/lib/format';

const LINKS = [
  { to: '/seller', label: 'Tableau de bord', end: true },
  { to: '/seller/products', label: 'Produits' },
  { to: '/seller/orders', label: 'Commandes' },
  { to: '/seller/wallet', label: 'Portefeuille' },
  { to: '/payout-history', label: 'Retraits' },
  { to: '/payout-settings', label: 'Paiement', end: true },
  { to: '/data-export', label: 'Export' },
];

const METHODS = [
  { id: 'mpesa', label: 'M-Pesa', kind: 'mobile_money', hint: 'Numéro M-Pesa (ex. +243 8…)' },
  { id: 'airtel', label: 'Airtel Money', kind: 'mobile_money', hint: 'Numéro Airtel Money' },
  { id: 'orange', label: 'Orange Money', kind: 'mobile_money', hint: 'Numéro Orange Money' },
  { id: 'bank', label: 'Virement bancaire', kind: 'bank', hint: 'Numéro de compte / IBAN' },
];

function mask(value) {
  const text = String(value || '');
  if (text.length <= 4) return text ? '••••' : '—';
  return `•••• ${text.slice(-4)}`;
}

export default function PayoutSettings() {
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [form, setForm] = useState({ payout_method: 'mpesa', payout_holder: '', payout_account: '', payout_bank_name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    if (loadingSeller) return;
    if (!seller) {
      setLoading(false);
      return;
    }
    setForm({
      payout_method: seller.payout_method || 'mpesa',
      payout_holder: seller.payout_holder || seller.owner_name || '',
      payout_account: seller.payout_account || '',
      payout_bank_name: seller.payout_bank_name || '',
    });
    setLoading(false);
  }, [seller, loadingSeller]);

  const method = METHODS.find((m) => m.id === form.payout_method) || METHODS[0];
  const current = saved || seller;

  const save = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!form.payout_holder.trim() || !form.payout_account.trim()) {
      setMessage('Indiquez le titulaire et le numéro de compte.');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Seller.update(seller.id, {
        ...form,
        payout_updated_at: new Date().toISOString(),
      });
      await base44.entities.AuditLog.create({
        action: 'seller.payout_details_updated',
        actor: 'seller',
        entity: 'Seller',
        entity_id: seller.id,
        reference: seller.name,
        severity: 'info',
        details: { method: form.payout_method },
      });
      setSaved({ ...form, payout_updated_at: new Date().toISOString() });
      setMessage('Coordonnées enregistrées. Elles seront utilisées pour vos prochains retraits.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingSeller || loading) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;

  if (!seller) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Landmark className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 font-semibold">Aucune boutique associée à votre compte</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Coordonnées de paiement" links={LINKS} />

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Ces coordonnées servent uniquement au versement de vos gains. Elles ne sont visibles que par vous et par l'équipe
          financière de la plateforme.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Coordonnées actuelles</h2>
        {current.payout_account ? (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">{METHODS.find((m) => m.id === current.payout_method)?.label || '—'}</span>
              {' · '}
              {mask(current.payout_account)}
            </p>
            <p>Titulaire : {current.payout_holder || '—'}</p>
            {current.payout_bank_name && <p>Banque : {current.payout_bank_name}</p>}
            <p>Dernière mise à jour : {formatDateTime(current.payout_updated_at)}</p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Aucune coordonnée enregistrée pour le moment.</p>
        )}
      </section>

      <form onSubmit={save} className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Smartphone className="h-4 w-4 text-primary" /> Méthode de versement
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
              {m.label}
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                {m.kind === 'bank' ? 'Compte bancaire' : 'Mobile money'}
              </span>
            </button>
          ))}
        </div>

        <label className="block text-[11px] font-semibold">
          Titulaire du compte
          <input
            value={form.payout_holder}
            onChange={(e) => setForm({ ...form, payout_holder: e.target.value })}
            placeholder="Nom complet"
            className="mt-0.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </label>

        <label className="block text-[11px] font-semibold">
          {method.kind === 'bank' ? 'Numéro de compte / IBAN' : 'Numéro de téléphone'}
          <input
            value={form.payout_account}
            onChange={(e) => setForm({ ...form, payout_account: e.target.value })}
            placeholder={method.hint}
            className="mt-0.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </label>

        {method.kind === 'bank' && (
          <label className="block text-[11px] font-semibold">
            Banque
            <input
              value={form.payout_bank_name}
              onChange={(e) => setForm({ ...form, payout_bank_name: e.target.value })}
              placeholder="Nom de la banque"
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
          <Save className="h-4 w-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <p className="text-[11px] text-muted-foreground">
          Les versements sont exécutés par l'équipe financière après validation de vos demandes de retrait.
        </p>
      </form>
    </div>
  );
}