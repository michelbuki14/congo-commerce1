import { base44 } from '@/api/base44Client';

/**
 * Client side of the event spine. Call `emitEvent` from the flow that already
 * performs the action — the platform then records the event and reacts to it
 * (notification to the right person, automated step, audit trail).
 *
 * Emission never blocks the user's action: a failure to record an event is
 * swallowed here and logged on the server side.
 */

export const EVENT_CATEGORIES = {
  order: 'Commandes',
  seller: 'Vendeurs',
  catalogue: 'Catalogue',
  account: 'Comptes',
  risk: 'Risques',
};

export const EVENT_LABELS = {
  order_placed: 'eventLog.orderPlaced',
  order_paid: 'eventLog.orderPaid',
  payment_failed: 'eventLog.paymentFailed',
  fulfillment_status_changed: 'eventLog.fulfillmentChanged',
  order_delivered: 'eventLog.orderDelivered',
  payout_released: 'eventLog.payoutReleased',
  product_published: 'eventLog.productPublished',
  product_archived: 'eventLog.productArchived',
  product_low_stock: 'eventLog.productLowStock',
  seller_applied: 'eventLog.sellerApplied',
  account_created: 'eventLog.accountCreated',
  dispute_opened: 'eventLog.disputeOpened',
  return_requested: 'eventLog.returnRequested',
  risk_flagged: 'eventLog.riskFlagged',
};

export function emitEvent(name, options = {}) {
  return base44.functions
    .invoke('dispatchPlatformEvent', {
      name,
      category: options.category || '',
      source: options.source || '',
      source_id: options.sourceId || '',
      reference: options.reference || '',
      severity: options.severity || '',
      tenant_id: options.tenantId || '',
      tenant_owner_email: options.tenantOwnerEmail || '',
      description: options.description || '',
      payload: options.payload || {},
    })
    .then((res) => res?.data || null)
    .catch(() => null);
}