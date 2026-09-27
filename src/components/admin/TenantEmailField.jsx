import React, { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Binds a partner account (shop, courier fleet, creator) to a login: the e-mail
 * saved here must match the address the partner signs in with. Saves itself a
 * moment after typing stops, so leaving the page never loses the binding.
 */
export default function TenantEmailField({ entity, record, onChange }) {
  const [value, setValue] = useState(record.email || '');
  const [status, setStatus] = useState('');

  const stored = String(record.email || '').trim().toLowerCase();
  const next = value.trim().toLowerCase();

  useEffect(() => {
    if (next === stored) return undefined;
    const timer = setTimeout(async () => {
      setStatus('saving');
      try {
        const updated = await base44.entities[entity].update(record.id, { email: next });
        onChange?.(updated);
        setStatus('saved');
        setTimeout(() => setStatus(''), 2000);
      } catch {
        setStatus('error');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [next, stored, entity, record.id]);

  return (
    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Mail className="h-3.5 w-3.5" />
      <input
        type="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e-mail de connexion du partenaire"
        className="h-9 w-56 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
      />
      {status === 'saving' && <span>Enregistrement…</span>}
      {status === 'saved' && <span className="font-semibold text-emerald-700">Enregistré</span>}
      {status === 'error' && <span className="font-semibold text-destructive">Échec</span>}
    </label>
  );
}