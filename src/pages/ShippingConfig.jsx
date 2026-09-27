import React, { useEffect, useState } from 'react';
import { Globe, Plus, Save, Trash2 } from 'lucide-react';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import StatCard from '@/components/ops/StatCard';
import { DEFAULT_SHIPPING_CONFIG, dutyEstimate, loadShippingConfig, saveShippingConfig } from '@/lib/shippingRates';
import { getCities, loadPlatformConfig } from '@/lib/config';
import { formatUSD } from '@/lib/format';

const GLOBAL_FIELDS = [
  { field: 'volumetric_divisor', label: 'Diviseur volumétrique', hint: 'L×l×H ÷ diviseur = poids facturable (5000 = standard)' },
  { field: 'handling_fee_usd', label: 'Manutention USD', hint: 'Frais de préparation par colis' },
  { field: 'cod_fee_usd', label: 'Paiement à la livraison USD', hint: 'Supplément encaissement à domicile' },
  { field: 'fuel_surcharge_percent', label: 'Surcharge carburant %', hint: 'Appliquée sur le transport' },
  { field: 'remote_area_surcharge_usd', label: 'Supplément zone éloignée USD', hint: "Quand aucune ligne tarifaire ne correspond" },
  { field: 'free_shipping_threshold_usd', label: 'Livraison offerte dès USD', hint: 'Panier minimum pour la gratuité' },
  { field: 'import_duty_percent', label: "Droits d'import %", hint: 'Sur la valeur marchandise importée' },
  { field: 'import_vat_percent', label: "TVA à l'import %", hint: 'Sur la valeur + droits' },
];

export default function ShippingConfig() {
  const [config, setConfig] = useState(DEFAULT_SHIPPING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState('');
  const [draft, setDraft] = useState({ destination: '', surcharge_usd: 0 });
  const [estimate, setEstimate] = useState({ goodsUsd: 50, originCountry: 'CN' });

  useEffect(() => {
    loadPlatformConfig();
    loadShippingConfig().then((cfg) => {
      setConfig(cfg);
      setLoading(false);
    });
  }, []);

  const set = (patch) => setConfig((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      await saveShippingConfig(config);
      setFlash('Configuration enregistrée.');
    } finally {
      setSaving(false);
    }
  };

  const addSurcharge = (event) => {
    event.preventDefault();
    if (!draft.destination.trim()) return;
    set({ regional_surcharges: [...(config.regional_surcharges || []), { ...draft, surcharge_usd: Number(draft.surcharge_usd) || 0 }] });
    setDraft({ destination: '', surcharge_usd: 0 });
  };

  const removeSurcharge = (index) => {
    set({ regional_surcharges: (config.regional_surcharges || []).filter((_, i) => i !== index) });
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  const duty = dutyEstimate({ goodsUsd: Number(estimate.goodsUsd) || 0, config, originCountry: estimate.originCountry });

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Configuration livraison" links={ADMIN_LINKS} />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Manutention" value={formatUSD(config.handling_fee_usd)} hint="par colis préparé" />
        <StatCard label="Carburant" value={`${config.fuel_surcharge_percent} %`} hint="sur le transport" />
        <StatCard label="Droits d'import" value={`${config.import_duty_percent} %`} hint={`TVA import ${config.import_vat_percent} %`} />
        <StatCard label="Zones surchargées" value={(config.regional_surcharges || []).length} hint="surcharges régionales" />
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Globe className="h-4 w-4 text-primary" /> Paramètres globaux
          </h2>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {GLOBAL_FIELDS.map((f) => (
            <label key={f.field} className="text-[11px] text-muted-foreground">
              {f.label}
              <input
                type="number"
                step="0.1"
                value={config[f.field] ?? 0}
                onChange={(e) => set({ [f.field]: Number(e.target.value) })}
                className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              />
              <span className="mt-0.5 block text-[10px]">{f.hint}</span>
            </label>
          ))}
        </div>
        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={config.duty_included_in_price !== false}
            onChange={(e) => set({ duty_included_in_price: e.target.checked })}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            Les droits d'import sont déjà compris dans le prix de vente affiché
            <span className="block text-[11px] text-muted-foreground">
              Décoché, les droits et la TVA à l'import sont ajoutés aux frais de livraison au lieu d'être absorbés par le prix.
            </span>
          </span>
        </label>
        {flash ? <p className="text-xs text-emerald-600">{flash}</p> : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Surcharges régionales</h2>
        <p className="text-[11px] text-muted-foreground">
          Ajoutez un supplément pour les destinations difficiles d'accès (pistes, zones frontalières, livraisons inter-villes).
        </p>
        <form onSubmit={addSurcharge} className="grid gap-3 md:grid-cols-3">
          <input
            value={draft.destination}
            onChange={(e) => setDraft({ ...draft, destination: e.target.value })}
            list="surcharge-destinations"
            placeholder="Ville ou zone (ex : Bunia)"
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <datalist id="surcharge-destinations">
            {getCities().map((c) => <option key={c} value={c} />)}
          </datalist>
          <input
            type="number"
            step="0.1"
            value={draft.surcharge_usd}
            onChange={(e) => setDraft({ ...draft, surcharge_usd: e.target.value })}
            placeholder="Supplément USD"
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <button type="submit" className="flex items-center justify-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
        </form>
        <div className="space-y-2">
          {(config.regional_surcharges || []).length ? (
            config.regional_surcharges.map((row, index) => (
              <div key={`${row.destination}-${index}`} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <p className="text-xs font-semibold">
                  {row.destination} <span className="font-normal text-muted-foreground">· +{formatUSD(row.surcharge_usd)}</span>
                </p>
                <button type="button" onClick={() => removeSurcharge(index)} className="rounded-lg p-2 text-destructive hover:bg-secondary" aria-label="Retirer la surcharge">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-muted-foreground">Aucune surcharge régionale pour l'instant.</p>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Pensez à enregistrer après modification de la liste.</p>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Estimation des droits d'import</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-[11px] text-muted-foreground">
            Valeur marchandise (USD)
            <input
              type="number"
              value={estimate.goodsUsd}
              onChange={(e) => setEstimate({ ...estimate, goodsUsd: e.target.value })}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="text-[11px] text-muted-foreground">
            Origine
            <select
              value={estimate.originCountry}
              onChange={(e) => setEstimate({ ...estimate, originCountry: e.target.value })}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="CN">Import (Chine, Dubaï…)</option>
              <option value="CD">RDC (local)</option>
            </select>
          </label>
        </div>
        <div className="space-y-1 rounded-xl bg-secondary/50 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valeur imposable</span>
            <span>{formatUSD(duty.dutiable)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Droits d'import ({config.import_duty_percent} %)</span>
            <span>{formatUSD(duty.duty)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">TVA à l'import ({config.import_vat_percent} %)</span>
            <span>{formatUSD(duty.importVat)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 text-sm font-bold">
            <span>Total droits & taxes</span>
            <span className="text-primary">{formatUSD(duty.total)}</span>
          </div>
          <p className="pt-1 text-[11px] text-muted-foreground">
            {duty.international
              ? duty.included
                ? 'Ces montants sont déjà compris dans le prix de vente affiché.'
                : "Ces montants s'ajoutent aux frais de livraison."
              : 'Marchandise locale : aucun droit d’import.'}
          </p>
        </div>
      </section>
    </div>
  );
}