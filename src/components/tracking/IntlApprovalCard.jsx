import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Warehouse, CheckCircle2, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime } from '@/lib/format';

/**
 * Customer side of the international route: the goods are already in our
 * warehouse abroad and the picture taken there is shown here. Only the
 * customer's approval releases the shipment to its destination.
 */
export default function IntlApprovalCard({ fulfillment, order, phone, onConfirmed }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const awaiting = fulfillment.status === 'AWAITING_CUSTOMER_APPROVAL';
  const approved = !!fulfillment.customer_approved_at;
  const photo = fulfillment.origin_photo_signed_url;

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await base44.functions.invoke('customerAccount', {
        action: 'confirm_fulfillment',
        order_number: order.order_number,
        fulfillment_id: fulfillment.id,
        phone,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      onConfirmed?.(res.data.fulfillment);
    } catch (e) {
      setError(e?.data?.error || e?.message || t('intlApproval.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Warehouse className="h-4 w-4 text-primary" /> {t('intlApproval.statusLabel')}
          </p>
          <p className="text-[11px] text-muted-foreground">{fulfillment.fulfillment_number}</p>
        </div>
        <StatusBadge status={fulfillment.status} />
      </div>

      {photo ? (
        <Image
          src={photo}
          alt={t('intlApproval.title')}
          className="h-52 w-full rounded-xl border border-border"
          fittingType="fit"
        />
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {t('intlApproval.preparing')}
        </p>
      )}

      {awaiting && (
        <>
          <div>
            <p className="text-sm font-semibold">{t('intlApproval.title')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('intlApproval.helper', {
                warehouse: fulfillment.origin_warehouse || '—',
                destination: order.city || '—',
              })}
            </p>
          </div>
          {fulfillment.origin_received_at && (
            <p className="text-[11px] text-muted-foreground">
              {t('intlApproval.receivedAt', { date: formatDateTime(fulfillment.origin_received_at) })}
            </p>
          )}
          {error && <p className="text-[11px] text-destructive">{error}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={confirm}
            className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? t('intlApproval.confirming') : t('intlApproval.confirm')}
          </button>
        </>
      )}

      {!awaiting && approved && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> {t('intlApproval.approved')}
        </p>
      )}
    </section>
  );
}