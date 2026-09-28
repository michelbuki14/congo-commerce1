import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatUSD } from '@/lib/format';

const ROW_KEYS = ['supplierPrice', 'intlShipping', 'importCosts', 'logistics', 'margin', 'fees'];

export default function PriceBreakdown({ breakdown }) {
  const { t } = useTranslation();
  const ROWS = ROW_KEYS.map((key) => ({ key, label: t(`priceBreakdown.${key}`) }));
  if (!breakdown) return null;
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {t('priceBreakdown.title')}
      </p>
      <div className="space-y-1 text-xs">
        {ROWS.filter((r) => Number(breakdown[r.key]) > 0).map((r) => (
          <div key={r.key} className="flex items-center justify-between">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-medium">{formatUSD(breakdown[r.key])}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 text-sm font-bold">
          <span>{t('priceBreakdown.customerPrice')}</span>
          <span className="text-primary">{formatUSD(breakdown.total)}</span>
        </div>
      </div>
    </div>
  );
}