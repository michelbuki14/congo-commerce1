import React from 'react';
import { Minus, Plus } from 'lucide-react';

export default function QuantityStepper({ value, onChange, min = 1, max = 99, size = 'md' }) {
  const btn = 'min-h-11 min-w-11';
  return (
    <div className="inline-flex items-center rounded-full border border-border/60 bg-card/90 backdrop-blur-sm" role="group" aria-label="Quantité">
      <button
        type="button"
        aria-label="Diminuer la quantité"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`${btn} flex items-center justify-center rounded-l-full disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-75 ease-out active:scale-90`}
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className={`min-w-8 px-2 text-center font-semibold tabular-nums ${size === 'sm' ? 'text-xs' : 'text-sm'}`} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Augmenter la quantité"
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`${btn} flex items-center justify-center rounded-r-full disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-75 ease-out active:scale-90`}
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}