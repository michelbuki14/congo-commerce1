import React from 'react';
import CourierTrackingCard from './CourierTrackingCard';

/**
 * Dedicated tracking view: every delivery the courier has taken on, with its
 * progress, its full movement history, and the controls to log the next status
 * update — including the proof-of-delivery capture.
 */
export default function CourierTrackingView({ shipments, fulfillments, orders, busy, showFleet, onAdvance }) {
  if (!shipments.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
        Aucune livraison en cours à suivre. Acceptez une course pour la suivre ici.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {shipments.map((s) => (
        <CourierTrackingCard
          key={s.id}
          shipment={s}
          fulfillment={fulfillments[s.fulfillment_order_id]}
          order={orders[s.order_number]}
          busy={busy}
          showFleet={showFleet}
          onAdvance={onAdvance}
        />
      ))}
    </div>
  );
}