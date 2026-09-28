import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, Info } from 'lucide-react';
import { quoteShipping } from '@/lib/shippingRates';
import { formatUSD } from '@/lib/format';

/** Quotes a package against the rate table so admins see the effect of an edit. */
export default function QuoteSimulator({ rates = [], config, couriers = [], destinations = [] }) {
  const { t } = useTranslation();
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
    { key: 'freight', label: t('quoteSimulator.lineFreight'), value: quote.freight },
    { key: 'surcharge', label: t('quoteSimulator.lineSurcharge'), value: quote.rateSurcharge },
    { key: 'fuel', label: t('quoteSimulator.lineFuel'), value: quote.fuel },
    { key: 'regional', label: t('quoteSimulator.lineRegional'), value: quote.regional },
    { key: 'handling', label: t('quoteSimulator.lineHandling'), value: quote.handling },
    { key: 'cod', label: t('quoteSimulator.lineCod'), value: quote.cod },
  ].filter((l) => l.value > 0);

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Calculator className="h-4 w-4 text-primary" /> {t('quoteSimulator.title')}
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-[11px] text-muted-foreground">
          {t('quoteSimulator.destination')}
          <input value={form.destination} onChange={(e) => set({ destination: e.target.value })} list="quote-destinations" className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
          <datalist id="quote-destinations">
            {destinations.map((d) => <option key={d} value={d} />)}
          </datalist>
        </label>
        <label className="text-[11px] text-muted-foreground">
          {t('quoteSimulator.carrier')}
          <select value={form.courierId} onChange={(e) => set({ courierId: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="">{t('quoteSimulator.cheapest')}</option>
            {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-muted-foreground">
          {t('quoteSimulator.weight')}
          <input type="number" step="0.1" value={form.weightKg} onChange={(e) => set({ weightKg: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
        </label>
        {[
          { field: 'length', label: t('quoteSimulator.length') },
          { field: 'width', label: t('quoteSimulator.width') },
          { field: 'height', label: t('quoteSimulator.height') },
        ].map((f) => (
          <label key={f.field} className="text-[11px] text-muted-foreground">
            {f.label}
            <input type="number" value={form[f.field]} onChange={(e) => set({ [f.field]: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
          </label>
        ))}
        <label className="text-[11px] text-muted-foreground">
          {t('quoteSimulator.goodsValue')}
          <input type="number" value={form.goodsUsd} onChange={(e) => set({ goodsUsd: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="text-[11px] text-muted-foreground">
          {t('quoteSimulator.origin')}
          <select value={form.originCountry} onChange={(e) => set({ originCountry: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="CD">{t('quoteSimulator.originLocal')}</option>
            <option value="CN">{t('quoteSimulator.originImport')}</option>
          </select>
        </label>
        <label className="text-[11px] text-muted-foreground">
          {t('quoteSimulator.payment')}
          <select value={form.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="mobile_money">{t('quoteSimulator.payMomo')}</option>
            <option value="cash_on_delivery">{t('quoteSimulator.payCod')}</option>
          </select>
        </label>
      </div>

      <div className="rounded-xl bg-secondary/50 p-3 text-xs">
        <p className="font-semibold">
          {quote.matched
            ? quote.etaDays ? `${quote.rate.courier_name} · ${quote.etaDays}` : t('quoteSimulator.matchedNoEta', { courier: quote.rate.courier_name })
            : t('quoteSimulator.noMatch')}
        </p>
        <p className="mt-1 text-muted-foreground">
          {t('quoteSimulator.billable', { billable: quote.weight.billable, actual: quote.weight.actual, vol: quote.weight.volumetric ? t('quoteSimulator.volPart', { vol: quote.weight.volumetric }) : '' })}
        </p>
        <div className="mt-2 space-y-1">
          {lines.map((l) => (
            <div key={l.key} className="flex justify-between">
              <span className="text-muted-foreground">{l.label}</span>
              <span>{formatUSD(l.value)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-1 font-semibold">
            <span>{t('quoteSimulator.deliveryFees')}</span>
            <span>{formatUSD(quote.subtotal)}</span>
          </div>
          {quote.dutyCharged > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('quoteSimulator.dutyVat')}</span>
              <span>{formatUSD(quote.dutyCharged)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-sm font-bold">
            <span>{t('quoteSimulator.totalCharged')}</span>
            <span className="text-primary">{formatUSD(quote.total)}</span>
          </div>
        </div>
        {quote.freeShipping ? (
          <p className="mt-2 flex items-start gap-1.5 text-[11px]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('quoteSimulator.freeShipNote')}
          </p>
        ) : null}
        {quote.duty.international && quote.duty.included ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t('quoteSimulator.dutyIncludedNote', { amount: formatUSD(quote.duty.total) })}
          </p>
        ) : null}
      </div>
    </section>
  );
}