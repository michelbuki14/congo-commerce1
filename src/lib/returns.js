import { getProfile } from '@/lib/session';
import { fetchMyOrder, fetchMyOrders, fetchMyReturns, openReturn } from '@/lib/customerAccount';

/**
 * Customer return initiation: which orders may be returned, and how a request is
 * filed. One Return record is created per returned item so each one carries its
 * own reason and refund amount.
 */

export const RETURN_REASONS = [
  { id: 'not_received', labelKey: 'returnReason.notReceived' },
  { id: 'wrong_product', labelKey: 'returnReason.wrongProduct' },
  { id: 'damaged', labelKey: 'returnReason.damaged' },
  { id: 'not_as_described', labelKey: 'returnReason.notAsDescribed' },
  { id: 'missing_item', labelKey: 'returnReason.missingItem' },
  { id: 'changed_mind', labelKey: 'returnReason.changedMind' },
];

export const RETURN_REASON_LABELS = RETURN_REASONS.reduce((acc, r) => ({ ...acc, [r.id]: r.labelKey }), {});

export const RETURN_WINDOW_DAYS = 7;

export function returnEligibility(order) {
  if (String(order.status || '') !== 'DELIVERED') {
    return { ok: false, reason: 'Retour possible après réception du colis.' };
  }
  const days = (Date.now() - new Date(order.updated_date || order.created_date).getTime()) / 86400000;
  if (days > RETURN_WINDOW_DAYS) {
    return { ok: false, reason: `Délai de ${RETURN_WINDOW_DAYS} jours après réception dépassé.` };
  }
  return { ok: true, reason: '' };
}

/** The orders this device can return: this session's orders plus remembered ones. */
export async function loadMyOrders(limit = 30) {
  return fetchMyOrders({ limit });
}

export async function findOrderByNumber(number) {
  const { order } = await fetchMyOrder({
    orderNumber: String(number || '').trim(),
    phone: getProfile().phone,
  }).catch(() => ({ order: null }));
  return order;
}

export async function loadMyReturns(phone, limit = 30) {
  if (!phone) return [];
  return fetchMyReturns({ phone, limit });
}

/**
 * Files one Return per selected item. `selection` maps `orderId::itemIndex` to a
 * reason, so two items of the same order can be returned for different motives.
 */
export async function submitReturns({ orders, selection, description, customer }) {
  const byOrder = {};
  for (const [key, value] of Object.entries(selection)) {
    const [orderId, index] = key.split('::');
    const order = orders.find((o) => o.id === orderId);
    const item = order?.items?.[Number(index)];
    if (!order || !item) continue;
    byOrder[order.order_number] = byOrder[order.order_number] || [];
    byOrder[order.order_number].push({
      product_id: item.product_id || '',
      product_title: item.title || '',
      reason: value.reason,
      refund_amount_usd: Number(item.line_total_usd) || 0,
    });
  }

  const created = [];
  for (const [orderNumber, items] of Object.entries(byOrder)) {
    created.push(...(await openReturn({
      orderNumber,
      phone: customer?.phone || '',
      description,
      items,
    })));
  }
  return created;
}