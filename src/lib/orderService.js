import { base44 } from '@/api/base44Client';
import { getPricingConfig } from './config';
import { getPaymentProvider } from './payments';
import { selectCourierFor, getCourier } from './logistics';
import { round2, usdToCdf } from './format';
import { splitVat, getVatRate, formatInvoiceNumber } from './tax';
import { getSessionId, rememberOrder, getReferralCode } from './session';

export function generateOrderNumber() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `CC-${stamp}-${Math.floor(1000 + Math.random() * 8999)}`;
}

function generateFulfillmentNumber(orderNumber, index) {
  return `${orderNumber}-F${index + 1}`;
}

/** 4-digit handover code the customer gives the courier at a pickup point. */
function generatePickupCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Continuous invoice numbering per year: FA-<année>-<séquence>. */
async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const rows = await base44.entities.PlatformSetting.filter({ key: 'invoice_counter' });
  const current = rows[0];
  const previous = current?.value?.year === year ? Number(current.value.seq) || 0 : 0;
  const value = { year, seq: previous + 1 };
  if (current) {
    await base44.entities.PlatformSetting.update(current.id, { value });
  } else {
    await base44.entities.PlatformSetting.create({
      key: 'invoice_counter',
      label: 'Compteur de factures',
      group: 'compliance',
      value,
    });
  }
  return formatInvoiceNumber(year, value.seq);
}

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

async function getOrCreateWallet(ownerType, ownerName, ownerEmail, ownerId) {
  const rows = await base44.entities.Wallet.filter({ owner_type: ownerType, owner_name: ownerName });
  if (rows[0]) return rows[0];
  return base44.entities.Wallet.create({
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
export async function placeOrder({ items, profile, delivery, couponCode, paymentMethodId, paymentPhone, consent }) {
  const cfg = getPricingConfig();
  const sessionId = getSessionId();
  const provider = getPaymentProvider(paymentMethodId);
  // The wallet number a gateway debits is not necessarily the delivery phone.
  const chargePhone = paymentPhone || profile?.phone || '';
  const orderNumber = generateOrderNumber();

  let coupon = null;
  if (couponCode) {
    coupon = await findCoupon(couponCode);
    if (!coupon) throw new Error('Ce code promo est invalide ou a expiré.');
  }

  const quote = await buildCheckoutQuote({ items, deliveryFee: delivery.fee_usd || 0, coupon, pricingConfig: cfg });
  if (!quote.lines.length) throw new Error('Votre panier est vide.');
  if (quote.has_stock_issue) throw new Error('Un article de votre panier n’est plus disponible en quantité suffisante.');
  if (coupon && quote.subtotal < (Number(coupon.min_order_usd) || 0)) {
    throw new Error(`Ce code promo nécessite un minimum de ${coupon.min_order_usd} USD d’achat.`);
  }
  if (provider.requiresPhone && !chargePhone) {
    throw new Error(`Un numéro de téléphone est requis pour ${provider.name}.`);
  }
  if (consent?.terms !== true) {
    throw new Error('Vous devez accepter les conditions générales de vente et la politique de confidentialité.');
  }

  // TVA: prices are displayed TTC, so the tax is extracted from the total and
  // detailed on the invoice — it is never added on top of the customer's price.
  const vatRate = getVatRate();
  const { ht: totalHt, vat: vatAmount } = splitVat(quote.total, vatRate);
  const invoiceNumber = await nextInvoiceNumber();

  // ---- 1. Split one customer order into fulfillment orders -----------------
  const groups = new Map();
  quote.lines.forEach((line) => {
    const p = line.product;
    const key = p.source_type === 'local_seller' ? `seller:${p.seller_id}` : `source:${p.source_type}:${p.supplier_id || 'platform'}`;
    if (!groups.has(key)) {
      groups.set(key, {
        source_type: p.source_type,
        seller_id: p.seller_id || null,
        seller_name: p.seller_name || null,
        supplier_id: p.supplier_id || null,
        supplier_name: p.supplier_name || null,
        lines: [],
      });
    }
    groups.get(key).lines.push(line);
  });

  const referralCode = getReferralCode();
  let creator = null;
  if (referralCode) {
    const rows = await base44.entities.Creator.filter({ referral_code: referralCode });
    creator = rows[0] || null;
  }
  const creatorRate = Number(creator?.commission_rate ?? cfg.creator_commission_percent);

  const groupList = [...groups.values()];
  const plan = groupList.map((g, index) => {
    const sub = round2(g.lines.reduce((s, l) => s + l.line_total_usd, 0));
    const cost = round2(g.lines.reduce((s, l) => s + l.line_cost_usd, 0));
    const creatorCommission = creator ? round2(sub * (creatorRate / 100)) : 0;
    let sellerPayout = 0;
    let platformRevenue = 0;
    if (g.source_type === 'local_seller') {
      sellerPayout = round2(sub * (1 - (Number(cfg.seller_commission_percent) || 0) / 100));
      platformRevenue = round2(sub - sellerPayout - creatorCommission);
    } else {
      platformRevenue = round2(sub - cost - creatorCommission);
    }
    const weight = round2(g.lines.reduce((s, l) => s + (l.product.weight_kg || 0.5) * l.quantity, 0));
    return { ...g, index, sub, cost, creatorCommission, sellerPayout, platformRevenue, weight };
  });

  // ---- 2. Create the single customer-facing order --------------------------
  const order = await base44.entities.Order.create({
    order_number: orderNumber,
    session_id: sessionId,
    customer_name: profile.name,
    customer_phone: profile.phone,
    payment_phone: provider.kind === 'mobile_money' ? chargePhone : '',
    customer_email: profile.email || '',
    city: profile.city,
    address: delivery.address || profile.address || '',
    delivery_method: delivery.method,
    pickup_point_id: delivery.pickup_point_id || '',
    pickup_point_name: delivery.pickup_point_name || '',
    pickup_code: delivery.method === 'pickup_point' ? generatePickupCode() : '',
    notes: delivery.notes || '',
    items: quote.lines.map((l) => ({
      product_id: l.product.id,
      title: l.product.title,
      image: l.product.images?.[0] || '',
      quantity: l.quantity,
      variant: l.variant,
      unit_price_usd: l.unit_price_usd,
      line_total_usd: l.line_total_usd,
      source_type: l.product.source_type,
      seller_name: l.product.seller_name || l.product.supplier_name || '',
    })),
    subtotal_usd: quote.subtotal,
    shipping_usd: quote.shipping,
    discount_usd: quote.discount,
    total_usd: quote.total,
    total_cdf: quote.total_cdf,
    currency: 'USD',
    payment_method: provider.name,
    payment_provider: provider.id,
    payment_status: 'PENDING',
    coupon_code: coupon?.code || '',
    affiliate_code: creator?.referral_code || '',
    creator_id: creator?.id || '',
    status: 'PENDING',
    fulfillment_count: plan.length,
    vat_rate: vatRate,
    vat_usd: vatAmount,
    total_ht_usd: totalHt,
    invoice_number: invoiceNumber,
    consent_terms: true,
    consent_marketing: consent?.marketing === true,
    consent_at: new Date().toISOString(),
  });

  // ---- 3. Charge through the payment abstraction ---------------------------
  let paymentResult;
  try {
    paymentResult = await provider.charge({
      amount: quote.total,
      currency: 'USD',
      phone: chargePhone,
      orderNumber,
      metadata: { order_id: order.id, session_id: sessionId },
    });
  } catch (error) {
    await base44.entities.Order.update(order.id, { payment_status: 'FAILED', status: 'CANCELLED' });
    await base44.entities.AuditLog.create({
      action: 'payment.failed',
      actor: 'customer',
      entity: 'Order',
      entity_id: order.id,
      reference: orderNumber,
      severity: 'warning',
      details: { provider: provider.id, message: error.message },
    });
    throw error;
  }

  const paid = paymentResult.status === 'PAID' || paymentResult.status === 'AUTHORIZED';

  // ---- 4. Fulfillment orders, one per supplier / seller --------------------
  const fulfillmentPayloads = plan.map((p) => {
    const isLocal = p.source_type === 'local_seller';
    const courierPick = isLocal ? selectCourierFor(profile.city, p.weight) : null;
    const courier = courierPick ? courierPick.courier : getCourier('kin_express');
    const shipment = isLocal ? courier.createShipment({ orderNumber }) : null;
    return {
      order_id: order.id,
      order_number: orderNumber,
      fulfillment_number: generateFulfillmentNumber(orderNumber, p.index),
      source_type: p.source_type,
      seller_id: p.seller_id || '',
      seller_name: p.seller_name || '',
      supplier_id: p.supplier_id || '',
      supplier_name: p.supplier_name || '',
      items: p.lines.map((l) => ({
        product_id: l.product.id,
        title: l.product.title,
        image: l.product.images?.[0] || '',
        quantity: l.quantity,
        variant: l.variant,
        unit_price_usd: l.unit_price_usd,
        line_total_usd: l.line_total_usd,
        supplier_cost_usd: l.line_cost_usd,
      })),
      subtotal_usd: p.sub,
      shipping_usd: isLocal ? round2(courierPick?.quote?.fee || 0) : 0,
      supplier_cost_usd: p.cost,
      seller_payout_usd: p.sellerPayout,
      creator_commission_usd: p.creatorCommission,
      platform_revenue_usd: p.platformRevenue,
      status: paid ? 'CONFIRMED' : 'PENDING',
      courier_id: isLocal ? courier.id : '',
      courier_name: isLocal ? courier.name : p.supplier_name || 'Fournisseur international',
      tracking_number: shipment?.tracking_number || '',
      estimated_delivery: isLocal ? courier.etaDays : `${p.lines[0]?.product?.estimated_delivery || '18 jours'}`,
      payout_released: false,
    };
  });

  const fulfillments = await base44.entities.FulfillmentOrder.bulkCreate(fulfillmentPayloads);

  const shipments = await Promise.all(
    fulfillments
      .filter((f) => f.tracking_number)
      .map((f) =>
        base44.entities.Shipment.create({
          fulfillment_order_id: f.id,
          order_number: orderNumber,
          courier_id: f.courier_id,
          courier_name: f.courier_name,
          tracking_number: f.tracking_number,
          status: f.status,
          events: [{ status: f.status, label: 'Étiquette créée', at: new Date().toISOString() }],
        }),
      ),
  );

  // ---- 5. Ledger: platform revenue, seller payout, creator commission ------
  const platformWallet = await getOrCreateWallet('platform', 'Congo Commerce', 'finance@congocommerce.cd', 'platform');
  const platformRevenue = round2(plan.reduce((s, p) => s + p.platformRevenue, 0));
  if (paid && platformRevenue > 0) {
    await postTransaction(platformWallet, {
      type: 'COMMISSION',
      direction: 'credit',
      amount: platformRevenue,
      description: `Marge plateforme — commande ${orderNumber}`,
      reference: orderNumber,
      orderId: order.id,
      orderNumber,
      idempotencyKey: `platform:${orderNumber}`,
    });
  }

  for (const f of fulfillments) {
    if (f.seller_id && f.seller_payout_usd > 0) {
      const sellerWallet = await getOrCreateWallet('seller', f.seller_name, '', f.seller_id);
      await postTransaction(sellerWallet, {
        type: 'PAYOUT',
        direction: 'credit',
        amount: f.seller_payout_usd,
        description: `Vente à créditer — ${f.fulfillment_number}`,
        reference: f.fulfillment_number,
        orderId: order.id,
        orderNumber,
        status: 'pending',
        idempotencyKey: `seller:${f.fulfillment_number}`,
      });
    }
    if (creator && f.creator_commission_usd > 0) {
      const creatorWallet = await getOrCreateWallet('creator', creator.name, '', creator.id);
      await postTransaction(creatorWallet, {
        type: 'COMMISSION',
        direction: 'credit',
        amount: f.creator_commission_usd,
        description: `Commission créateur — ${f.fulfillment_number}`,
        reference: f.fulfillment_number,
        orderId: order.id,
        orderNumber,
        status: 'pending',
        idempotencyKey: `creator:${f.fulfillment_number}`,
      });
    }
  }

  if (paymentMethodId === 'wallet') {
    const customerWallet = await getOrCreateWallet('customer', profile.name || 'Client', profile.email || '', sessionId);
    await postTransaction(customerWallet, {
      type: 'DEBIT',
      direction: 'debit',
      amount: quote.total,
      description: `Achat — commande ${orderNumber}`,
      reference: orderNumber,
      orderId: order.id,
      orderNumber,
      idempotencyKey: `wallet:${orderNumber}`,
    });
  }

  // ---- 6. Stock, coupon usage, attribution, audit --------------------------
  await base44.entities.Product.bulkUpdate(
    quote.lines.map((l) => ({
      id: l.product.id,
      stock: Math.max(0, (Number(l.product.stock) || 0) - l.quantity),
      sold_count: (Number(l.product.sold_count) || 0) + l.quantity,
    })),
  );

  if (coupon) {
    await base44.entities.Coupon.update(coupon.id, { usage_count: (Number(coupon.usage_count) || 0) + 1 });
  }

  if (creator) {
    const clicks = await base44.entities.AffiliateClick.filter({ session_id: sessionId, referral_code: creator.referral_code, converted: false });
    const commission = round2(plan.reduce((s, p) => s + p.creatorCommission, 0));
    if (clicks[0]) {
      await base44.entities.AffiliateClick.update(clicks[0].id, { converted: true, order_number: orderNumber, commission_usd: commission });
    } else {
      await base44.entities.AffiliateClick.create({
        creator_id: creator.id,
        creator_name: creator.name,
        referral_code: creator.referral_code,
        session_id: sessionId,
        converted: true,
        order_number: orderNumber,
        commission_usd: commission,
      });
    }
    await base44.entities.Creator.update(creator.id, {
      total_conversions: (Number(creator.total_conversions) || 0) + 1,
      total_earnings_usd: round2((Number(creator.total_earnings_usd) || 0) + commission),
    });
  }

  const finalOrder = await base44.entities.Order.update(order.id, {
    payment_status: paymentResult.status,
    payment_reference: paymentResult.provider_txn_id || '',
    status: paid ? 'CONFIRMED' : 'PENDING',
  });

  await base44.entities.Notification.create({
    title: `Commande ${orderNumber} confirmée`,
    message: paid
      ? `Votre paiement de ${quote.total} USD a été confirmé. ${plan.length} expédition(s) en préparation.`
      : `Votre commande est enregistrée. Paiement à la livraison.`,
    type: 'order',
    audience: 'customer',
    order_number: orderNumber,
  });

  await base44.entities.AuditLog.create({
    action: 'order.created',
    actor: 'customer',
    entity: 'Order',
    entity_id: order.id,
    reference: orderNumber,
    severity: 'info',
    details: {
      total_usd: quote.total,
      payment_provider: provider.id,
      payment_status: paymentResult.status,
      fulfillments: plan.length,
      affiliate_code: creator?.referral_code || null,
      invoice_number: invoiceNumber,
      vat_usd: vatAmount,
    },
  });

  rememberOrder(finalOrder);

  return { order: finalOrder, fulfillments, shipments, payment: paymentResult, quote, creator };
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
  }
  return true;
}