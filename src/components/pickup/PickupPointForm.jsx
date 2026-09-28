import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const EMPTY = { name: '', city: 'Kinshasa', commune: '', address: '', phone: '', hours: '08:00 - 18:00', fee_usd: 0.5 };

export default function PickupPointForm({ initial, onSave, onCancel }) {
  const { t } = useTranslation();
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
      <Input required placeholder={t('pickupPointForm.phName')} value={f.name} onChange={set('name')} />
      <Input required placeholder={t('pickupPointForm.phCity')} value={f.city} onChange={set('city')} />
      <Input placeholder={t('pickupPointForm.phCommune')} value={f.commune} onChange={set('commune')} />
      <Input placeholder={t('pickupPointForm.phAddress')} value={f.address} onChange={set('address')} className="md:col-span-2" />
      <Input placeholder={t('pickupPointForm.phPhone')} value={f.phone} onChange={set('phone')} />
      <Input placeholder={t('pickupPointForm.phHours')} value={f.hours} onChange={set('hours')} />
      <Input type="number" step="0.1" min="0" placeholder={t('pickupPointForm.phFee')} value={f.fee_usd} onChange={set('fee_usd')} />
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? t('pickupPointForm.saving') : t('pickupPointForm.save')}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>{t('pickupPointForm.cancel')}</Button>
      </div>
    </form>
  );
}