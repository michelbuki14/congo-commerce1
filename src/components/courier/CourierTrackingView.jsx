import React from 'react';
import { useTranslation } from 'react-i18next';
import CourierTrackingCard from './CourierTrackingCard';

/**
 * Dedicated tracking view: every delivery the courier has taken on, with its
 * progress, its full movement history, and the controls to log the next status
 * update — including the proof-of-delivery capture.
 */
export default function CourierTrackingView({ shipments, fulfillments, orders, busy, showFleet, onAdvance }) {
  const { t } = useTranslation();
  if (!shipments.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
        {t('courierTrackingView.empty')}
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