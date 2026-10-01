// Place order — server-side checkout tunnel.
// Runs as asServiceRole: all entity writes bypass RLS, so the RLS on Order,
// FulfillmentOrder, Wallet, WalletTransaction, Product (update), Coupon (update),
// AffiliateClick and Shipment (create) can be locked to admin without breaking
// this function.
//
// Self-contained Deno module — the ONLY external import is npm:@base44/sdk.
// No imports from src/lib/ (those use Vite aliases/at-imports that do not
// resolve in Deno).
//
// Every helper below accepts the asServiceRole Base44 client as its first
// parameter. Pure helpers operate on plain JS values; DB helpers use the
// client for all reads and writes.
//
// Checkout.jsx calls placeOrder(base44, <intent>) on the browser client
// (public role). That public call is routed through Base44 Functions to this
// server-side entry point, where createClientFromRequest builds the
// asServiceRole client and passes it to placeOrder(db, ...).
//
// Payment providers: the mock providers below run server-side. Real M-Pesa /
// Airtel / Orange credentials will be added from Deno.env when implemented —
// they never enter the browser bundle.
//
// Session helpers (getSessionId / getReferralCode / rememberOrder /
// readActiveTenantId) are pure stubs here; the real browser versions live in
// src/lib/session.js and src/lib/tenancy.js.
//
import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers — operate on plain JS values, no Base44 SDK, no network calls.
// These mirror the logic from src/lib/{config,logistics,format,tenancy}.js so
// the server function can validate the same business rules without importing
// the Vite app.
// ─────────────────────────────────────────────────────────────────────────────

/** Central Bank of Congo USD→CDF rate (cf. src/lib/config.js).
 * Hard-coded here so the server function is self-contained.
 */
const USD_TO_CDF = 3_000;

function round2(n) {
  if (n == null || isNaN(n)) return 0;
  return Math.round(Number(n) * 100) / 100;
}

function usdToCdf(usd) {
  const u = round2(Number(usd) || 0);
  return round2(u * USD_TO_CDF);
}

function usdDisplay(v) {
  const n = round2(Number(v) || 0);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Pricing config — mirrors src/lib/config.js getPricingConfig()
// ─────────────────────────────────────────────────────────────────────────────

function getPricingConfig() {
  return {
    shippingFlatUsd: 3.5,
    shippingFreeMinUsd: 30,
    platformFeePct: 0.05,
    sellerMinUsd: 1.0,
    creatorCommissionPct: 0.10,
    courierCommissionPct: 0.12,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock helpers
// ─────────────────────────────────────────────────────────────────────────────

function hasStockFor(product, quantity) {
  const s = Number(product?.stock_quantity ?? 0);
  const n = Math.max(1, Number(quantity) || 1);
  return Number.isFinite(s) && s >= n;
}

function quantityWithinStock(product, quantity) {
  const s = product?.stock_quantity;
  if (s == null || s === undefined) {
    return Math.max(1, Number(quantity) || 1);
  }
  return Math.min(
    Math.max(1, Number(quantity) || 1),
    Math.max(0, Number(s)),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Split helpers — mirror src/lib/config.js / orderService.js split logic
// ─────────────────────────────────────────────────────────────────────────────

function splitSells(productPrice, platformFeePct, promoPct, sellerMinUsd) {
  const platform = round2(productPrice * platformFeePct);
  const creator = round2(productPrice * (promoPct ?? 0));
  let seller = round2(productPrice - platform - creator);
  if (seller < sellerMinUsd) seller = round2(sellerMinUsd);
  return { platform, creator, seller };
}

function splitShipping(shippingCdf, courierCommissionPct) {
  const total = round2(shippingCdf);
  if (total <= 0) return { courier: 0, seller: 0 };
  const courier = round2(total * courierCommissionPct);
  const seller = round2(total - courier);
  return { courier, seller };
}

// ─────────────────────────────────────────────────────────────────────────────
// Order number generation
// ─────────────────────────────────────────────────────────────────────────────

const ORDER_PREFIX = "CMD";
let _seq = Math.floor(Math.random() * 900) + 100;
function nextOrderNumber() {
  _seq = (_seq + 1) % 10000;
  const ts = Date.now() % 100000;
  const rnd = Math.floor(Math.random() * 90) + 10;
  return (
    ORDER_PREFIX +
    "-" +
    String(ts) +
    String(_seq).padStart(4, "0") +
    "-" +
    rnd
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coupon helpers — mirrors src/lib/orderService.js findCoupon /
// computeCouponDiscount
// ─────────────────────────────────────────────────────────────────────────────

function findCouponInList(code, coupons) {
  const q = (code || "").toString().trim().toUpperCase();
  if (!q) return null;
  return (
    coupons.find(
      (c) => c.code?.toString().trim().toUpperCase() === q,
    ) ?? null
  );
}

function computeCouponDiscount(coupon, subtotalCdf) {
  const code = (coupon?.code ?? "").toString().trim().toUpperCase();
  if (!code) return { discountCdf: 0, code: null };
  const sp = round2(Number(coupon.site_price ?? 0));
  const cp = round2(Number(coupon.customer_price ?? 0));
  if (sp <= 0 || cp <= 0) return { discountCdf: 0, code: code };
  const factor = subtotalCdf <= 0 ? 1 : Math.min(1, subtotalCdf / sp);
  const discountCdf = round2(cp * factor);
  return { discountCdf, code };
}

// ─────────────────────────────────────────────────────────────────────────────
// Session helpers — pure stubs (real versions are in browser-only src/lib/*.js)
// The server function derives session/tenant from the Base44 request context
// and from authenticated user data, never from localStorage.
// ─────────────────────────────────────────────────────────────────────────────

function genSessionId() {
  return (
    "srv-" + Math.random().toString(36).slice(2, 10) + "-" +
    Date.now().toString(36)
  );
}

/** Stub — real implementation is in src/lib/tenancy.js (browser-only). */
function readActiveTenantId() {
  return null;
}

/** Stub — real implementation is in src/lib/session.js (browser-only). */
function rememberOrder(sessionId, orderId) {
  // no-op server-side; browser remembers via localStorage.
}

/** Stub — real implementation is in src/lib/session.js (browser-only). */
function getReferralCode(sessionId) {
  return null;
}

/** Stub — real implementation is in src/lib/session.js (browser-only). */
function getSessionId() {
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB helpers — all accept the asServiceRole Base44 client as first parameter.
// These replace the Vite app helpers that entry.ts imported from src/lib/*.js.
// Browser callers (Checkout.jsx) use the thin placeOrder(base44, ...) wrapper
// from src/lib/orderService.js; the server function calls placeOrder(db, ...)
// directly.
// ─────────────────────────────────────────────────────────────────────────────

/** Lazily create or return a wallet. `client` is the asServiceRole Base44 client. */
async function getOrCreateWallet(
  client,
  {
    owner_type,
    owner_name,
    owner_email,
    owner_id,
    tenant_id,
  },
) {
  const db = client;
  const rows = await db.entities.Wallet.filter({
    owner_type,
    owner_name,
  });
  if (rows[0]) return rows[0];
  return db.entities.Wallet.create({
    owner_type,
    owner_name,
    owner_email: owner_email ?? "",
    owner_id: owner_id ?? "",
    created_by_id: owner_id ?? "",
    balance_cents: 0,
    pending_cents: 0,
    balance_cdf: 0,
    pending_cdf: 0,
    balance_usd_cents: 0,
    pending_usd_cents: 0,
    currency: "CDF",
    tenant_id: tenant_id ?? "",
    metadata: { ownerType: owner_type, ownerName: owner_name },
  });
}

/** Post a single ledger transaction on a wallet. */
async function postTransaction(client, wallet, payload) {
  const db = client;
  const amount = round2(payload.amount);
  if (amount <= 0) return null;
  const isCredit = payload.direction !== "debit";

  const balance = isCredit
    ? round2((wallet.balance_cents || 0) + amount)
    : round2(Math.max(0, (wallet.balance_cents || 0) - amount));
  const balanceCdf = isCredit
    ? round2((wallet.balance_cdf || 0) + amount * USD_TO_CDF)
    : round2(Math.max(0, (wallet.balance_cdf || 0) - amount * USD_TO_CDF));
  const pending = isCredit
    ? round2((wallet.pending_cents || 0) + amount)
    : round2(Math.max(0, (wallet.pending_cents || 0) - amount));
  const pendingCdf = isCredit
    ? round2((wallet.pending_cdf || 0) + amount * USD_TO_CDF)
    : round2(Math.max(0, (wallet.pending_cdf || 0) - amount * USD_TO_CDF));
  const balanceUsdCents = isCredit
    ? round2((wallet.balance_usd_cents || 0) + (payload.amount_usd || 0))
    : round2(Math.max(0, (wallet.balance_usd_cents || 0) - (payload.amount_usd || 0)));
  const pendingUsdCents = isCredit
    ? round2((wallet.pending_usd_cents || 0) + (payload.amount_usd || 0))
    : round2(Math.max(0, (wallet.pending_usd_cents || 0) - (payload.amount_usd || 0)));

  const updated = await db.entities.Wallet.update(wallet.id, {
    balance_cents: balance,
    pending_cents: pending,
    balance_cdf: balanceCdf,
    pending_cdf: pendingCdf,
    balance_usd_cents: balanceUsdCents,
    pending_usd_cents: pendingUsdCents,
  });

  const transaction = await db.entities.WalletTransaction.create({
    wallet_id: wallet.id,
    type: payload.type ?? "transfer",
    direction: payload.direction ?? "credit",
    amount_cents: amount,
    amount_cdf: round2(amount * USD_TO_CDF),
    amount_usd_cents: round2(payload.amount_usd || 0),
    description: payload.description ?? "",
    detail: payload.detail ?? "",
    reference_type: payload.reference_type ?? "",
    reference_id: payload.reference_id ?? "",
    metadata: payload.metadata ?? {},
  });

  return { wallet: updated, transaction };
}

/** Emit a platform event through the dispatchPlatformEvent server function. */
async function emitEvent(client, name, options = {}) {
  const db = client;
  return db.functions
    .invoke("dispatchPlatformEvent", { name, options })
    .catch((err) => {
      console.error("[place-order] emitEvent failed: " + name + " " + (err?.message ?? err));
      return null;
    });
}

/** Notify fulfillment status change. */
async function notifyFulfillmentStatus(client, fulfillment, status) {
  const db = client;
  try {
    await db.functions.invoke("orderNotifications", {
      action: "fulfillment_status",
      fulfillment_id: fulfillment.id,
      status,
      order_id: fulfillment.order_id,
    });
  } catch (err) {
    console.error("[place-order] notifyFulfillmentStatus: " + (err?.message ?? err));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cart + quote helpers — mirror src/lib/orderService.js loadCartLines /
// buildCheckoutQuote
// ─────────────────────────────────────────────────────────────────────────────

/** Load extended cart lines with product data merged in. */
async function loadCartLines(client, items) {
  const db = client;
  const products = await Promise.all(
    items.map((i) =>
      db.entities.Product.get(i.product_id).catch(() => null),
    ),
  );
  return items.map((item, idx) => {
    const product = products[idx];
    if (!product) {
      return {
        ...item,
        product: null,
        product_name: item.product_name ?? "",
        product_image: item.product_image ?? "",
        unit_price_cents: item.unit_price_cents ?? 0,
        stock_quantity: null,
        tenant_id: item.tenant_id ?? "",
        seller_id: item.seller_id ?? "",
      };
    }
    return {
      ...item,
      product,
      product_name: product.name ?? item.product_name ?? "",
      product_image: product.image_url ?? item.product_image ?? "",
      unit_price_cents: product.price_cents ?? item.unit_price_cents ?? 0,
      stock_quantity: product.stock_quantity ?? null,
      tenant_id: product.tenant_id ?? item.tenant_id ?? "",
      seller_id: product.seller_id ?? item.seller_id ?? "",
    };
  });
}

/** Build the full checkout quote from cart items, delivery and coupon. */
async function buildCheckoutQuote(client, params) {
  const db = client;
  const {
    items = [],
    deliveryMethod,
    deliveryFee_usd = 0,
    couponCode = null,
    coupon = null,
    pricingConfig = null,
  } = params ?? {};

  const cfg = pricingConfig ?? getPricingConfig();
  const rawLines = await loadCartLines(db, items);

  const lines = rawLines.map((l) => {
    const product = l.product;
    if (!product) {
      throw new Error("Product not found: " + l.product_id);
    }
    const qty = quantityWithinStock(product, l.quantity);
    const unit = round2(product.price_cents ?? 0);
    const line = round2(unit * qty);
    const splits = splitSells(line, cfg.platformFeePct, 0, cfg.sellerMinUsd);
    return {
      ...l,
      quantity: qty,
      unit_price_cents: unit,
      line_total_cents: line,
      platform_cents: splits.platform,
      seller_cents: splits.seller,
      creator_cents: 0,
      stock_quantity: product.stock_quantity ?? null,
      tenant_id: product.tenant_id ?? l.tenant_id ?? "",
      seller_id: product.seller_id ?? l.seller_id ?? "",
      weight_kg: Number(product.weight_kg ?? 0) || 0,
    };
  });

  const subtotalCents = round2(
    lines.reduce((a, l) => a + l.line_total_cents, 0),
  );
  const subtotalCdf = round2(subtotalCents * USD_TO_CDF);

  const couponResult = coupon
    ? computeCouponDiscount(coupon, subtotalCdf)
    : computeCouponDiscount(
      findCouponInList(couponCode, []),
      subtotalCdf,
    );

  const activeCoupon = coupon ?? (couponCode ? findCouponInList(couponCode, []) : null);
  const discountResult = activeCoupon
    ? computeCouponDiscount(activeCoupon, subtotalCdf)
    : { discountCdf: 0, code: null };

  const discountCents = round2(
    (discountResult.discountCdf / USD_TO_CDF) * 100,
  );
  const afterDiscountCents = round2(subtotalCents - discountCents);

  const freeThresholdCents = round2(cfg.shippingFreeMinUsd * 100);
  const chargeShipping = afterDiscountCents < freeThresholdCents;
  const shippingUsd = chargeShipping ? cfg.shippingFlatUsd : 0;
  const shippingCents = round2(shippingUsd * 100);
  const shippingCdf = round2(shippingUsd * USD_TO_CDF);

  const platformFeeCents = round2(subtotalCents * cfg.platformFeePct);

  const totalCents = round2(afterDiscountCents + shippingCents);
  const totalUsd = round2(totalCents / 100);

  return {
    lines,
    subtotal_cents: subtotalCents,
    subtotal_cdf: subtotalCdf,
    subtotal_usd: round2(subtotalCents / 100),
    discount_cents: discountCents,
    discount_cdf: discountResult.discountCdf,
    discount_code: discountResult.code,
    coupon: activeCoupon,
    shipping: {
      method: deliveryMethod ?? "standard",
      fee_usd: shippingUsd,
      fee_cents: shippingCents,
      fee_cdf: shippingCdf,
      free: !chargeShipping,
    },
    platform_fee_cents: platformFeeCents,
    platform_fee_usd: round2(platformFeeCents / 100),
    total_cents: totalCents,
    total_usd: totalUsd,
    total_cdf: round2(totalUsd * USD_TO_CDF),
    pricingConfig: cfg,
  };
}

/** Look up a coupon by code from the database. */
async function findCoupon(client, code) {
  const db = client;
  if (!code) return null;
  const rows = await db.entities.Coupon.filter({
    code: String(code).toUpperCase().trim(),
  });
  return rows[0] ?? null;
}

/** Generate a pick-up code (4 digit number). */
function generatePickupCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Generate a tracking number for a shipment. */
function generateTrackingNumber(fulfillmentOrderNumber) {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "CGO-" + fulfillmentOrderNumber + "-" + ts + "-" + rnd;
}

/** Format an invoice number. */
function formatInvoiceNumber(year, seq) {
  return "INV-" + year + "-" + String(seq).padStart(5, "0");
}

/** Guess the courier for a delivery based on city + weight. */
function selectCourierFor(city, weightKg) {
  const couriers = [
    {
      id: "express",
      name: "Express Amazone",
      weightMax: 30,
      cities: ["kinshasa"],
    },
    {
      id: "apart",
      name: "Apart Cargo",
      weightMax: 50,
      cities: ["kinshasa", "matadi"],
    },
    {
      id: "nord",
      name: "Nord Logistique",
      weightMax: 100,
      cities: ["kinshasa", "matadi", "kasangulu"],
    },
  ];
  const key = (city || "").toString().toLowerCase();
  const w = Number(weightKg) || 0;
  return (
    couriers.find(
      (c) =>
        c.cities.some((c2) => c2.toLowerCase() === key) && w <= c.weightMax,
    ) ?? couriers[0]
  );
}

function getCourier(id) {
  const couriers = [
    {
      id: "express",
      name: "Express Amazone",
      weightMax: 30,
      cities: ["kinshasa"],
    },
    {
      id: "apart",
      name: "Apart Cargo",
      weightMax: 50,
      cities: ["kinshasa", "matadi"],
    },
    {
      id: "nord",
      name: "Nord Logistique",
      weightMax: 100,
      cities: ["kinshasa", "matadi", "kasangulu"],
    },
  ];
  return couriers.find((c) => c.id === id) ?? couriers[0];
}

/** Resolve a tenant id for a seller by slug. */
async function resolveTenantId(client, slug) {
  const db = client;
  if (!slug) return null;
  const rows = await db.entities.Tenant.filter({
    slug: String(slug).toLowerCase(),
  });
  return rows[0]?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main engine — placeOrder(db, params)
// db: asServiceRole Base44 client (all writes bypass RLS).
// params: the checkout intent from the browser/tenant.
// ─────────────────────────────────────────────────────────────────────────────

export async function placeOrder(db, params) {
  const {
    items = [],
    profile = {},
    delivery = {},
    couponCode = null,
    paymentMethodId = null,
    paymentPhone = null,
    consent = {},
  } = params ?? {};

  const cfg = getPricingConfig();

  const lines = await loadCartLines(db, items);
  if (lines.length === 0) {
    throw new Error("Cart is empty");
  }

  const validatedLines = lines.map((line) => {
    const product = line.product;
    if (!product) {
      throw new Error("Product not found: " + line.product_id);
    }
    if (!hasStockFor(product, line.quantity)) {
      throw new Error(
        "Plus de stock pour " +
          product.name +
          " (disponible: " +
          (product.stock_quantity ?? 0) +
          ", demandé: " +
          line.quantity +
          ")",
      );
    }
    const qty = quantityWithinStock(product, line.quantity);
    const unitPrice = round2(product.price_cents ?? 0);
    const line_total_cents = round2(unitPrice * qty);
    const seller_id = product.seller_id ?? line.seller_id ?? "";
    const tenant_id = product.tenant_id ?? line.tenant_id ?? "";
    const splits = splitSells(
      line_total_cents,
      cfg.platformFeePct,
      0,
      cfg.sellerMinUsd,
    );
    return {
      ...line,
      quantity: qty,
      unit_price_cents: unitPrice,
      line_total_cents,
      platform_cents: splits.platform,
      seller_cents: splits.seller,
      creator_cents: splits.creator,
      tenant_id,
      seller_id,
    };
  });

  const subtotal_cents = round2(
    validatedLines.reduce((a, l) => a + l.line_total_cents, 0),
  );
  const subtotal_cdf = round2(subtotal_cents * USD_TO_CDF);
  const subtotal_usd = round2(subtotal_cents / 100);

  let couponRecord = null;
  let discount_cents = 0;
  let discount_cdf = 0;
  let discount_code = null;
  if (couponCode) {
    couponRecord = await findCoupon(db, couponCode);
    if (couponRecord) {
      const result = computeCouponDiscount(couponRecord, subtotal_cdf);
      discount_cdf = result.discountCdf;
      discount_code = result.code;
      discount_cents = round2((discount_cdf / USD_TO_CDF) * 100);
    }
  }

  const afterDiscount_cents = round2(subtotal_cents - discount_cents);
  const afterDiscount_cdf = round2(subtotal_cdf - discount_cdf);

  const shippingMethod = delivery?.method ?? "standard";
  const freeThreshold_cents = round2(cfg.shippingFreeMinUsd * 100);
  const chargeShipping = afterDiscount_cents < freeThreshold_cents;
  const shipping_fee_usd = chargeShipping ? cfg.shippingFlatUsd : 0;
  const shipping_fee_cents = round2(shipping_fee_usd * 100);
  const shipping_fee_cdf = round2(shipping_fee_usd * USD_TO_CDF);

  const total_cents = round2(afterDiscount_cents + shipping_fee_cents);
  const total_usd = round2(total_cents / 100);
  const total_cdf = round2(total_usd * USD_TO_CDF);

  const platform_fee_cents = round2(subtotal_cents * cfg.platformFeePct);
  const platform_fee_usd = round2(platform_fee_cents / 100);

  const sessionId = genSessionId();
  const userEmail = profile?.email ?? "";
  const userPhone = profile?.phone ?? paymentPhone ?? "";

  let tenant_id = readActiveTenantId();
  if (!tenant_id) {
    const firstTenant = validatedLines.find((l) => l.tenant_id);
    tenant_id = firstTenant?.tenant_id ?? "";
  }

  const orderNumber = nextOrderNumber();

  const sellerIds = Array.from(
    new Set(validatedLines.map((l) => l.seller_id).filter(Boolean)),
  );
  const tenantIds = Array.from(
    new Set(validatedLines.map((l) => l.tenant_id).filter(Boolean)),
  );
  const totalWeight = round2(
    validatedLines.reduce((a, l) => a + l.weight_kg, 0),
  );

  const couponPayload = couponRecord
    ? {
        coupon_id: couponRecord.id,
        code: couponRecord.code,
        site_price: couponRecord.site_price,
        customer_price: couponRecord.customer_price,
        type: couponRecord.type,
        use_count: round2(Number(couponRecord.use_count ?? 0) + 1),
      }
    : {};

  const orderPayload = {
    order_number: orderNumber,
    status: "PENDING_PAYMENT",
    payment_method: paymentMethodId ?? "",
    payment_status: "PENDING",
    payer_email: userEmail,
    payer_phone: userPhone,
    subtotal_cents: subtotal_cents,
    subtotal_cdf: subtotal_cdf,
    discount_cents: discount_cents,
    discount_cdf: discount_cdf,
    discount_code: discount_code ?? "",
    platform_fee_cents: platform_fee_cents,
    platform_fee_cdf: round2(platform_fee_cents * USD_TO_CDF),
    total_cents,
    total_cdf,
    total_usd,
    currency: "CDF",
    items: validatedLines.map((l) => ({
      product_id: l.product_id,
      product_name: l.product_name,
      unit_price_cents: l.unit_price_cents,
      quantity: l.quantity,
      line_total_cents: l.line_total_cents,
      seller_id: l.seller_id,
      tenant_id: l.tenant_id,
      platform_cents: l.platform_cents,
      seller_cents: l.seller_cents,
      creator_cents: l.creator_cents,
    })),
    shipping_method: shippingMethod,
    shipping_fee_cents: shipping_fee_cents,
    shipping_fee_cdf: shipping_fee_cdf,
    total_weight_kg: totalWeight,
    tenant_id,
    seller_ids: sellerIds,
    tenant_ids: tenantIds,
    session_id: sessionId,
    coupon: couponPayload,
    consent: {
      terms: !!consent?.terms,
      marketing: !!consent?.marketing,
    },
    source: "web",
    customer_email: userEmail ?? "",
    created_by_id: userEmail ?? "",
    tenant_owner_email: userEmail ?? "",
    metadata: {
      buyer_name: profile?.name ?? "",
      buyer_phone: userPhone,
      items_count: validatedLines.length,
    },
  };

  const order = await db.entities.Order.create(orderPayload);
  if (!order) {
    throw new Error("Failed to create Order");
  }

  const fulfillmentOrders = [];
  const shipments = [];
  const courier = selectCourierFor(
    delivery?.address?.city ?? "kinshasa",
    totalWeight,
  );
  for (const seller_id of sellerIds) {
    const sellerLines = validatedLines.filter(
      (l) => l.seller_id === seller_id,
    );
    const sellerSubtotal_cents = round2(
      sellerLines.reduce((a, l) => a + l.line_total_cents, 0),
    );
    const sellerShippingCents = round2(
      (shipping_fee_cents * sellerSubtotal_cents) /
        (subtotal_cents || 1),
    );
    const sellerPlatformFeeCents = round2(
      (platform_fee_cents * sellerSubtotal_cents) /
        (subtotal_cents || 1),
    );
    const foNumber =
      "FO-" + orderNumber + "-" + (seller_id?.toString()?.slice(0, 8) ?? "SELL");
    const foPayload = {
      order_number: orderNumber,
      fulfillment_order_number: foNumber,
      status: "RELEASED",
      order_id: order.id,
      seller_id,
      tenant_id: sellerLines[0]?.tenant_id ?? tenant_id,
      subtotal_cents: sellerSubtotal_cents,
      shipping_fee_cents: sellerShippingCents,
      platform_fee_cents: sellerPlatformFeeCents,
      platform_fee_cdf: round2(sellerPlatformFeeCents * USD_TO_CDF),
      total_cents: round2(sellerSubtotal_cents + sellerShippingCents),
      items: sellerLines.map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
        unit_price_cents: l.unit_price_cents,
        line_total_cents: l.line_total_cents,
        platform_cents: l.platform_cents,
        seller_cents: l.seller_cents,
      })),
      created_by_id: userEmail ?? "",
    };
    const fo = await db.entities.FulfillmentOrder.create(foPayload);
    if (fo) fulfillmentOrders.push(fo);
    const pickupCode = generatePickupCode();
    const trackingNumber = generateTrackingNumber(foNumber);
    const shipmentPayload = {
      fulfillment_order_id: fo.id,
      status: "PREPARING",
      tracking_number: trackingNumber,
      carrier: courier.name,
      courier_id: courier.id,
      pickup_code: pickupCode,
      recipient_name: profile?.name ?? "",
      recipient_phone: userPhone,
      address_text: (delivery?.address ?? "").toString(),
      estimated_delivery_days: 3,
      weight_kg: totalWeight,
      created_by_id: userEmail ?? "",
    };
    const shipment = await db.entities.Shipment.create(shipmentPayload);
    if (shipment) shipments.push(shipment);
  }

  if (couponRecord && couponRecord.id) {
    try {
      await db.entities.Coupon.update(couponRecord.id, {
        use_count: round2(Number(couponRecord.use_count ?? 0) + 1),
      });
    } catch (err) {
      console.warn(
        "[place-order] coupon use_count bump failed: " +
          (err?.message ?? err),
      );
    }
  }

  const referralCode = getReferralCode(sessionId);
  if (referralCode) {
    try {
      await db.entities.AffiliateClick.create({
        code: referralCode,
        order_id: order.id,
        order_number: orderNumber,
        amount_cents: total_cents,
        status: "claimed",
        metadata: { session_id: sessionId },
      });
    } catch (err) {
      console.warn(
        "[place-order] affiliate claim failed: " + (err?.message ?? err),
      );
    }
  }

  for (const seller_id of sellerIds) {
    const sellerLines = validatedLines.filter(
      (l) => l.seller_id === seller_id,
    );
    const sellerSubtotal_cents = round2(
      sellerLines.reduce((a, l) => a + l.line_total_cents, 0),
    );
    const sellerShippingCents = round2(
      (shipping_fee_cents * sellerSubtotal_cents) /
        (subtotal_cents || 1),
    );
    const sellerPlatformFeeCents = round2(
      (platform_fee_cents * sellerSubtotal_cents) /
        (subtotal_cents || 1),
    );
    const sellerNet_cents = round2(
      sellerSubtotal_cents + sellerShippingCents - sellerPlatformFeeCents,
    );
    if (sellerNet_cents <= 0) continue;

    const sellerWallet = await getOrCreateWallet(db, {
      owner_type: "seller",
      owner_name: profile?.name ?? "Vendeur",
      owner_email: userEmail,
      owner_id: seller_id,
      tenant_id,
    });
    await postTransaction(db, sellerWallet, {
      type: "seller_credit",
      direction: "credit",
      amount: sellerNet_cents,
      amount_cdf: round2(sellerNet_cents * USD_TO_CDF),
      amount_usd: round2(sellerNet_cents / 100),
      description: "Vente/" + orderNumber,
      detail: { order_number: orderNumber, seller_id },
      reference_type: "order",
      reference_id: order.id,
      metadata: { seller_id, tenant_id },
    });
  }

  const platformWallet = await getOrCreateWallet(db, {
    owner_type: "platform",
    owner_name: "Congo Commerce Platform",
    owner_email: "platform@congo-commerce.com",
    owner_id: "platform",
    tenant_id,
  });
  await postTransaction(db, platformWallet, {
    type: "platform_fee",
    direction: "credit",
    amount: platform_fee_cents,
    amount_cdf: round2(platform_fee_cents * USD_TO_CDF),
    amount_usd: platform_fee_usd,
    description: "Frais plateforme/" + orderNumber,
    reference_type: "order",
    reference_id: order.id,
    metadata: { tenant_id },
  });

  const creatorIds = Array.from(
    new Set(
      validatedLines
        .map((l) => l.product?.creator_id)
        .filter(Boolean),
    ),
  );
  for (const creator_id of creatorIds) {
    const creatorLines = validatedLines.filter(
      (l) => l.product?.creator_id === creator_id,
    );
    const creatorTotal_cents = round2(
      creatorLines.reduce((a, l) => a + l.creator_cents, 0),
    );
    if (creatorTotal_cents <= 0) continue;
    const creatorWallet = await getOrCreateWallet(db, {
      owner_type: "creator",
      owner_name: "Créateur",
      owner_email: userEmail,
      owner_id: creator_id,
      tenant_id,
    });
    await postTransaction(db, creatorWallet, {
      type: "creator_commission",
      direction: "credit",
      amount: creatorTotal_cents,
      amount_cdf: round2(creatorTotal_cents * USD_TO_CDF),
      amount_usd: round2(creatorTotal_cents / 100),
      description: "Commission créateur/" + orderNumber,
      reference_type: "order",
      reference_id: order.id,
      metadata: { creator_id, tenant_id },
    });
  }

  const courierId = courier?.id;
  if (courierId) {
    const courierEarningsCents = round2(
      shipping_fee_cents * cfg.courierCommissionPct,
    );
    if (courierEarningsCents > 0) {
      const courierWallet = await getOrCreateWallet(db, {
        owner_type: "courier",
        owner_name: courier.name,
        owner_email: "",
        owner_id: courierId,
        tenant_id,
      });
      await postTransaction(db, courierWallet, {
        type: "courier_earning",
        direction: "credit",
        amount: courierEarningsCents,
        amount_cdf: round2(courierEarningsCents * USD_TO_CDF),
        amount_usd: round2(courierEarningsCents / 100),
        description: "Livraison/" + orderNumber,
        reference_type: "fulfillment",
        reference_id: fulfillmentOrders[0]?.id ?? "",
        metadata: { courier_id: courierId, tenant_id },
      });
    }
  }

  for (const line of validatedLines) {
    const product = line.product;
    if (!product?.id) continue;
    const currentStock = Number(product.stock_quantity ?? 0);
    const newStock = Math.max(0, currentStock - line.quantity);
    try {
      await db.entities.Product.update(product.id, {
        stock_quantity: newStock,
        sold_count: round2(
          Number(product.sold_count ?? 0) + line.quantity,
        ),
      });
    } catch (err) {
      console.warn(
        "[place-order] stock update failed for " +
          product.id +
          ": " +
          (err?.message ?? err),
      );
    }
  }

  const finalOrder = await db.entities.Order.get(order.id);
  if (!finalOrder) throw new Error("Order record missing after create");

  await emitEvent(db, "order_placed", {
    order_id: order.id,
    order_number: orderNumber,
    amount_cents: total_cents,
    tenant_id,
    seller_ids: sellerIds,
    items_count: validatedLines.length,
  });

  await notifyFulfillmentStatus(
    db,
    fulfillmentOrders[0] ?? {},
    "RELEASED",
  );

  try {
    const flaggedOrders = await db.entities.Order.filter({
      status: "PENDING_PAYMENT",
      created_at: {
        gte: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
    });
    const riskCount = flaggedOrders.length;
    if (riskCount > 5) {
      await emitEvent(db, "order_risk_review", {
        order_id: order.id,
        order_number: orderNumber,
        reason: "high_volume_pending",
      });
    }
  } catch (err) {
    console.warn("[place-order] risk check skipped: " + (err?.message ?? err));
  }

  rememberOrder(sessionId, order.id);

  return {
    order,
    fulfillments: fulfillmentOrders,
    shipments,
    total_cents,
    total_cdf,
    total_usd,
    platform_fee_cents,
    platform_fee_usd,
    coupon: couponRecord,
    shipping: {
      method: shippingMethod,
      fee_cents: shipping_fee_cents,
      fee_cdf: shipping_fee_cdf,
      fee_usd: shipping_fee_usd,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Deno HTTP entry point — called by Base44 Functions runtime
// ─────────────────────────────────────────────────────────────────────────────

export default async function (request) {
  const url = new URL(request.url);

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const base44 = createClientFromRequest(request);
    const db = base44.asServiceRole;

    let user = null;
    try {
      user = await base44.auth.me().catch(() => null);
    } catch {
      user = null;
    }

    let intent = null;
    try {
      const body = await request.json();
      intent = body?.params ?? body ?? null;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!intent || typeof intent !== "object") {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await placeOrder(db, intent);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[place-order] Unhandled error:", error);
    return new Response(
      JSON.stringify({
        error: error?.message ?? "Internal server error",
        status: "failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

