import React from 'react';
import { formatUSD } from '@/lib/format';

const ROWS = [
  { key: 'supplierPrice', label: 'Prix fournisseur' },
  { key: 'intlShipping', label: 'Transport international' },
  { key: 'importCosts', label: "Frais d'importation estimés" },
  { key: 'logistics', label: 'Logistique locale' },
  { key: 'margin', label: 'Marge plateforme' },
  { key: 'fees', label: 'Frais de paiement' },
];

export default function PriceBreakdown({ breakdown }) {
  if (!breakdown) return null;
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Composition du prix (transparente)
      </p>
      <div className="space-y-1 text-xs">
        {ROWS.filter((r) => Number(breakdown[r.key]) > 0).map((r) => (
          <div key={r.key} className="flex items-center justify-between">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-medium">{formatUSD(breakdown[r.key])}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 text-sm font-bold">
          <span>Prix client</span>
          <span className="text-primary">{formatUSD(breakdown.total)}</span>
        </div>
      </div>
    </div>
  );
}