import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Phone, MapPin, Navigation, PackageCheck, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SHIPMENT_STATUS_LABELS } from '@/lib/logistics';
import { formatUSD } from '@/lib/format';
import CourierProofForm from './CourierProofForm';

const TERMINAL = ['DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'];

const NEXT_STEP = {
  PENDING: { status: 'PICKED_UP', labelKey: 'takeCharge' },
  CONFIRMED: { status: 'PICKED_UP', labelKey: 'takeCharge' },
  PROCESSING: { status: 'PICKED_UP', labelKey: 'takeCharge' },
  READY_FOR_PICKUP: { status: 'PICKED_UP', labelKey: 'takeCharge' },
  PICKED_UP: { status: 'IN_TRANSIT', labelKey: 'startTransit' },
  IN_TRANSIT: { status: 'OUT_FOR_DELIVERY', labelKey: 'outForDelivery' },
};

export default function CourierJobCard({ shipment, fulfillment, order, busy, onRespond, onAdvance, showFleet }) {
  const { t } = useTranslation();
  const [proofOpen, setProofOpen] = useState(false);

  const accepted = shipment.courier_response === 'accepted';
  const declined = shipment.courier_response === 'declined';
  const terminal = TERMINAL.includes(shipment.status);
  const next = NEXT_STEP[shipment.status];
  const disabled = busy === shipment.id;

  const viewProof = async () => {
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: shipment.proof_of_delivery,
      expires_in: 300,
    });
    window.open(signed_url, '_blank', 'noopener');
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold">{shipment.order_number}</p>
          <p className="text-[11px] text-muted-foreground">
            {shipment.tracking_number || t('courierJobCard.noTracking')} · {t('courierJobCard.tripPay', { amount: formatUSD(fulfillment?.shipping_usd || 0) })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showFleet && fulfillment?.courier_name && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold">
              {fulfillment.courier_name}
            </span>
          )}
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold">
            {t(SHIPMENT_STATUS_LABELS[shipment.status] || 'status.UNKNOWN')}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          {[order?.address, order?.city].filter(Boolean).join(', ') || t('courierJobCard.noAddress')}
        </p>
        {order?.customer_name && <p className="text-foreground">{t('courierJobCard.customer', { name: order.customer_name })}</p>}
      </div>

      {order?.customer_phone && (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`tel:${order.customer_phone}`}
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold"
          >
            <Phone className="h-3.5 w-3.5" /> {t('courierJobCard.call')}
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              [order.address, order.city].filter(Boolean).join(', '),
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold"
          >
            <Navigation className="h-3.5 w-3.5" /> {t('courierJobCard.route')}
          </a>
        </div>
      )}

      {!terminal && !accepted && !declined && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRespond(shipment, true)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {disabled ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackageCheck className="h-3.5 w-3.5" />}
            {t('courierJobCard.accept')}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRespond(shipment, false)}
            className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-60"
          >
            <XCircle className="h-3.5 w-3.5" /> {t('courierJobCard.decline')}
          </button>
        </div>
      )}

      {!terminal && accepted && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {next && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAdvance(shipment, next.status, t(`courierJobCard.${next.labelKey}`))}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                {t(`courierJobCard.${next.labelKey}`)}
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setProofOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-60"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {t('courierJobCard.confirmDelivery')}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAdvance(shipment, 'FAILED', t('courierJobCard.failLabel'))}
              className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-destructive disabled:opacity-60"
            >
              <XCircle className="h-3.5 w-3.5" /> {t('courierJobCard.fail')}
            </button>
          </div>

          {proofOpen && (
            <CourierProofForm
              order={order}
              shipment={shipment}
              busy={disabled}
              onConfirm={async (extra) => {
                const saved = await onAdvance(shipment, 'DELIVERED', t('courierJobCard.deliveredTo', { name: extra.delivered_to || t('courierJobCard.clientFallback') }), extra);
                if (saved) setProofOpen(false);
              }}
            />
          )}
        </div>
      )}

      {shipment.status === 'DELIVERED' && (
        <div className="mt-3 space-y-1.5 rounded-xl bg-secondary p-3 text-[11px]">
          <p className="font-semibold text-foreground">
            {t('courierJobCard.deliveredTitle', { suffix: shipment.delivered_to ? t('courierJobCard.deliveredToSuffix', { name: shipment.delivered_to }) : '' })}
          </p>
          {shipment.proof_of_delivery && (
            <button type="button" onClick={viewProof} className="font-semibold text-primary">
              {t('courierJobCard.viewProof')}
            </button>
          )}
        </div>
      )}

      {shipment.events?.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-border pt-3">
          {shipment.events.slice(-3).reverse().map((e, i) => (
            <p key={`${e.at}-${i}`} className="text-[11px] text-muted-foreground">
              {e.label}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}