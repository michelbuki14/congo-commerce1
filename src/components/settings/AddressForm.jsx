import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const EMPTY = { label: '', type: 'home', city: '', address: '', phone: '', pickup_point_name: '' };

export default function AddressForm({ pickupPoints, onAdd }) {
  const [f, setF] = useState(EMPTY);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.label && (f.type === 'home' ? f.city && f.address : f.pickup_point_name);

  return (
    <form
      className="grid gap-2 md:grid-cols-2"
      onSubmit={(e) => { e.preventDefault(); onAdd({ ...f, id: Date.now().toString() }); setF(EMPTY); }}
    >
      <Input placeholder="Nom (ex : Maison, Bureau)" value={f.label} onChange={set('label')} />
      <select value={f.type} onChange={set('type')} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
        <option value="home">Livraison à domicile</option>
        <option value="pickup">Point de retrait</option>
      </select>
      {f.type === 'home' ? (
        <>
          <Input placeholder="Ville" value={f.city} onChange={set('city')} />
          <Input placeholder="Adresse, quartier, repère" value={f.address} onChange={set('address')} />
        </>
      ) : (
        <select value={f.pickup_point_name} onChange={set('pickup_point_name')} className="h-9 rounded-md border border-input bg-card px-3 text-sm md:col-span-2">
          <option value="">Choisir un point de retrait</option>
          {pickupPoints.map((p) => <option key={p.id} value={p.name}>{p.name}{p.city ? ` · ${p.city}` : ''}</option>)}
        </select>
      )}
      <Input placeholder="Téléphone (facultatif)" value={f.phone} onChange={set('phone')} />
      <Button type="submit" disabled={!valid}>Ajouter l'adresse</Button>
    </form>
  );
}