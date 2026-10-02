import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Trash2 } from 'lucide-react';
import { formatUSD } from '@/lib/format';

const NUMERIC_IDS = ['base_usd', 'per_kg_usd', 'surcharge_usd', 'max_weight_kg'];

const TYPE_KEYS = { city: 'typeCity', country: 'typeCountry', zone: 'typeZone' };

function groupRates(rates) {
  return rates.reduce((acc, rate) => {
    const key = `${rate.destination_type || 'city'}|${rate.destination || '—'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rate);
    return acc;
  }, {});
}

/** The rate table itself, grouped by destination. Values save on blur. */
export default memo(function RateTable({ rates = [], onPatch, onToggle, onDelete }) {
  const { t } = useTranslation();
  const NUMERIC = NUMERIC_IDS.map((field) => ({ field, label: t(`rateTable.num_${field}`) }));
  if (!rates.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
        {t('rateTable.empty')}
      </p>
    );
  }

  const groups = groupRates(rates);

  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([key, rows]) => {
        const [type, destination] = key.split('|');
        return (
          <section key={key} className="rounded-2xl border border-border bg-card p-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-bold">
                <MapPin className="h-4 w-4 text-primary" /> {destination}
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">{TYPE_KEYS[type] ? t(`rateTable.${TYPE_KEYS[type]}`) : type}</span>
              </p>
              <span className="text-[11px] text-muted-foreground">{t('rateTable.rowCount', { count: rows.length })}</span>
            </header>
            <div className="mt-3 space-y-3">
              {rows.map((rate) => (
                <div key={rate.id} className={`rounded-xl border p-3 ${rate.active === false ? 'border-dashed border-border opacity-60' : 'border-border'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold">
                      {rate.courier_name || t('rateTable.carrierFallback')}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {Number(rate.min_weight_kg) || 0}–{Number(rate.max_weight_kg) || 0} kg
                        {Number(rate.max_dimension_cm) > 0 ? t('rateTable.sideLimit', { cm: rate.max_dimension_cm }) : ''}
                      </span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggle(rate)}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          rate.active === false ? 'bg-secondary text-muted-foreground' : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {rate.active === false ? t('rateTable.inactive') : t('rateTable.active')}
                      </button>
                      <button type="button" onClick={() => onDelete(rate)} className="rounded-lg p-2 text-destructive hover:bg-secondary" aria-label={t('rateTable.deleteAria')}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-5">
                    {NUMERIC.map((f) => (
                      <label key={f.field} className="text-[11px] text-muted-foreground">
                        {f.label}
                        <input
                          type="number"
                          step="0.1"
                          defaultValue={rate[f.field] ?? 0}
                          onBlur={(e) => onPatch(rate, f.field, e.target.value)}
                          className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                        />
                      </label>
                    ))}
                    <label className="text-[11px] text-muted-foreground">
                      {t('rateTable.etaLabel')}
                      <input
                        defaultValue={rate.eta_days || ''}
                        onBlur={(e) => onPatch(rate, 'eta_days', e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t('rateTable.cost1kg', { amount: formatUSD((Number(rate.base_usd) || 0) + (Number(rate.per_kg_usd) || 0)) })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
});