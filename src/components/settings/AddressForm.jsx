import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const EMPTY = { label: '', type: 'home', city: '', address: '', phone: '', pickup_point_name: '' };

export default function AddressForm({ pickupPoints, onAdd }) {
  const { t } = useTranslation();
  const [f, setF] = useState(EMPTY);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.label && (f.type === 'home' ? f.city && f.address : f.pickup_point_name);

  return (
    <form
      className="grid gap-2 md:grid-cols-2"
      onSubmit={(e) => { e.preventDefault(); onAdd({ ...f, id: Date.now().toString() }); setF(EMPTY); }}
    >
      <Input placeholder={t('addressForm.phLabel')} value={f.label} onChange={set('label')} />
      <select value={f.type} onChange={set('type')} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
        <option value="home">{t('addressForm.home')}</option>
        <option value="pickup">{t('addressForm.pickup')}</option>
      </select>
      {f.type === 'home' ? (
        <>
          <Input placeholder={t('addressForm.phCity')} value={f.city} onChange={set('city')} />
          <Input placeholder={t('addressForm.phAddress')} value={f.address} onChange={set('address')} />
        </>
      ) : (
        <select value={f.pickup_point_name} onChange={set('pickup_point_name')} className="h-9 rounded-md border border-input bg-card px-3 text-sm md:col-span-2">
          <option value="">{t('addressForm.choosePoint')}</option>
          {pickupPoints.map((p) => <option key={p.id} value={p.name}>{p.name}{p.city ? ` · ${p.city}` : ''}</option>)}
        </select>
      )}
      <Input placeholder={t('addressForm.phPhone')} value={f.phone} onChange={set('phone')} />
      <Button type="submit" disabled={!valid}>{t('addressForm.add')}</Button>
    </form>
  );
}