import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const EMPTY = { name: '', city: 'Kinshasa', commune: '', address: '', phone: '', hours: '08:00 - 18:00', fee_usd: 0.5 };

export default function PickupPointForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...f, fee_usd: Number(f.fee_usd) || 0 });
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-2xl border border-border bg-card p-4 md:grid-cols-3">
      <Input required placeholder="Nom du point" value={f.name} onChange={set('name')} />
      <Input required placeholder="Ville" value={f.city} onChange={set('city')} />
      <Input placeholder="Commune" value={f.commune} onChange={set('commune')} />
      <Input placeholder="Adresse" value={f.address} onChange={set('address')} className="md:col-span-2" />
      <Input placeholder="Téléphone" value={f.phone} onChange={set('phone')} />
      <Input placeholder="Horaires" value={f.hours} onChange={set('hours')} />
      <Input type="number" step="0.1" min="0" placeholder="Frais (USD)" value={f.fee_usd} onChange={set('fee_usd')} />
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  );
}