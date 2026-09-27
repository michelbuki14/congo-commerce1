/**
 * Shared helpers for the unpaid-fulfillment follow-up
 * (reminder at 1 h, discount e-mail at 24 h).
 *
 * A fulfillment order carries no payment state of its own — payment lives on
 * the parent Order, so every step resolves it the same way.
 */

const CLOSED_PAYMENT = ['CANCELLED', 'REFUNDED', 'FAILED'];
const CLOSED_FULFILLMENT = ['CANCELLED', 'RETURNED', 'FAILED'];

export async function resolveFulfillment(base44, fulfillmentId) {
  const fulfillment = await base44.asServiceRole.entities.FulfillmentOrder
    .get(fulfillmentId)
    .catch(() => null);
  if (!fulfillment) return { fulfillment: null, order: null };

  const order = fulfillment.order_id
    ? await base44.asServiceRole.entities.Order.get(fulfillment.order_id).catch(() => null)
    : null;

  return { fulfillment, order };
}

export function paymentState(fulfillment, order) {
  const paymentStatus = String(order?.payment_status || '').toUpperCase();
  const fulfillmentStatus = String(fulfillment?.status || '').toUpperCase();

  return {
    paid: paymentStatus === 'PAID',
    closed: CLOSED_PAYMENT.includes(paymentStatus) || CLOSED_FULFILLMENT.includes(fulfillmentStatus),
    payment_status: paymentStatus || 'UNKNOWN',
    fulfillment_status: fulfillmentStatus,
  };
}

export function tenantOf(fulfillment, order) {
  return {
    tenant_id: String(fulfillment?.tenant_id || order?.tenant_id || ''),
    tenant_owner_email: String(fulfillment?.tenant_owner_email || order?.tenant_owner_email || ''),
  };
}

export function orderNumber(fulfillment, order) {
  return String(fulfillment?.order_number || order?.order_number || '');
}

export function money(value) {
  return `${(Number(value) || 0).toFixed(2)} USD`;
}

export function hoursSince(date) {
  const start = new Date(date || Date.now()).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.round((Date.now() - start) / 3600000));
}

/** Stable per-fulfillment code, so a repeated run reuses the same coupon. */
export function discountCode(fulfillmentId) {
  const tail = String(fulfillmentId || '').replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase();
  return `PAY10-${tail || 'SHOP'}`;
}

export function addDays(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

export function frenchDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}