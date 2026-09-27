import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DRC_NETWORKS, validateMobileMoneyNumber } from '@/lib/mobileMoney';

export default function MobileMoneyForm({ onAdd }) {
  const [provider, setProvider] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [holder, setHolder] = useState('');
  const [error, setError] = useState('');
  const check = validateMobileMoneyNumber(provider, phone);

  const submit = async (e) => {
    e.preventDefault();
    if (!check.ok) { setError(check.error); return; }
    await onAdd({ provider, phone: check.phone, holder });
    setPhone(''); setHolder(''); setError('');
  };

  return (
    <form onSubmit={submit} className="grid gap-2 md:grid-cols-3">
      <select value={provider} onChange={(e) => setProvider(e.target.value)} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
        {DRC_NETWORKS.map((n) => <option key={n.providerId} value={n.providerId}>{n.name}</option>)}
      </select>
      <Input placeholder="081 234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
      <Input placeholder="Nom du titulaire" value={holder} onChange={(e) => setHolder(e.target.value)} />
      <p className="text-[11px] text-muted-foreground md:col-span-3">{error ? <span className="text-destructive">{error}</span> : check.hint}</p>
      <Button type="submit" className="md:col-span-3" disabled={!phone || !holder}>Ajouter ce compte</Button>
    </form>
  );
}