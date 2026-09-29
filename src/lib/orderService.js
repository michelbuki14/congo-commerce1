import { base44 } from '@/api/base44Client';
import { getPricingConfig } from './config';
import { round2, usdToCdf } from './format';
import { notifyFulfillmentStatus } from './orderNotifications';
import { emitEvent } from './events';

/**
 * Reloads every cart line from the database. Client-supplied prices, stock and
 * supplier costs are ALWAYS discarded — the server records are the truth.
 */
export async function loadCartLines(client, items) {
  const db = client || base44;
  const products = await Promise.all(
    items.map((i) => db.entities.Product.get(i.product_id).catch(() => null)),
  );
  const byId = {};
  products.forEach((p) => {
    if (p) byId[p.id] = p;
  });
  return items
    .map((i) => {
      const product = byId[i.product_id];
      if (!product) return null;
      const quantity = Math.max(1, Number(i.quantity) || 1);
      const unit = round2(Number(product.price_usd) || 0);
      const cost = round2(Number(product.supplier_price ?? product.price_usd) || 0);
      return {
        product,
        quantity,
        variant: i.variant || null,
        unit_price_usd: unit,
        line_total_usd: round2(unit * quantity),
        line_cost_usd: round2(cost * quantity),
        stock_ok: (product.stock ?? 0) >= quantity,
      };
    })
    .filter(Boolean);
}

export function computeCouponDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  if (coupon.type === 'percent') {
    const raw = round2(subtotal * ((Number(coupon.value) || 0) / 100));
    const cap = Number(coupon.max_discount_usd) || 0;
    return cap > 0 ? Math.min(raw, cap) : raw;
  }
  if (coupon.type === 'fixed') return Math.min(round2(Number(coupon.value) || 0), subtotal);
  return 0;
}

export async function findCoupon(client, code) {
  if (!code) return null;
  const db = client || base44;
  const rows = await db.entities.Coupon.filter({ code: String(code).toUpperCase().trim() });
  const coupon = rows.find((c) => c.active !== false);
  if (!coupon) return null;
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return null;
  if (Number(coupon.usage_limit) > 0 && (Number(coupon.usage_count) || 0) >= Number(coupon.usage_limit)) return null;
  return coupon;
}

export async function buildCheckoutQuote(client, { items, deliveryFee = 0, coupon = null, pricingConfig }) {
  const db = client || base44;
  const cfg = pricingConfig || getPricingConfig();
  const lines = await loadCartLines(db, items);
  const subtotal = round2(lines.reduce((s, l) => s + l.line_total_usd, 0));
  const discount = computeCouponDiscount(coupon, subtotal);

  const threshold = Number(cfg.free_shipping_threshold_usd) || 0;
  const freeShipping = coupon?.type === 'free_shipping' || (threshold > 0 && subtotal - discount >= threshold);
  const shipping = freeShipping ? 0 : round2(deliveryFee);

  const total = round2(Math.max(0, subtotal - discount) + shipping);
  return {
    lines,
    subtotal,
    discount,
    shipping,
    freeShipping,
    total,
    total_cdf: usdToCdf(total),
    has_stock_issue: lines.some((l) => !l.stock_ok),
  };
}

/** Lazily creates or returns an existing wallet.
 * `db` — Base44 SDK client. Defaults to the module-level browser client
 * when omitted so browser callers (Checkout, Admin consoles) keep working.
 * The server function passes its `asServiceRole` client explicitly so
 * all writes bypass RLS.
 */
async function getOrCreateWallet(client, ownerType, ownerName, ownerEmail, ownerId, tenant = {}) {
  const rows = await db.entities.Wallet.filter({ owner_type: ownerType, owner_name: ownerName });
  if (rows[0]) return rows[0];
  return db.entities.Wallet.create({
    tenant_id: tenant.tenant_id || '',
    tenant_owner_email: tenant.tenant_owner_email || '',
    owner_type: ownerType,
    owner_name: ownerName,
    owner_email: ownerEmail || '',
    owner_id: ownerId || '',
    balance_usd: 0,
  });
}

/** Every balance change goes through here — a balance is never written directly.
 * `client` — Base44 SDK client. Defaults to the browser client for backward
 * compatibility; the server function passes its `asServiceRole` client.
 */
async function postTransaction(client, wallet, payload) {
  const db = client || base44;
  const amount = round2(payload.amount);
  if (amount <= 0) return null;
  const isCredit = payload.direction !== 'debit';
  const updated = await db.entities.Wallet.update(wallet.id, {
    balance_usd: isCredit ? round2((wallet.balance_usd || 0) + amount) : round2((wallet.balance_usd || 0) - amount),
    lifetime_credit_usd: isCredit ? round2((wallet.lifetime_credit_usd || 0) + amount) : wallet.lifetime_credit_usd || 0,
    lifetime_debit_usd: isCredit ? wallet.lifetime_debit_usd || 0 : round2((wallet.lifetime_debit_usd || 0) + amount),
    pending_usd: isCredit
      ? round2((wallet.pending_usd || 0) + (payload.status === 'pending' ? amount : 0))
      : wallet.pending_usd || 0,
  });

  const transaction = await db.entities.WalletTransaction.create({
    wallet_id: wallet.id,
    tenant_id: wallet.tenant_id || '',
    tenant_owner_email: wallet.tenant_owner_email || '',
    owner_type: wallet.owner_type,
    owner_name: wallet.owner_name,
    type: payload.type,
    direction: isCredit ? 'credit' : 'debit',
    amount_usd: amount,
    amount_cdf: usdToCdf(amount),
    balance_after_usd: updated.balance_usd,
    currency: 'USD',
    description: payload.description,
    reference: payload.reference || '',
    order_id: payload.orderId || '',
    order_number: payload.orderNumber || '',
    idempotency_key: payload.idempotencyKey || '',
    status: payload.status || 'posted',
  });

  return { wallet: updated, transaction };
}

/**
 * MAIN COMMERCE ENGINE ENTRY POINT
 * Order → payment → split fulfillment → ledger. Idempotent per order number.
 */
export async function placeOrder(client, { items, profile, delivery, couponCode, paymentMethodId, paymentPhone, consent }) {
  const db = client || base44;
  const result = await db.functions.invoke('place-order', {
    items,
    profile,
    delivery,
    couponCode,
    paymentMethodId,
    paymentPhone,
    consent,
  });
  return result.data;
}

/**
 * Called when a fulfillment reaches DELIVERED: releases the seller payout and
 * the creator commission that were parked as `pending` at checkout time.
 */
export async function releaseFulfillmentPayout(client, fulfillment) {
  const db = client || base44;
  if (fulfillment.payout_released) return { released: false };
  const pending = await db.entities.WalletTransaction.filter({
    reference: fulfillment.fulfillment_number,
    status: 'pending',
  });

  for (const tx of pending) {
    const wallets = await db.entities.Wallet.filter({ id: tx.wallet_id });
    const wallet = wallets[0];
    if (!wallet) continue;
    await db.entities.WalletTransaction.update(tx.id, { status: 'posted' });
    await db.entities.Wallet.update(wallet.id, {
      pending_usd: Math.max(0, round2((wallet.pending_usd || 0) - tx.amount_usd)),
    });
  }

  await db.entities.FulfillmentOrder.update(fulfillment.id, { payout_released: true });
  await db.entities.AuditLog.create({
    action: 'payout.released',
    actor: 'admin',
    entity: 'FulfillmentOrder',
    entity_id: fulfillment.id,
    reference: fulfillment.fulfillment_number,
    severity: 'info',
    details: { seller_payout_usd: fulfillment.seller_payout_usd, transactions: pending.length },
  });
  emitEvent(db, 'payout_released', {
    category: 'order',
    source: 'FulfillmentOrder',
    sourceId: fulfillment.id,
    reference: fulfillment.order_number || fulfillment.fulfillment_number || '',
    tenantId: fulfillment.tenant_id || '',
    tenantOwnerEmail: fulfillment.tenant_owner_email || '',
    description: `Versement libéré — ${fulfillment.fulfillment_number || ''}`,
    payload: {
      order_number: fulfillment.order_number || '',
      fulfillment_number: fulfillment.fulfillment_number || '',
      seller_payout_usd: fulfillment.seller_payout_usd || 0,
      transactions: pending.length,
    },
  });
  return { released: true, count: pending.length };
}

export async function advanceFulfillment(client, fulfillment, status) {
  const db = client || base44;
  const updated = await db.entities.FulfillmentOrder.update(fulfillment.id, { status });
  const shipments = await db.entities.Shipment.filter({ fulfillment_order_id: fulfillment.id });
  if (shipments[0]) {
    const events = [...(shipments[0].events || []), { status, label: status, at: new Date().toISOString() }];
    await db.entities.Shipment.update(shipments[0].id, { status, events });
  }
  if (status === 'DELIVERED') {
    await releaseFulfillmentPayout(db, updated);
  }
  await notifyFulfillmentStatus(db, updated, status);
  emitEvent(db, status === 'DELIVERED' ? 'order_delivered' : 'fulfillment_status_changed', {
    category: 'order',
    source: 'FulfillmentOrder',
    sourceId: updated.id,
    reference: updated.order_number || '',
    tenantId: updated.tenant_id || '',
    tenantOwnerEmail: updated.tenant_owner_email || '',
    description: `${updated.fulfillment_number || ''} → ${status}`,
    payload: {
      status,
      label: status,
      fulfillment_number: updated.fulfillment_number || '',
    },
  });
  return updated;
}

/** Courier accepts or declines an offered delivery job. */
export async function respondToShipment(client, { shipment, accepted }) {
  const db = client || base44;
  const events = [
    ...(shipment.events || []),
    {
      status: shipment.status,
      label: accepted ? 'Course acceptée par le transporteur' : 'Course refusée par le transporteur',
      at: new Date().toISOString(),
    },
  ];
  return db.entities.Shipment.update(shipment.id, {
    courier_response: accepted ? 'accepted' : 'declined',
    events,
  });
}

/** Pays the courier the delivery fee of a completed course. Ledger-only, never a direct balance write. */
async function creditCourierEarnings(client, fulfillment) {
  const db = client || base44;
  const amount = round2(Number(fulfillment.shipping_usd) || 0);
  if (amount <= 0 || !fulfillment.courier_name) return;
  const wallet = await getOrCreateWallet(db, 'courier', fulfillment.courier_name, '', fulfillment.courier_id);
  await postTransaction(db, wallet, {
    type: 'PAYOUT',
    direction: 'credit',
    amount,
    description: `Course livrée — ${fulfillment.fulfillment_number}`,
    reference: fulfillment.fulfillment_number,
    orderId: fulfillment.order_id || '',
    orderNumber: fulfillment.order_number || '',
    idempotencyKey: `courier:${fulfillment.fulfillment_number}`,
  });
}

/**
 * Courier-side transition. Mirrors the shipment status onto its fulfillment order,
 * releases the seller payout on delivery, and credits the courier's earnings.
 */
export async function courierUpdateShipment(client, { shipment, fulfillment, status, label, extra = {} }) {
  const db = client || base44;
  const events = [
    ...(shipment.events || []),
    { status, label: label || status, at: new Date().toISOString() },
  ];
  await db.entities.Shipment.update(shipment.id, { status, events, ...extra });
  if (fulfillment) {
    await db.entities.FulfillmentOrder.update(fulfillment.id, { status });
    if (status === 'DELIVERED' && shipment.status !== 'DELIVERED') {
      await releaseFulfillmentPayout(db, fulfillment);
      await creditCourierEarnings(db, fulfillment);
    }
    await notifyFulfillmentStatus(db, { ...fulfillment, status }, status);
  }
  return true;
}