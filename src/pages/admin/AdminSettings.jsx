import React, { useEffect, useState } from 'react';
import { Save, Globe, Coins, Settings2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { DEFAULT_PRICING_CONFIG, DEFAULT_COUNTRY_CONFIG, loadPlatformConfig } from '@/lib/config';

const PRICING_FIELDS = [
  { key: 'platform_margin_percent', label: 'Marge plateforme (%)' },
  { key: 'payment_fee_percent', label: 'Frais de paiement (%)' },
  { key: 'seller_commission_percent', label: 'Commission vendeur (%)' },
  { key: 'creator_commission_percent', label: 'Commission créateur (%)' },
  { key: 'import_cost_percent', label: "Frais d'importation (%)" },
  { key: 'international_shipping_usd', label: 'Transport international (USD)' },
  { key: 'local_logistics_usd', label: 'Logistique locale (USD)' },
  { key: 'free_shipping_threshold_usd', label: 'Livraison offerte à partir de (USD)' },
];

const COUNTRY_FIELDS = [
  { key: 'code', label: 'Code pays', type: 'text' },
  { key: 'name', label: 'Nom du pays', type: 'text' },
  { key: 'default_currency', label: 'Devise par défaut', type: 'text' },
  { key: 'usd_to_cdf_rate', label: 'Taux USD → CDF', type: 'number' },
  { key: 'timezone', label: 'Fuseau horaire', type: 'text' },
  { key: 'phone_prefix', label: 'Indicatif téléphonique', type: 'text' },
];

export default function AdminSettings() {
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
      <DashboardNav title="Paramètres de la plateforme" links={ADMIN_LINKS} />

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Coins className="h-4 w-4 text-primary" /> Moteur de tarification
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Ces valeurs composent le prix client : coût fournisseur + transport + importation + logistique + marge + frais.
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
          <Save className="h-4 w-4" /> {saved === 'pricing' ? 'Enregistré' : 'Enregistrer la tarification'}
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Globe className="h-4 w-4 text-primary" /> Configuration pays
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Aucune règle pays n'est codée en dur : cette configuration pilote devises, taux, villes desservies et fuseau.
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
          Villes desservies (séparées par des virgules)
          <textarea
            value={cities}
            onChange={(e) => setCities(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground"
          />
        </label>
        <button type="button" onClick={saveCountry} className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          <Save className="h-4 w-4" /> {saved === 'country' ? 'Enregistré' : 'Enregistrer la configuration pays'}
        </button>
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Settings2 className="h-4 w-4 text-primary" /> Architecture & extensions
        </h2>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• Fournisseurs branchés via des adaptateurs normalisés (registre) — aucun code fournisseur dans le moteur de commande.</li>
          <li>• Moyens de paiement et transporteurs derrière des interfaces interchangeables.</li>
          <li>• Portefeuilles tenus en partie double : toute variation crée une écriture.</li>
          <li>• Synchronisation des stocks et prix par fournisseur, idempotente et journalisée.</li>
          <li>• Ajout d'un nouveau pays : dupliquer la configuration pays, aucun code à modifier.</li>
        </ul>
      </section>
    </div>
  );
}