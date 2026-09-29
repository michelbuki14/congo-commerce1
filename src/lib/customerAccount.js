import { base44 } from '@/api/base44Client';
import { getSessionId } from '@/lib/session';

/**
 * Device-scoped customer access to orders and wallets.
 *
 * Orders and wallets are no longer readable by any signed-in visitor: they are
 * scoped to their owner at the row level. Storefront customers (who usually have
 * no account) read their own records through the `customerAccount` function,
 * which only answers for the device session that placed the order.
 */

async function call(payload) {
  const res = await base44.functions.invoke('customerAccount', payload);
  return res?.data || {};
}

/** This device's orders (and, when a phone is given, the orders placed with it). */
export async function fetchMyOrders({ sessionId = getSessionId(), phone = '', limit = 50 } = {}) {
  const data = await call({ action: 'orders', session_id: sessionId, phone, limit }).catch(() => ({}));
  return data.orders || [];
}

/** One order plus its fulfilments, only if this device (or the buyer phone) owns it. */
export async function fetchMyOrder({ orderNumber, sessionId = getSessionId(), phone = '' }) {
  const data = await call({ action: 'order', order_number: orderNumber, session_id: sessionId, phone });
  return { order: data.order || null, fulfillments: data.fulfillments || [] };
}

/** This device's customer wallet and its movements. */
export async function fetchMyWallet(sessionId = getSessionId()) {
  const data = await call({ action: 'wallet', session_id: sessionId }).catch(() => ({}));
  return { wallet: data.wallet || null, transactions: data.transactions || [] };
}

/** Aggregated order history used by checkout risk scoring (no record contents). */
export async function fetchRiskSignals({ phone = '', sessionId = '', couponCode = '', orderNumber = '' }) {
  return call({
    action: 'signals',
    phone,
    session_id: sessionId,
    coupon_code: couponCode,
    order_number: orderNumber,
  }).catch(() => ({}));
}

/** This device's return requests (by session or buyer phone). */
export async function fetchMyReturns({ sessionId = getSessionId(), phone = '', limit = 30 } = {}) {
  const data = await call({ action: 'returns', session_id: sessionId, phone, limit }).catch(() => ({}));
  return data.returns || [];
}

/** This device's disputes (by session or buyer phone). */
export async function fetchMyDisputes({ sessionId = getSessionId(), phone = '', limit = 30 } = {}) {
  const data = await call({ action: 'disputes', session_id: sessionId, phone, limit }).catch(() => ({}));
  return data.disputes || [];
}

/** This device's support tickets (by session or buyer phone). */
export async function fetchMyTickets({ sessionId = getSessionId(), phone = '', limit = 30 } = {}) {
  const data = await call({ action: 'tickets', session_id: sessionId, phone, limit }).catch(() => ({}));
  return data.tickets || [];
}

/** Disputes filed against the shops the signed-in user owns. */
export async function fetchSellerDisputes() {
  const data = await call({ action: 'seller_disputes' }).catch(() => ({}));
  return data.disputes || [];
}

/** Per-shop dispute counts for the public ratings page — no case contents. */
export async function fetchDisputeIndex() {
  const data = await call({ action: 'dispute_index' }).catch(() => ({}));
  return data.disputes || [];
}