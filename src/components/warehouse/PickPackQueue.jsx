import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { printShippingLabels } from '@/lib/shippingLabels';
import { formatDateTime } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

export default function PickPackQueue() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState(null);
  const [busy, setBusy] = useState('');

  const load = async () => {
    const list = await base44.entities.Order.filter({ status: { $in: ['CONFIRMED', 'PROCESSING'] } }, 'created_date', 200);
    setOrders(list.filter((o) => !o.archived));
  };
  useEffect(() => { load(); }, []);

  const advance = async (o) => {
    setBusy(o.id);
    const next = o.status === 'CONFIRMED' ? 'PROCESSING' : 'SHIPPED';
    await base44.entities.Order.update(o.id, { status: next });
    setOrders((prev) => (next === 'SHIPPED' ? prev.filter((x) => x.id !== o.id) : prev.map((x) => (x.id === o.id ? { ...x, status: next } : x))));
    setBusy('');
    if (next === 'SHIPPED') {
      try { await printShippingLabels([o]); } catch (err) { toast({ title: t('pickPackQueue.labelFailed'), description: err.message }); }
    }
  };

  if (!orders) return <p className="text-sm text-muted-foreground">{t('pickPackQueue.loading')}</p>;
  if (!orders.length) return <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t('pickPackQueue.empty')}</p>;
  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <div key={o.id} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold">{o.order_number} <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px]">{o.status === 'CONFIRMED' ? t('pickPackQueue.toPick') : t('pickPackQueue.toPack')}</span></p>
              <p className="text-xs text-muted-foreground">{o.customer_name} · {o.city} · {formatDateTime(o.created_date)}</p>
            </div>
            <button type="button" disabled={busy === o.id} onClick={() => advance(o)} className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              {o.status === 'CONFIRMED' ? t('pickPackQueue.pickDone') : t('pickPackQueue.packShip')}
            </button>
          </div>
          <ul className="mt-2 space-y-0.5 text-xs">
            {(o.items || []).map((i, k) => <li key={k}>• {i.quantity} × {i.title}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}