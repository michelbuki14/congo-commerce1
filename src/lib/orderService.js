import { base44 } from '@/api/base44Client';
import { getPricingConfig } from './config';
import { round2, usdToCdf } from './format';
import { getSessionId, rememberOrder, getReferralCode } from './session';
import { notifyFulfillmentStatus } from './orderNotifications';
import { assessCheckoutRisk } from './fraud';
import { emitEvent } from './events';

/**
 * Reloads every cart line from the database. Client-supplied prices, stock and
 * supplier costs are ALWAYS discarded — the server records are the truth.
 */
export async function loadCartLines(items) {
  const products = await Promise.all(
    items.map((i) => base44.entities.Product.get(i.product_id).catch(() => null)),
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

export async function findCoupon(code) {
  if (!code) return null;
  const rows = await base44.entities.Coupon.filter({ code: String(code).toUpperCase().trim() });
  const coupon = rows.find((c) => c.active !== false);
  if (!coupon) return null;
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return null;
  if (Number(coupon.usage_limit) > 0 && (Number(coupon.usage_count) || 0) >= Number(coupon.usage_limit)) return null;
  return coupon;
}

export async function buildCheckoutQuote({ items, deliveryFee = 0, coupon = null, pricingConfig }) {
  const cfg = pricingConfig || getPricingConfig();
  const lines = await loadCartLines(items);
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

async function getOrCreateWallet(ownerType, ownerName, ownerEmail, ownerId, tenant = {}) {
  const rows = await base44.entities.Wallet.filter({ owner_type: ownerType, owner_name: ownerName });
  if (rows[0]) return rows[0];
  return base44.entities.Wallet.create({
    tenant_id: tenant.tenant_id || '',
    tenant_owner_email: tenant.tenant_owner_email || '',
    owner_type: ownerType,
    owner_name: ownerName,
    owner_email: ownerEmail || '',
    owner_id: ownerId || '',
    balance_usd: 0,
  });
}

/** Every balance change goes through here — a balance is never written directly. */
async function postTransaction(wallet, payload) {
  const amount = round2(payload.amount);
  if (amount <= 0) return null;
  const isCredit = payload.direction !== 'debit';
  if (!isCredit && payload.status !== 'pending') {
    // Immediate debits (wallet payments, withdrawals) must be covered by the
    // available balance. Pending entries are earmarked future money, not spent.
    const available = round2(wallet.balance_usd || 0);
    if (round2(amount - available) > 0.005) {
      throw new Error(`Solde insuffisant — disponible : ${available} USD.`);
    }
  }
  const updated = await base44.entities.Wallet.update(wallet.id, {
    balance_usd: isCredit ? round2((wallet.balance_usd || 0) + amount) : round2((wallet.balance_usd || 0) - amount),
    lifetime_credit_usd: isCredit ? round2((wallet.lifetime_credit_usd || 0) + amount) : wallet.lifetime_credit_usd || 0,
    lifetime_debit_usd: isCredit ? wallet.lifetime_debit_usd || 0 : round2((wallet.lifetime_debit_usd || 0) + amount),
    pending_usd: isCredit
      ? round2((wallet.pending_usd || 0) + (payload.status === 'pending' ? amount : 0))
      : wallet.pending_usd || 0,
  });

  const transaction = await base44.entities.WalletTransaction.create({
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
 * Thin tunnel to the `place-order` server function: all money math, stock
 * checks, coupon enforcement and ledger writes happen server-side. The browser
 * only forwards identifiers and customer input, then runs the non-authoritative
 * post-effects (fraud assessment, event emission, device order memory).
 */
export async function placeOrder({ items, profile, delivery, couponCode, paymentMethodId, paymentPhone, consent }) {
  const sessionId = getSessionId();
  const affiliateCode = getReferralCode();
  let data;
  try {
    const res = await base44.functions.invoke('place-order', {
      items: (items || []).map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        variant: i.variant || null,
      })),
      profile: {
        name: profile?.name || '',
        phone: profile?.phone || '',
        email: profile?.email || '',
        city: profile?.city || '',
        address: profile?.address || '',
      },
      delivery: {
        method: delivery?.method,
        zone_id: delivery?.zone_id || '',
        pickup_point_id: delivery?.pickup_point_id || '',
        address: delivery?.address || profile?.address || '',
        notes: delivery?.notes || '',
      },
      couponCode: couponCode || '',
      paymentMethodId,
      paymentPhone: paymentPhone || profile?.phone || '',
      affiliateCode,
      sessionId,
      consent: { terms: consent?.terms === true, marketing: consent?.marketing === true },
    });
    data = res?.data;
  } catch (e) {
    throw new Error(e?.data?.error || e?.error || e?.message || 'La commande a échoué. Réessayez.');
  }
  if (!data?.order?.order_number) {
    throw new Error(data?.error || 'La commande a échoué. Réessayez.');
  }
  const finalOrder = data.order;

  await assessCheckoutRisk({
    order: finalOrder,
    amountUsd: data?.quote?.total || finalOrder.total_usd,
    sessionId,
    profile,
    couponCode: couponCode || '',
    affiliateCode,
  }).catch(() => null);

  rememberOrder(finalOrder);

  emitEvent('order_placed', {
    category: 'order',
    source: 'Order',
    sourceId: finalOrder.id,
    reference: finalOrder.order_number,
    tenantId: finalOrder.tenant_id || '',
    tenantOwnerEmail: finalOrder.tenant_owner_email || '',
    description: `Commande ${finalOrder.order_number} — ${finalOrder.total_usd} USD`,
    payload: {
      total_usd: finalOrder.total_usd,
      payment_status: finalOrder.payment_status,
      city: profile?.city || '',
    },
  });

  if (finalOrder.payment_status === 'PAID') {
    emitEvent('order_paid', {
      category: 'order',
      source: 'Order',
      sourceId: finalOrder.id,
      reference: finalOrder.order_number,
      tenantId: finalOrder.tenant_id || '',
      tenantOwnerEmail: finalOrder.tenant_owner_email || '',
      description: `Paiement confirmé pour ${finalOrder.order_number}`,
      payload: { total_usd: finalOrder.total_usd },
    });
  }

  return {
    order: finalOrder,
    fulfillments: data.fulfillments || [],
    payment: data.payment || { status: finalOrder.payment_status, verified: finalOrder.payment_verified },
    quote: data.quote || null,
  };
}

/**
 * Called when a fulfillment reaches DELIVERED: releases the seller payout and
 * the creator commission that were parked as `pending` at checkout time.
 */
export async function releaseFulfillmentPayout(fulfillment) {
  if (fulfillment.payout_released) return { released: false };
  const pending = await base44.entities.WalletTransaction.filter({
    reference: fulfillment.fulfillment_number,
    status: 'pending',
  });

  for (const tx of pending) {
    const wallets = await base44.entities.Wallet.filter({ id: tx.wallet_id });
    const wallet = wallets[0];
    if (!wallet) continue;
    await base44.entities.WalletTransaction.update(tx.id, { status: 'posted' });
    await base44.entities.Wallet.update(wallet.id, {
      pending_usd: Math.max(0, round2((wallet.pending_usd || 0) - tx.amount_usd)),
    });
  }

  await base44.entities.FulfillmentOrder.update(fulfillment.id, { payout_released: true });
  await base44.entities.AuditLog.create({
    action: 'payout.released',
    actor: 'admin',
    entity: 'FulfillmentOrder',
    entity_id: fulfillment.id,
    reference: fulfillment.fulfillment_number,
    severity: 'info',
    details: { seller_payout_usd: fulfillment.seller_payout_usd, transactions: pending.length },
  });
  emitEvent('payout_released', {
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

export async function advanceFulfillment(fulfillment, status) {
  const updated = await base44.entities.FulfillmentOrder.update(fulfillment.id, { status });
  const shipments = await base44.entities.Shipment.filter({ fulfillment_order_id: fulfillment.id });
  if (shipments[0]) {
    const events = [...(shipments[0].events || []), { status, label: status, at: new Date().toISOString() }];
    await base44.entities.Shipment.update(shipments[0].id, { status, events });
  }
  if (status === 'DELIVERED') {
    await releaseFulfillmentPayout(updated);
  }
  await notifyFulfillmentStatus(updated, status);
  emitEvent(status === 'DELIVERED' ? 'order_delivered' : 'fulfillment_status_changed', {
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
export async function respondToShipment({ shipment, accepted }) {
  const events = [
    ...(shipment.events || []),
    {
      status: shipment.status,
      label: accepted ? 'Course acceptée par le transporteur' : 'Course refusée par le transporteur',
      at: new Date().toISOString(),
    },
  ];
  return base44.entities.Shipment.update(shipment.id, {
    courier_response: accepted ? 'accepted' : 'declined',
    events,
  });
}

/** Pays the courier the delivery fee of a completed course. Ledger-only, never a direct balance write. */
async function creditCourierEarnings(fulfillment) {
  const amount = round2(Number(fulfillment.shipping_usd) || 0);
  if (amount <= 0 || !fulfillment.courier_name) return;
  const wallet = await getOrCreateWallet('courier', fulfillment.courier_name, '', fulfillment.courier_id);
  await postTransaction(wallet, {
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
export async function courierUpdateShipment({ shipment, fulfillment, status, label, extra = {} }) {
  const events = [
    ...(shipment.events || []),
    { status, label: label || status, at: new Date().toISOString() },
  ];
  await base44.entities.Shipment.update(shipment.id, { status, events, ...extra });
  if (fulfillment) {
    await base44.entities.FulfillmentOrder.update(fulfillment.id, { status });
    if (status === 'DELIVERED' && shipment.status !== 'DELIVERED') {
      await releaseFulfillmentPayout(fulfillment);
      await creditCourierEarnings(fulfillment);
    }
    await notifyFulfillmentStatus({ ...fulfillment, status }, status);
  }
  return true;
}