import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ContactForm({ user, onSaved }) {
  const [f, setF] = useState({ phone: user.phone || '', city: user.city || '', address: user.address || '' });
  const [state, setState] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState('saving');
    try {
      await base44.auth.updateMe(f);
      setState('saved');
      onSaved?.();
    } catch (err) {
      setState(err.message || 'Erreur');
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-2 md:grid-cols-2">
      <Input value={user.full_name || ''} disabled aria-label="Nom" />
      <Input value={user.email} disabled aria-label="E-mail" />
      <Input placeholder="Téléphone (ex : +243 …)" value={f.phone} onChange={set('phone')} />
      <Input placeholder="Ville" value={f.city} onChange={set('city')} />
      <Input className="md:col-span-2" placeholder="Adresse" value={f.address} onChange={set('address')} />
      <div className="flex items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={state === 'saving'}>{state === 'saving' ? 'Enregistrement…' : 'Enregistrer'}</Button>
        {state === 'saved' && <span className="text-xs text-emerald-700">Coordonnées mises à jour</span>}
        {state && !['saving', 'saved'].includes(state) && <span className="text-xs text-destructive">{state}</span>}
      </div>
    </form>
  );
}