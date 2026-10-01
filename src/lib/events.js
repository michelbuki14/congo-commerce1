import { base44 } from '@/api/base44Client';

/** Used by the platform event dispatcher. Browser-side only — server functions
 *  call their own inline version with the asServiceRole client. */
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

/** Emit a platform event. Accepts an optional Base44 client so server functions
 *  can pass the asServiceRole / db client instead of the browser client. */
export function emitEvent(client, name, options = {}) {
  const db = client || base44;
  return db.functions
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
