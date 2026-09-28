import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/** Staff enters the customer's pickup code to release the parcel. */
export default function PickupHandover({ order, onRelease }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const release = async () => {
    if (code.trim().toUpperCase() !== String(order.pickup_code || '').toUpperCase()) {
      setError(t('pickupHandover.badCode'));
      return;
    }
    setBusy(true);
    await onRelease(order);
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm">
      <div>
        <p className="font-semibold">{order.order_number} · {order.customer_name}</p>
        <p className="text-xs text-muted-foreground">{order.pickup_point_name} · {order.status} · {order.payment_status}</p>
      </div>
      <div className="flex items-center gap-2">
        <Input value={code} onChange={(e) => { setCode(e.target.value); setError(''); }} placeholder={t('pickupHandover.codePh')} className="h-9 w-32" />
        <Button size="sm" onClick={release} disabled={busy || !code}>{t('pickupHandover.release')}</Button>
      </div>
      {error && <p className="w-full text-xs text-destructive">{error}</p>}
    </div>
  );
}