import { base44 } from '@/api/base44Client';

/**
 * Phone-verified order lookup through the `get-order` server function.
 * Order numbers are enumerable, so the buyer phone recorded on the order must
 * match — reading by number alone would leak PII. Resolves
 * `{ order, fulfillments, shipments }`, throws a French user-facing message.
 */
export async function lookupOrder(orderNumber, phone) {
  let res;
  try {
    res = await base44.functions.invoke('get-order', {
      order_number: String(orderNumber || '').trim(),
      phone: String(phone || '').trim(),
    });
  } catch (e) {
    throw new Error(e?.data?.error || e?.message || 'Commande introuvable.');
  }
  if (!res?.data?.order) {
    throw new Error(res?.data?.error || 'Commande introuvable.');
  }
  return res.data;
}
