import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PackageCheck, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { INTL_CARRIER } from '@/lib/intlDelivery';

/**
 * Packing bench for international imports.
 *
 * The customer has approved the photo taken at the origin warehouse; the goods
 * are now packed here and only then handed to our own delivery team, which
 * carries the parcel to its destination. Packing is the hand-over point.
 */
export default function IntlPackingPanel() {
  const { t } = useTranslation();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState({});

  const load = async () => {
    const list = await base44.entities.FulfillmentOrder
      .filter({ source_type: 'international_supplier' }, '-created_date', 200)
      .catch(() => []);
    setRows(list.filter((f) => f.status === 'PACKING'));
  };

  useEffect(() => { load(); }, []);

  const handOver = async (f) => {
    setErrors((prev) => ({ ...prev, [f.id]: '' }));
    setBusy(f.id);
    try {
      const res = await base44.functions.invoke('fulfillmentAction', {
        action: 'advance',
        fulfillment_id: f.id,
        status: 'IN_TRANSIT',
      });
      if (res?.data?.error) throw new Error(res.data.error);
      setRows((prev) => prev.filter((x) => x.id !== f.id));
      toast({ title: t('intlPacking.sent') });
    } catch (e) {
      setErrors((prev) => ({ ...prev, [f.id]: e?.data?.error || e?.message || t('intlPacking.failed') }));
    } finally {
      setBusy('');
    }
  };

  if (!rows) return <p className="text-sm text-muted-foreground">{t('intlPacking.loading')}</p>;
  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t('intlPacking.empty')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t('intlPacking.helper')}</p>
      {rows.map((f) => (
        <div key={f.id} className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold">{f.fulfillment_number}</p>
              <p className="text-xs text-muted-foreground">
                {f.order_number} · {t('intlPacking.itemsCount', { count: (f.items || []).length })}
              </p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold">{f.status}</span>
          </div>

          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {(f.items || []).map((i, k) => (
              <li key={k} className="flex items-center gap-1.5">
                <Package className="h-3 w-3 shrink-0" /> {i.quantity} × {i.title}
              </li>
            ))}
          </ul>

          <p className="rounded-xl bg-secondary/50 px-3 py-2 text-[11px]">
            <span className="font-semibold">{t('intlPacking.service')} : </span>
            {INTL_CARRIER.name}
            {f.intl_delivery_label ? ` · ${f.intl_delivery_label}` : ''}
            {f.estimated_delivery ? ` · ${f.estimated_delivery}` : ''}
          </p>

          {errors[f.id] && <p className="text-[11px] text-destructive">{errors[f.id]}</p>}

          <button
            type="button"
            disabled={busy === f.id}
            onClick={() => handOver(f)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <PackageCheck className="h-3.5 w-3.5" />
            {busy === f.id ? t('intlPacking.sending') : t('intlPacking.submit')}
          </button>
        </div>
      ))}
    </div>
  );
}