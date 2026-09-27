import React, { useState } from 'react';
import { MapPin, Phone, Navigation, CheckCircle2, XCircle } from 'lucide-react';
import { SHIPMENT_STATUS_LABELS } from '@/lib/logistics';
import { formatUSD } from '@/lib/format';
import CourierProofForm from './CourierProofForm';

const STEPS = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const NEXT_STEP = {
  PENDING: { status: 'PICKED_UP', label: 'Prendre en charge' },
  CONFIRMED: { status: 'PICKED_UP', label: 'Prendre en charge' },
  PROCESSING: { status: 'PICKED_UP', label: 'Prendre en charge' },
  READY_FOR_PICKUP: { status: 'PICKED_UP', label: 'Prendre en charge' },
  PICKED_UP: { status: 'IN_TRANSIT', label: 'Démarrer le transit' },
  IN_TRANSIT: { status: 'OUT_FOR_DELIVERY', label: 'Passer en livraison' },
};

export default function CourierTrackingCard({ shipment, fulfillment, order, busy, showFleet, onAdvance }) {
  const [proofOpen, setProofOpen] = useState(false);
  const disabled = busy === shipment.id;
  const next = NEXT_STEP[shipment.status];
  const reached = STEPS.indexOf(shipment.status);
  const destination = [order?.address, order?.city].filter(Boolean).join(', ');

  const logDelivery = async (extra) => {
    const saved = await onAdvance(shipment, 'DELIVERED', `Livré à ${extra.delivered_to || 'client'}`, extra);
    if (saved) setProofOpen(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold">{shipment.order_number}</p>
          <p className="text-[11px] text-muted-foreground">
            {shipment.tracking_number || 'Sans numéro de suivi'} · {formatUSD(fulfillment?.shipping_usd || 0)} de course
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showFleet && fulfillment?.courier_name && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold">
              {fulfillment.courier_name}
            </span>
          )}
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold">
            {SHIPMENT_STATUS_LABELS[shipment.status] || shipment.status}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-1">
        {STEPS.map((step, i) => (
          <div key={step} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= reached ? 'bg-primary' : 'bg-secondary'}`} />
            <p className={`mt-1 text-[10px] leading-tight ${i <= reached ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              {SHIPMENT_STATUS_LABELS[step]}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          {destination || 'Adresse non renseignée'}
        </p>
        {order?.customer_name && <p className="text-foreground">Client : {order.customer_name}</p>}
      </div>

      {order?.customer_phone && (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`tel:${order.customer_phone}`}
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold"
          >
            <Phone className="h-3.5 w-3.5" /> Appeler
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold"
          >
            <Navigation className="h-3.5 w-3.5" /> Itinéraire
          </a>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {next && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAdvance(shipment, next.status, next.label)}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {next.label}
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setProofOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-60"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Confirmer la livraison
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAdvance(shipment, 'FAILED', 'Échec de livraison signalé')}
          className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-destructive disabled:opacity-60"
        >
          <XCircle className="h-3.5 w-3.5" /> Échec
        </button>
      </div>

      {proofOpen && (
        <div className="mt-3">
          <CourierProofForm order={order} shipment={shipment} busy={disabled} onConfirm={logDelivery} />
        </div>
      )}

      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <p className="text-[11px] font-semibold">Historique du suivi</p>
        {(shipment.events || []).length === 0 && (
          <p className="text-[11px] text-muted-foreground">Aucun mouvement enregistré pour le moment.</p>
        )}
        {(shipment.events || [])
          .slice()
          .reverse()
          .map((e, i) => (
            <div key={`${e.at}-${i}`} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-[11px] font-medium">{e.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {e.at ? new Date(e.at).toLocaleString('fr-FR') : ''}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}