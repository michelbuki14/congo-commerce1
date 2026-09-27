import React from 'react';
import { Switch } from '@/components/ui/switch';

export default function ToggleRow({ label, hint, checked, onChange, disabled }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2.5">
      <span>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={Boolean(checked)} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}