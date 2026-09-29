export const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

/**
 * International goods take a different route: the supplier delivers into our
 * warehouse in its own country, we photograph the goods for the customer, and
 * only once the customer approves do we ship to the destination. There is no
 * local courier leg at the origin, so the pickup steps do not apply.
 *
 * The approval does not dispatch the parcel: it releases it to our packing
 * bench, and packing is what hands it to our own delivery team (PACKING →
 * IN_TRANSIT).
 */
export const INTL_STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'AWAITING_CUSTOMER_APPROVAL', 'PACKING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const COURIER_NEXT = { PENDING: 'PICKED_UP', CONFIRMED: 'PICKED_UP', PROCESSING: 'PICKED_UP', READY_FOR_PICKUP: 'PICKED_UP', PICKED_UP: 'IN_TRANSIT', IN_TRANSIT: 'OUT_FOR_DELIVERY' };
export const TERMINAL = ['DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'];

export const isInternational = (sourceType) => sourceType === 'international_supplier';

export function sameIdentity(a, b) {
  return !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}
export function sellerMayAct(seller, user) {
  return !!seller && seller.status === 'active' && sameIdentity(seller.email, user?.email);
}
export function courierMayAct(courier, user) {
  return !!courier && courier.active !== false && sameIdentity(courier.email, user?.email);
}

/** Statuses from which an international shipment may still be received at the origin warehouse. */
export const INTL_RECEIVABLE = ['PENDING', 'CONFIRMED', 'PROCESSING'];

export function validAdvance(current, target, admin, sourceType) {
  const international = isInternational(sourceType);
  const flow = international ? INTL_STATUS_FLOW : STATUS_FLOW;
  const partnerTargets = international ? [] : ['PROCESSING', 'READY_FOR_PICKUP'];
  const cancellable = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'AWAITING_CUSTOMER_APPROVAL'];
  if (target === 'CANCELLED' && cancellable.includes(current)) return true;
  return flow.indexOf(current) >= 0 && flow.indexOf(target) === flow.indexOf(current) + 1 && (admin || partnerTargets.includes(target));
}
export function validCourierAdvance(shipment, fulfillment, target) {
  return shipment?.courier_response === 'accepted' && !TERMINAL.includes(shipment.status) && !['DELIVERED', 'CANCELLED'].includes(fulfillment?.status) && (target === COURIER_NEXT[shipment.status] || target === 'FAILED' || target === 'DELIVERED' && ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(shipment.status));
}