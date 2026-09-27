import React, { useMemo, useState } from 'react';
import { Calculator, Info } from 'lucide-react';
import { quoteShipping } from '@/lib/shippingRates';
import { formatUSD } from '@/lib/format';

/** Quotes a package against the rate table so admins see the effect of an edit. */
export default function QuoteSimulator({ rates = [], config, couriers = [], destinations = [] }) {
  const [form, setForm] = useState({
    destination: destinations[0] || 'Kinshasa',
    courierId: '',
    weightKg: '1',
    length: '30',
    width: '20',
    height: '10',
    goodsUsd: '25',
    originCountry: 'CD',
    paymentMethod: 'mobile_money',
  });
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const quote = useMemo(
    () =>
      quoteShipping({
        rates,
        config,
        destination: form.destination,
        courierId: form.courierId,
        weightKg: Number(form.weightKg) || 0,
        dims: { length: Number(form.length) || 0, width: Number(form.width) || 0, height: Number(form.height) || 0 },
        goodsUsd: Number(form.goodsUsd) || 0,
        originCountry: form.originCountry,
        paymentMethod: form.paymentMethod,
      }),
    [rates, config, form],
  );

  const lines = [
    { label: 'Transport (prise en charge + kg)', value: quote.freight },
    { label: 'Supplément tarifaire', value: quote.rateSurcharge },
    { label: 'Carburant', value: quote.fuel },
    { label: 'Zone éloignée / régionale', value: quote.regional },
    { label: 'Manutention', value: quote.handling },
    { label: 'Paiement à la livraison', value: quote.cod },
  ].filter((l) => l.value > 0);

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Calculator className="h-4 w-4 text-primary" /> Simulateur de devis
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-[11px] text-muted-foreground">
          Destination
          <input value={form.destination} onChange={(e) => set({ destination: e.target.value })} list="quote-destinations" className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
          <datalist id="quote-destinations">
            {destinations.map((d) => <option key={d} value={d} />)}
          </datalist>
        </label>
        <label className="text-[11px] text-muted-foreground">
          Transporteur
          <select value={form.courierId} onChange={(e) => set({ courierId: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="">Le moins cher</option>
            {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-muted-foreground">
          Poids réel (kg)
          <input type="number" step="0.1" value={form.weightKg} onChange={(e) => set({ weightKg: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
        </label>
        {[
          { field: 'length', label: 'Longueur (cm)' },
          { field: 'width', label: 'Largeur (cm)' },
          { field: 'height', label: 'Hauteur (cm)' },
        ].map((f) => (
          <label key={f.field} className="text-[11px] text-muted-foreground">
            {f.label}
            <input type="number" value={form[f.field]} onChange={(e) => set({ [f.field]: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
          </label>
        ))}
        <label className="text-[11px] text-muted-foreground">
          Valeur marchandise (USD)
          <input type="number" value={form.goodsUsd} onChange={(e) => set({ goodsUsd: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="text-[11px] text-muted-foreground">
          Origine
          <select value={form.originCountry} onChange={(e) => set({ originCountry: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="CD">RDC (local)</option>
            <option value="CN">Import (Chine, Dubaï…)</option>
          </select>
        </label>
        <label className="text-[11px] text-muted-foreground">
          Paiement
          <select value={form.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="mobile_money">Mobile money / carte</option>
            <option value="cash_on_delivery">À la livraison</option>
          </select>
        </label>
      </div>

      <div className="rounded-xl bg-secondary/50 p-3 text-xs">
        <p className="font-semibold">
          {quote.matched
            ? `${quote.rate.courier_name} · ${quote.etaDays || 'délai non précisé'}`
            : 'Aucune ligne ne correspond — supplément zone éloignée appliqué'}
        </p>
        <p className="mt-1 text-muted-foreground">
          Poids facturable {quote.weight.billable} kg (réel {quote.weight.actual} kg
          {quote.weight.volumetric ? ` · volumétrique ${quote.weight.volumetric} kg` : ''})
        </p>
        <div className="mt-2 space-y-1">
          {lines.map((l) => (
            <div key={l.label} className="flex justify-between">
              <span className="text-muted-foreground">{l.label}</span>
              <span>{formatUSD(l.value)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-1 font-semibold">
            <span>Frais de livraison</span>
            <span>{formatUSD(quote.subtotal)}</span>
          </div>
          {quote.dutyCharged > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Droits d'import + TVA</span>
              <span>{formatUSD(quote.dutyCharged)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-sm font-bold">
            <span>Total facturé</span>
            <span className="text-primary">{formatUSD(quote.total)}</span>
          </div>
        </div>
        {quote.freeShipping ? (
          <p className="mt-2 flex items-start gap-1.5 text-[11px]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Panier au-dessus du seuil de livraison offerte — les frais peuvent être pris en charge.
          </p>
        ) : null}
        {quote.duty.international && quote.duty.included ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Droits d'import estimés {formatUSD(quote.duty.total)} — déjà inclus dans le prix de vente affiché, donc non refacturés.
          </p>
        ) : null}
      </div>
    </section>
  );
}