export const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
export const COURIER_NEXT = { PENDING: 'PICKED_UP', CONFIRMED: 'PICKED_UP', PROCESSING: 'PICKED_UP', READY_FOR_PICKUP: 'PICKED_UP', PICKED_UP: 'IN_TRANSIT', IN_TRANSIT: 'OUT_FOR_DELIVERY' };
export const TERMINAL = ['DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'];

export function sameIdentity(a, b) {
  return !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}
export function sellerMayAct(seller, user) {
  return !!seller && seller.status === 'active' && sameIdentity(seller.email, user?.email);
}
export function courierMayAct(courier, user) {
  return !!courier && courier.active !== false && sameIdentity(courier.email, user?.email);
}
export function validAdvance(current, target, admin) {
  const cancel = target === 'CANCELLED' && ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP'].includes(current);
  if (cancel) return true;
  return STATUS_FLOW.indexOf(current) >= 0 && STATUS_FLOW.indexOf(target) === STATUS_FLOW.indexOf(current) + 1 && (admin || ['PROCESSING', 'READY_FOR_PICKUP'].includes(target));
}
export function validCourierAdvance(shipment, fulfillment, target) {
  return shipment?.courier_response === 'accepted' && !TERMINAL.includes(shipment.status) && !['DELIVERED', 'CANCELLED'].includes(fulfillment?.status) && (target === COURIER_NEXT[shipment.status] || target === 'FAILED' || target === 'DELIVERED' && ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(shipment.status));
}