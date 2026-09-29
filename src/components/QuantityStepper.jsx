import React from 'react';
import { Minus, Plus } from 'lucide-react';

export default function QuantityStepper({ value, onChange, min = 1, max = 99, size = 'md' }) {
  const btn = 'h-11 w-11';
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card">
      <button
        type="button"
        aria-label="Diminuer"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`${btn} flex items-center justify-center rounded-l-full disabled:opacity-40`}
        disabled={value <= min}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={`min-w-8 text-center font-semibold ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>{value}</span>
      <button
        type="button"
        aria-label="Augmenter"
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`${btn} flex items-center justify-center rounded-r-full disabled:opacity-40`}
        disabled={value >= max}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}