import React from 'react';
import { Smartphone } from 'lucide-react';
import { validateMobileMoneyNumber } from '@/lib/mobileMoney';

/** Wallet number to debit, with the expected operator prefixes shown as a hint. */
export default function MobileMoneyField({ providerId, value, onChange, showError }) {
  const { ok, hint, error } = validateMobileMoneyNumber(providerId, value);
  const displayError = showError && !ok;

  return (
    <div className="space-y-1.5 border-t border-border pt-3">
      <label className="flex items-center gap-2 text-xs font-semibold">
        <Smartphone className="h-3.5 w-3.5 text-primary" /> Numéro à débiter
      </label>
      <input
        type="tel"
        inputMode="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="081 234 5678"
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
      />
      <p className={`text-[11px] ${displayError ? 'text-destructive' : 'text-muted-foreground'}`}>
        {displayError ? error : hint}
      </p>
    </div>
  );
}