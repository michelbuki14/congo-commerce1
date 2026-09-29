import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plane } from 'lucide-react';
import { formatUSD, round2 } from '@/lib/format';
import { INTL_CARRIER, intlFee } from '@/lib/intlDelivery';

/**
 * What the international leg actually costs: every CCX service level priced
 * for this order's billed weight, with the base fee and the per-kilo rate
 * spelled out. Display only — the fee charged is recomputed server-side from
 * the option id, so the browser never sets its own freight price.
 */
export default function IntlShippingBreakdown({ options, weightKg, selectedId }) {
  const { t } = useTranslation();
  if (!options?.length) return null;

  const rows = options.map((o) => ({
    id: o.id,
    label: o.label,
    eta: o.eta_days,
    base: Number(o.base_usd) || 0,
    perKg: Number(o.per_kg_usd) || 0,
    total: intlFee(o, weightKg),
  }));
  const cheapest = Math.min(...rows.map((r) => r.total));
  const selected = rows.find((r) => r.id === selectedId) || rows[0];
  const extra = round2(selected.total - cheapest);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <h4 className="flex items-center gap-2 text-xs font-bold">
        <Plane className="h-3.5 w-3.5 text-primary" /> {t('intlDelivery.breakdownTitle')}
      </h4>
      <p className="text-[11px] text-muted-foreground">
        {INTL_CARRIER.name} ({INTL_CARRIER.code}) · {t('intlDelivery.breakdownWeight', { weight: weightKg })}
      </p>

      <div className="space-y-1.5">
        {rows.map((r) => {
          const isSelected = r.id === selected.id;
          return (
            <div
              key={r.id}
              className={`rounded-lg border p-2.5 ${
                isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold">{r.label}</span>
                <span className="text-xs font-bold tabular-nums">{formatUSD(r.total)}</span>
              </div>
              <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                {t('intlDelivery.breakdownFormula', {
                  base: formatUSD(r.base),
                  perKg: formatUSD(r.perKg),
                  weight: weightKg,
                })}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">{r.eta}</span>
                {isSelected && (
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {t('intlDelivery.breakdownSelected')}
                  </span>
                )}
                {r.total === cheapest && (
                  <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {t('intlDelivery.breakdownCheapest')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {extra > 0 && (
        <p className="text-[11px] font-medium text-muted-foreground">
          {t('intlDelivery.breakdownExtra', { amount: formatUSD(extra) })}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">{t('intlDelivery.breakdownNote')}</p>
    </div>
  );
}