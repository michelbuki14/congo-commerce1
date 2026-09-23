import React from 'react';
import { useCurrency } from '@/lib/currency';

export default function CurrencyToggle({ className = '' }) {
  const { currency, setCurrency } = useCurrency();
  return (
    <div className={`inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-semibold ${className}`}>
      {['USD', 'CDF'].map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCurrency(c)}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            currency === c ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}