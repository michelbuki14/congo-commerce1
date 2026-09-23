import React, { useState } from 'react';
import {
  Phone, MapPin, Navigation, PackageCheck, CheckCircle2, XCircle, Loader2, Image as ImageIcon,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SHIPMENT_STATUS_LABELS } from '@/lib/logistics';
import { formatUSD } from '@/lib/format';

const TERMINAL = ['DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'];

const NEXT_STEP = {
  PENDING: { status: 'PICKED_UP', label: 'Prendre en charge' },
  CONFIRMED: { status: 'PICKED_UP', label: 'Prendre en charge' },
  PROCESSING: { status: 'PICKED_UP', label: 'Prendre en charge' },
  READY_FOR_PICKUP: { status: 'PICKED_UP', label: 'Prendre en charge' },
  PICKED_UP: { status: 'IN_TRANSIT', label: 'Démarrer le transit' },
  IN_TRANSIT: { status: 'OUT_FOR_DELIVERY', label: 'Passer en livraison' },
};

export default function CourierJobCard({ shipment, fulfillment, order, busy, onRespond, onAdvance }) {
  const [proofOpen, setProofOpen] = useState(false);
  const [recipient, setRecipient] = useState(order?.customer_name || '');
  const [proofUri, setProofUri] = useState('');
  const [uploading, setUploading] = useState(false);

  const accepted = shipment.courier_response === 'accepted';
  const declined = shipment.courier_response === 'declined';
  const terminal = TERMINAL.includes(shipment.status);
  const next = NEXT_STEP[shipment.status];
  const disabled = busy === shipment.id;

  const uploadProof = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPrivateFile({ file });
      setProofUri(res.file_uri);
    } finally {
      setUploading(false);
    }
  };

  const viewProof = async () => {
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: shipment.proof_of_delivery,
      expires_in: 300,
    });
    window.open(signed_url, '_blank', 'noopener');
  };

  const confirmDelivery = async () => {
    await onAdvance(shipment, 'DELIVERED', `Livré à ${recipient || 'client'}`, {
      delivered_to: recipient,
      delivered_at: new Date().toISOString(),
      proof_of_delivery: proofUri || shipment.proof_of_delivery || '',
    });
    setProofOpen(false);
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
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold">
          {SHIPMENT_STATUS_LABELS[shipment.status] || shipment.status}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          {[order?.address, order?.city].filter(Boolean).join(', ') || 'Adresse non renseignée'}
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
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              [order.address, order.city].filter(Boolean).join(', '),
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold"
          >
            <Navigation className="h-3.5 w-3.5" /> Itinéraire
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
            Accepter la course
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRespond(shipment, false)}
            className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-60"
          >
            <XCircle className="h-3.5 w-3.5" /> Refuser
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
            <div className="space-y-2 rounded-xl border border-border p-3">
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Nom de la personne qui réceptionne"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" />
                Preuve de livraison (photo)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadProof(e.target.files?.[0])}
                  className="text-[11px]"
                />
              </label>
              {uploading && <p className="text-[11px] text-muted-foreground">Envoi de la photo…</p>}
              {proofUri && <p className="text-[11px] font-medium text-primary">Photo ajoutée</p>}
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={confirmDelivery}
                className="w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                Marquer comme livré
              </button>
            </div>
          )}
        </div>
      )}

      {shipment.status === 'DELIVERED' && (
        <div className="mt-3 space-y-1.5 rounded-xl bg-secondary p-3 text-[11px]">
          <p className="font-semibold text-foreground">
            Livré {shipment.delivered_to ? `à ${shipment.delivered_to}` : ''}
          </p>
          {shipment.proof_of_delivery && (
            <button type="button" onClick={viewProof} className="font-semibold text-primary">
              Voir la preuve de livraison
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