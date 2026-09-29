import { base44 } from '@/api/base44Client';
import { getPricingConfig } from './config';
import { intlFee, intlLines, intlWeightKg } from './intlDelivery';
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

export async function buildCheckoutQuote({ items, deliveryFee = 0, coupon = null, pricingConfig, intlOption = null }) {
  const cfg = pricingConfig || getPricingConfig();
  const lines = await loadCartLines(items);
  const subtotal = round2(lines.reduce((s, l) => s + l.line_total_usd, 0));
  const discount = computeCouponDiscount(coupon, subtotal);

  const threshold = Number(cfg.free_shipping_threshold_usd) || 0;
  const freeShipping = coupon?.type === 'free_shipping' || (threshold > 0 && subtotal - discount >= threshold);

  // Local delivery and the international leg are priced apart: the local fee
  // only applies when the cart holds local goods, and the local free-shipping
  // threshold never waives international freight.
  const imports = intlLines(lines);
  const intlWeight = intlWeightKg(lines);
  const localShipping = lines.some((l) => l.product.source_type === 'local_seller') && !freeShipping
    ? round2(deliveryFee)
    : 0;
  const intlShipping = imports.length ? intlFee(intlOption, intlWeight) : 0;
  const shipping = round2(localShipping + intlShipping);

  const total = round2(Math.max(0, subtotal - discount) + shipping);
  return {
    lines,
    subtotal,
    discount,
    shipping,
    localShipping,
    intlShipping,
    intlWeight,
    freeShipping,
    total,
    total_cdf: usdToCdf(total),
    has_stock_issue: lines.some((l) => !l.stock_ok),
  };
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
        intl_option_id: delivery?.intl_option_id || '',
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

/** Persist delivery transitions on the server; never accept a browser-supplied balance or owner. */
export async function advanceFulfillment(fulfillment, status) {
  const { data } = await base44.functions.invoke('fulfillmentAction', { action: 'advance', fulfillment_id: fulfillment.id, status });
  const updated = data.fulfillment;
  await notifyFulfillmentStatus(updated, status);
  emitEvent(status === 'DELIVERED' ? 'order_delivered' : 'fulfillment_status_changed', {
    category: 'order', source: 'FulfillmentOrder', sourceId: updated.id,
    reference: updated.order_number || '', tenantId: updated.tenant_id || '',
    tenantOwnerEmail: updated.tenant_owner_email || '',
    description: `${updated.fulfillment_number || ''} → ${status}`,
    payload: { status, label: status, fulfillment_number: updated.fulfillment_number || '' },
  });
  return updated;
}

export async function respondToShipment({ shipment, accepted }) {
  const { data } = await base44.functions.invoke('fulfillmentAction', { action: 'respond', shipment_id: shipment.id, accepted });
  return data.shipment;
}

export async function courierUpdateShipment({ shipment, status, label, extra = {} }) {
  const { data } = await base44.functions.invoke('fulfillmentAction', {
    action: 'courierAdvance', shipment_id: shipment.id, status, label,
    delivered_to: extra.delivered_to, proof_of_delivery: extra.proof_of_delivery, pickup_code: extra.pickup_code,
  });
  await notifyFulfillmentStatus(data.fulfillment, status);
  return true;
}