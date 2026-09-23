import React, { useEffect, useState } from 'react';
import { Save, Store, BadgeCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import DashboardNav from '@/components/DashboardNav';
import { getCities } from '@/lib/config';

const LINKS = [
  { to: '/seller', label: 'Tableau de bord', end: true },
  { to: '/seller/products', label: 'Produits' },
  { to: '/seller/orders', label: 'Commandes' },
  { to: '/seller/import', label: 'Import fournisseur' },
  { to: '/seller/wallet', label: 'Portefeuille' },
  { to: '/seller/settings', label: 'Boutique' },
];

export default function SellerSettings() {
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

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
    try {
      await base44.entities.Seller.update(seller.id, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loadingSeller || !form) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Ma boutique" links={LINKS} />

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Store className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            {seller.name}
            {seller.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Commission plateforme : {seller.commission_rate ?? 10}% · statut {seller.status}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Informations de la boutique</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nom de la boutique"
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
            placeholder="Téléphone"
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          placeholder="Présentation de la boutique"
          className="w-full rounded-lg border border-border bg-background p-3 text-sm"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            placeholder="URL du logo"
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={form.banner_url}
            onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
            placeholder="URL de la bannière"
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        <textarea
          value={form.delivery_info}
          onChange={(e) => setForm({ ...form, delivery_info: e.target.value })}
          rows={2}
          placeholder="Informations de livraison (délais, zones, frais)"
          className="w-full rounded-lg border border-border bg-background p-3 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saved ? 'Enregistré' : saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Vérification vendeur</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Le badge « vérifié » est attribué par l'équipe Congo Commerce après contrôle de la pièce d'identité et de l'adresse
          de l'entreprise. Statut actuel : {seller.verified ? 'vérifiée' : 'en attente de vérification'}.
        </p>
      </section>
    </div>
  );
}