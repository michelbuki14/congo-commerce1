import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";

/**
 * place-order — base44/functions/place-order/entry.ts
 *
 * PUBLIC order tunnel. The storefront calls this instead of writing commerce
 * entities directly, so every money field is recomputed here from server-side
 * records. The client sends only identifiers and customer input — never prices,
 * fees, discounts, payouts, or payment outcomes.
 *
 * What the server decides (client input ignored where it matters):
 * - line prices, supplier costs, stock availability (Product entities)
 * - delivery fee (DeliveryZone by city, or PickupPoint fee — never the client's fee)
 * - coupon validity, minimums, usage limits (Coupon entity, incremented here)
 * - commissions, VAT, CDF conversion (PlatformSetting overrides or built-in defaults)
 * - payment outcome: card stays PENDING for the signed webhook; wallet is
 *   debited only after a real balance check; mobile-money/COD stay PENDING and
 *   UNVERIFIED until money is actually confirmed (confirm-payment function or
 *   the card webhook). No fake transaction ids are ever recorded.
 *
 * Writes use the service role; the browser never touches these entities.
 */

const DEFAULTS = {
  seller_commission_percent: 10,
  creator_commission_percent: 8,
  free_shipping_threshold_usd: 60,
  local_logistics_usd: 2.5,
  vat_rate: 16,
  vat_enabled: true,
  usd_to_cdf_rate: 2800,
};

const PAYMENT_METHODS: Record<string, { name: string; kind: string; requiresPhone: boolean }> = {
  mpesa: { name: "M-Pesa", kind: "mobile_money", requiresPhone: true },
  airtel: { name: "Airtel Money", kind: "mobile_money", requiresPhone: true },
  orange: { name: "Orange Money", kind: "mobile_money", requiresPhone: true },
  card: { name: "Carte bancaire (Visa / Mastercard)", kind: "card", requiresPhone: false },
  cod: { name: "Paiement à la livraison", kind: "cash", requiresPhone: true },
  wallet: { name: "Portefeuille Congo Commerce", kind: "wallet", requiresPhone: false },
};

const COURIERS = [
  { id: "kin_express", name: "Kin Express", code: "KEX", areas: ["Kinshasa", "Lubumbashi", "Goma", "Bukavu", "Matadi", "Kolwezi"], base: 3, perKg: 1, eta: "2-4 jours" },
  { id: "congo_logistique", name: "Congo Logistique", code: "CLG", areas: ["Kinshasa", "Matadi", "Lubumbashi"], base: 4.5, perKg: 0.8, eta: "3-6 jours" },
  { id: "katanga_moves", name: "Katanga Moves", code: "KTM", areas: ["Lubumbashi", "Kolwezi", "Kinshasa"], base: 3.5, perKg: 1.2, eta: "4-7 jours" },
];

function round2(n: unknown): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function orderNumber(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `CC-${stamp}-${Math.floor(1000 + Math.random() * 8999)}`;
}

function formatInvoice(year: number, seq: number): string {
  return `FA-${year}-${String(seq).padStart(5, "0")}`;
}

export default async function (req: Request) {
  try {
    if (req.method !== "POST") return err("Method not allowed", 405);
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    // ---- 0. Validate shape (fail fast, before any write) -------------------
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length || items.length > 50) return err("Le panier est vide ou trop volumineux.");
    for (const i of items) {
      const q = Number(i?.quantity);
      if (!i?.product_id || !Number.isInteger(q) || q < 1 || q > 99) {
        return err("Quantité invalide.");
      }
    }
    const profile = body.profile || {};
    const name = String(profile.name || "").trim();
    const phone = String(profile.phone || body.paymentPhone || "").trim();
    if (!name) return err("Le nom du client est requis.");
    if (!phone) return err("Le numéro de téléphone est requis.");
    const method = PAYMENT_METHODS[String(body.paymentMethodId || "")];
    if (!method) return err("Moyen de paiement inconnu.");
    const chargePhone = String(body.paymentPhone || profile.phone || "").trim();
    if (method.requiresPhone && !chargePhone) return err(`Un numéro de téléphone est requis pour ${method.name}.`);
    if (body.consent?.terms !== true) return err("Vous devez accepter les conditions générales de vente et la politique de confidentialité.");
    const delivery = body.delivery || {};
    if (!["home_delivery", "pickup_point"].includes(delivery.method)) return err("Mode de livraison invalide.");
    const sessionId = String(body.sessionId || "").slice(0, 128);

    // ---- 1. Commercial rules: platform settings override built-in defaults -
    let pricing = { ...DEFAULTS };
    try {
      const rows = await db.entities.PlatformSetting.list().catch(() => []);
      const byKey: Record<string, any> = {};
      for (const r of rows || []) byKey[r.key] = r.value || {};
      pricing = {
        ...DEFAULTS,
        ...(byKey.pricing || {}),
        vat_rate: byKey.tax?.enabled === false ? 0 : Number(byKey.tax?.vat_rate ?? DEFAULTS.vat_rate),
        usd_to_cdf_rate: Number(byKey.country?.usd_to_cdf_rate ?? DEFAULTS.usd_to_cdf_rate) || DEFAULTS.usd_to_cdf_rate,
      };
    } catch { /* defaults stand */ }

    // ---- 2. Reload lines from the database; client prices are discarded ----
    const products = await Promise.all(
      items.map((i: any) => db.entities.Product.get(i.product_id).catch(() => null)),
    );
    const lines: any[] = [];
    for (let idx = 0; idx < items.length; idx += 1) {
      const p = products[idx];
      if (!p || p.status !== "published") return err("Un article de votre panier n’est plus disponible.");
      const quantity = Number(items[idx].quantity);
      if ((p.stock ?? 0) < quantity) return err("Un article de votre panier n’est plus disponible en quantité suffisante.");
      const unit = round2(p.price_usd);
      const cost = round2(p.supplier_price ?? p.price_usd);
      lines.push({
        product: p,
        quantity,
        variant: items[idx].variant || null,
        unit_price_usd: unit,
        line_total_usd: round2(unit * quantity),
        line_cost_usd: round2(cost * quantity),
      });
    }
    const subtotal = round2(lines.reduce((s, l) => s + l.line_total_usd, 0));

    // ---- 3. Coupon: validated AND consumed here, never trusted -------------
    let coupon: any = null;
    if (body.couponCode) {
      const code = String(body.couponCode).toUpperCase().trim();
      const rows = await db.entities.Coupon.filter({ code }).catch(() => []);
      coupon = (rows || []).find((c: any) => c.active !== false) || null;
      if (!coupon) return err("Ce code promo est invalide ou a expiré.");
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return err("Ce code promo est invalide ou a expiré.");
      if (Number(coupon.usage_limit) > 0 && (Number(coupon.usage_count) || 0) >= Number(coupon.usage_limit)) {
        return err("Ce code promo a atteint sa limite d’utilisation.");
      }
      if (subtotal < (Number(coupon.min_order_usd) || 0)) {
        return err(`Ce code promo nécessite un minimum de ${coupon.min_order_usd} USD d’achat.`);
      }
    }
    let discount = 0;
    if (coupon) {
      if (coupon.type === "percent") {
        const raw = round2(subtotal * ((Number(coupon.value) || 0) / 100));
        const cap = Number(coupon.max_discount_usd) || 0;
        discount = cap > 0 ? Math.min(raw, cap) : raw;
      } else if (coupon.type === "fixed") {
        discount = Math.min(round2(Number(coupon.value) || 0), subtotal);
      }
    }

    // ---- 4. Delivery fee recomputed from zones/points, never the client ----
    let shipping = 0;
    let pickupPoint: any = null;
    if (delivery.method === "pickup_point") {
      if (!delivery.pickup_point_id) return err("Point de retrait invalide.");
      pickupPoint = await db.entities.PickupPoint.get(delivery.pickup_point_id).catch(() => null);
      if (!pickupPoint) return err("Point de retrait invalide.");
      shipping = round2(pickupPoint.fee_usd);
    } else {
      const zones = await db.entities.DeliveryZone.filter({ active: true }).catch(() => []);
      const city = String(profile.city || "").trim();
      const zone = (zones || []).find((z: any) => city && z.city === city)
        || (delivery.zone_id ? (zones || []).find((z: any) => z.id === delivery.zone_id) : null)
        || (zones || [])[0];
      shipping = zone ? round2(zone.fee_usd) : round2(pricing.local_logistics_usd);
    }
    const threshold = Number(pricing.free_shipping_threshold_usd) || 0;
    const freeShipping = coupon?.type === "free_shipping" || (threshold > 0 && subtotal - discount >= threshold);
    if (freeShipping) shipping = 0;
    const total = round2(Math.max(0, subtotal - discount) + shipping);

    // ---- 5. VAT split (TTC display) + continuous invoice number ------------
    const vatRate = Number(pricing.vat_rate) || 0;
    const totalHt = vatRate > 0 ? round2(total / (1 + vatRate / 100)) : total;
    const vatAmount = round2(total - totalHt);
    const year = new Date().getFullYear();
    const counterRows = await db.entities.PlatformSetting.filter({ key: "invoice_counter" }).catch(() => []);
    const counter = counterRows?.[0];
    const prevSeq = counter?.value?.year === year ? Number(counter.value.seq) || 0 : 0;
    const invoiceValue = { year, seq: prevSeq + 1 };
    if (counter) {
      await db.entities.PlatformSetting.update(counter.id, { value: invoiceValue });
    } else {
      await db.entities.PlatformSetting.create({ key: "invoice_counter", label: "Compteur de factures", group: "compliance", value: invoiceValue });
    }

    // ---- 6. Unique order number (collision retry, not blind trust) ---------
    let orderNum = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = orderNumber();
      const existing = await db.entities.Order.filter({ order_number: candidate }).catch(() => []);
      if (!existing?.length) { orderNum = candidate; break; }
    }
    if (!orderNum) return err("Impossible de générer un numéro de commande, réessayez.", 503);

    // ---- 7. Creator attribution --------------------------------------------
    let creator: any = null;
    const referralCode = String(body.affiliateCode || "").trim();
    if (referralCode) {
      const rows = await db.entities.Creator.filter({ referral_code: referralCode }).catch(() => []);
      creator = rows?.[0] || null;
    }
    const creatorRate = Number(creator?.commission_rate ?? pricing.creator_commission_percent);

    // ---- 8. Split into fulfillment groups (server-side money math) ---------
    const groups = new Map<string, any>();
    for (const line of lines) {
      const p = line.product;
      const key = p.source_type === "local_seller" ? `seller:${p.seller_id}` : `source:${p.source_type}:${p.supplier_id || "platform"}`;
      if (!groups.has(key)) {
        groups.set(key, {
          source_type: p.source_type, seller_id: p.seller_id || null, seller_name: p.seller_name || null,
          supplier_id: p.supplier_id || null, supplier_name: p.supplier_name || null, lines: [],
        });
      }
      groups.get(key).lines.push(line);
    }
    const tenantOf = (ls: any[]) => ls.map((l) => l.product.tenant_id).find(Boolean) || "";
    const ownerOf = (ls: any[]) => ls.map((l) => l.product.tenant_owner_email).find(Boolean) || "";
    const plan = [...groups.values()].map((g, index) => {
      const sub = round2(g.lines.reduce((s: number, l: any) => s + l.line_total_usd, 0));
      const cost = round2(g.lines.reduce((s: number, l: any) => s + l.line_cost_usd, 0));
      const creatorCommission = creator ? round2(sub * (creatorRate / 100)) : 0;
      let sellerPayout = 0;
      let platformRevenue = 0;
      if (g.source_type === "local_seller") {
        sellerPayout = round2(sub * (1 - (Number(pricing.seller_commission_percent) || 0) / 100));
        platformRevenue = round2(sub - sellerPayout - creatorCommission);
      } else {
        platformRevenue = round2(sub - cost - creatorCommission);
      }
      const weight = round2(g.lines.reduce((s: number, l: any) => s + (l.product.weight_kg || 0.5) * l.quantity, 0));
      const couriers = COURIERS
        .map((c) => {
          if (c.areas.length && profile.city && !c.areas.includes(profile.city)) return null;
          return { courier: c, fee: round2(c.base + c.perKg * Math.max(0, weight)) };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.fee - b.fee);
      const pick = g.source_type === "local_seller" ? couriers[0] || null : null;
      return { ...g, index, sub, cost, creatorCommission, sellerPayout, platformRevenue, weight, pick };
    });

    // ---- 9. Payment outcome — decided here, never asserted by the browser --
    // card → PENDING, the signed Wix webhook completes it.
    // wallet → PENDING unless the balance really covers it (checked here).
    // mobile-money / COD → recorded PENDING + UNVERIFIED. Money that hasn't
    // moved must not mark downstream rows paid, so no fake transaction id.
    let paymentStatus = "PENDING";
    let paymentVerified = false;
    let paymentReference = "";
    if (method.kind === "wallet") {
      const wrows = await db.entities.Wallet.filter({ owner_type: "customer", owner_name: name }).catch(() => []);
      const customerWallet = wrows?.[0];
      const available = round2((customerWallet?.balance_usd || 0) - (customerWallet?.pending_usd || 0));
      if (!customerWallet || round2(total - available) > 0.005) {
        return err("Solde du portefeuille insuffisant pour cette commande.", 409);
      }
    }

    // ---- 10. Persist: order, fulfillments, shipments ------------------------
    const orderTenantId = tenantOf(lines);
    const orderTenantOwner = ownerOf(lines);
    const order = await db.entities.Order.create({
      tenant_id: orderTenantId,
      tenant_owner_email: orderTenantOwner,
      order_number: orderNum,
      session_id: sessionId,
      customer_name: name,
      customer_phone: phone,
      payment_phone: method.kind === "mobile_money" ? chargePhone : "",
      customer_email: String(profile.email || ""),
      city: String(profile.city || ""),
      address: String(delivery.address || profile.address || ""),
      delivery_method: delivery.method,
      pickup_point_id: pickupPoint?.id || "",
      pickup_point_name: pickupPoint?.name || "",
      pickup_code: delivery.method === "pickup_point" ? String(Math.floor(1000 + Math.random() * 9000)) : "",
      notes: String(delivery.notes || ""),
      items: lines.map((l) => ({
        product_id: l.product.id, title: l.product.title, image: l.product.images?.[0] || "",
        quantity: l.quantity, variant: l.variant, unit_price_usd: l.unit_price_usd,
        line_total_usd: l.line_total_usd, source_type: l.product.source_type,
        seller_name: l.product.seller_name || l.product.supplier_name || "",
      })),
      subtotal_usd: subtotal, shipping_usd: shipping, discount_usd: discount,
      total_usd: total, total_cdf: Math.round(total * pricing.usd_to_cdf_rate), currency: "USD",
      payment_method: method.name, payment_provider: String(body.paymentMethodId),
      payment_status: paymentStatus, payment_reference: paymentReference, payment_verified: paymentVerified,
      coupon_code: coupon?.code || "", affiliate_code: creator?.referral_code || "", creator_id: creator?.id || "",
      status: "PENDING", fulfillment_count: plan.length,
      vat_rate: vatRate, vat_usd: vatAmount, total_ht_usd: totalHt,
      invoice_number: formatInvoice(year, invoiceValue.seq),
      consent_terms: true, consent_marketing: body.consent?.marketing === true,
      consent_at: new Date().toISOString(),
    });

    const fulfillmentPayloads = plan.map((p) => {
      const isLocal = p.source_type === "local_seller";
      const tracking = isLocal && p.pick
        ? `${p.pick.courier.code}-${Date.now().toString(36).toUpperCase().slice(-8)}`
        : "";
      return {
        order_id: order.id, order_number: orderNum,
        tenant_id: tenantOf(p.lines) || orderTenantId,
        tenant_owner_email: ownerOf(p.lines) || orderTenantOwner,
        fulfillment_number: `${orderNum}-F${p.index + 1}`,
        source_type: p.source_type, seller_id: p.seller_id || "", seller_name: p.seller_name || "",
        supplier_id: p.supplier_id || "", supplier_name: p.supplier_name || "",
        items: p.lines.map((l: any) => ({
          product_id: l.product.id, title: l.product.title, image: l.product.images?.[0] || "",
          quantity: l.quantity, variant: l.variant, unit_price_usd: l.unit_price_usd,
          line_total_usd: l.line_total_usd, supplier_cost_usd: l.line_cost_usd,
        })),
        subtotal_usd: p.sub,
        shipping_usd: isLocal ? round2(p.pick?.fee || 0) : 0,
        supplier_cost_usd: p.cost, seller_payout_usd: p.sellerPayout,
        creator_commission_usd: p.creatorCommission, platform_revenue_usd: p.platformRevenue,
        status: "PENDING",
        courier_id: isLocal ? p.pick?.courier.id || "kin_express" : "",
        courier_name: isLocal ? p.pick?.courier.name || "Kin Express" : p.supplier_name || "Fournisseur international",
        tracking_number: tracking,
        estimated_delivery: isLocal ? p.pick?.courier.eta || "2-4 jours" : (p.lines[0]?.product?.estimated_delivery || "18 jours"),
        payout_released: false,
      };
    });
    const fulfillments = typeof db.entities.FulfillmentOrder.bulkCreate === "function"
      ? await db.entities.FulfillmentOrder.bulkCreate(fulfillmentPayloads)
      : await Promise.all(fulfillmentPayloads.map((f: any) => db.entities.FulfillmentOrder.create(f)));
    const createdFulfillments = Array.isArray(fulfillments) ? fulfillments : [fulfillments];

    for (const f of createdFulfillments) {
      if (!f?.tracking_number) continue;
      await db.entities.Shipment.create({
        fulfillment_order_id: f.id, order_number: orderNum,
        tenant_id: f.tenant_id || "", tenant_owner_email: f.tenant_owner_email || "",
        courier_id: f.courier_id, courier_name: f.courier_name,
        tracking_number: f.tracking_number, status: f.status,
        events: [{ status: f.status, label: "Étiquette créée", at: new Date().toISOString() }],
      });
    }

    // ---- 11. Ledger ----------------------------------------------------------
    async function postTx(wallet: any, t: any) {
      const updated = await db.entities.Wallet.update(wallet.id, {
        balance_usd: round2((wallet.balance_usd || 0) + (t.direction === "debit" ? -t.amount : t.amount)),
        lifetime_credit_usd: t.direction === "debit" ? wallet.lifetime_credit_usd || 0 : round2((wallet.lifetime_credit_usd || 0) + t.amount),
        lifetime_debit_usd: t.direction === "debit" ? round2((wallet.lifetime_debit_usd || 0) + t.amount) : wallet.lifetime_debit_usd || 0,
        pending_usd: t.status === "pending" && t.direction !== "debit"
          ? round2((wallet.pending_usd || 0) + t.amount) : wallet.pending_usd || 0,
      });
      const tx = await db.entities.WalletTransaction.create({
        wallet_id: wallet.id, tenant_id: wallet.tenant_id || "", tenant_owner_email: wallet.tenant_owner_email || "",
        owner_type: wallet.owner_type, owner_name: wallet.owner_name,
        type: t.type, direction: t.direction, amount_usd: t.amount,
        amount_cdf: Math.round(t.amount * pricing.usd_to_cdf_rate),
        balance_after_usd: updated.balance_usd, currency: "USD",
        description: t.description, reference: t.reference || "",
        order_id: order.id, order_number: orderNum,
        idempotency_key: t.idempotencyKey || "", status: t.status || "posted",
      });
      return { updated, tx };
    }
    async function getWallet(ownerType: string, ownerName: string, ownerEmail: string, ownerId: string, tenant: any = {}) {
      const rows = await db.entities.Wallet.filter({ owner_type: ownerType, owner_name: ownerName }).catch(() => []);
      if (rows?.[0]) return rows[0];
      return db.entities.Wallet.create({
        tenant_id: tenant.tenant_id || "", tenant_owner_email: tenant.tenant_owner_email || "",
        owner_type: ownerType, owner_name: ownerName, owner_email: ownerEmail || "", owner_id: ownerId || "",
        balance_usd: 0,
      });
    }

    // Wallet payment: the debit happens here, after the server-side balance check.
    if (method.kind === "wallet") {
      const customerWallet = await getWallet("customer", name, String(profile.email || ""), sessionId);
      await postTx(customerWallet, {
        type: "DEBIT", direction: "debit", amount: total,
        description: `Achat — commande ${orderNum}`, reference: orderNum, idempotencyKey: `wallet:${orderNum}`,
      });
      paymentStatus = "PAID";
      paymentReference = `WALLET-${orderNum}`;
      paymentVerified = true;
    }

    // Park seller/creator shares as pending (released on delivery, as before).
    // Platform commission posts only for verified money.
    if (paymentVerified) {
      const platformWallet = await getWallet("platform", "Congo Commerce", "finance@congocommerce.cd", "platform");
      const platformRevenue = round2(plan.reduce((s, p) => s + p.platformRevenue, 0));
      if (platformRevenue > 0) {
        await postTx(platformWallet, {
          type: "COMMISSION", direction: "credit", amount: platformRevenue,
          description: `Marge plateforme — commande ${orderNum}`, reference: orderNum, idempotencyKey: `platform:${orderNum}`,
        });
      }
    }
    for (const f of createdFulfillments) {
      if (f.seller_id && Number(f.seller_payout_usd) > 0) {
        const sellerWallet = await getWallet("seller", f.seller_name, "", f.seller_id, { tenant_id: f.tenant_id, tenant_owner_email: f.tenant_owner_email });
        await postTx(sellerWallet, {
          type: "PAYOUT", direction: "credit", amount: Number(f.seller_payout_usd),
          description: `Vente à créditer — ${f.fulfillment_number}`, reference: f.fulfillment_number,
          status: "pending", idempotencyKey: `seller:${f.fulfillment_number}`,
        });
      }
      if (creator && Number(f.creator_commission_usd) > 0) {
        const creatorWallet = await getWallet("creator", creator.name, "", creator.id);
        await postTx(creatorWallet, {
          type: "COMMISSION", direction: "credit", amount: Number(f.creator_commission_usd),
          description: `Commission créateur — ${f.fulfillment_number}`, reference: f.fulfillment_number,
          status: "pending", idempotencyKey: `creator:${f.fulfillment_number}`,
        });
      }
    }

    // ---- 12. Stock, coupon consumption, attribution --------------------------
    const stockPayloads = lines.map((l) => ({
      id: l.product.id,
      stock: Math.max(0, (Number(l.product.stock) || 0) - l.quantity),
      sold_count: (Number(l.product.sold_count) || 0) + l.quantity,
    }));
    if (typeof db.entities.Product.bulkUpdate === "function") {
      await db.entities.Product.bulkUpdate(stockPayloads);
    } else {
      await Promise.all(stockPayloads.map((s: any) => db.entities.Product.update(s.id, { stock: s.stock, sold_count: s.sold_count })));
    }
    if (coupon) {
      await db.entities.Coupon.update(coupon.id, { usage_count: (Number(coupon.usage_count) || 0) + 1 });
    }
    if (creator) {
      const clicks = await db.entities.AffiliateClick.filter({ session_id: sessionId, referral_code: creator.referral_code, converted: false }).catch(() => []);
      const commission = round2(plan.reduce((s, p) => s + p.creatorCommission, 0));
      if (clicks?.[0]) {
        await db.entities.AffiliateClick.update(clicks[0].id, { converted: true, order_number: orderNum, commission_usd: commission });
      } else {
        await db.entities.AffiliateClick.create({
          creator_id: creator.id, creator_name: creator.name, referral_code: creator.referral_code,
          session_id: sessionId, converted: true, order_number: orderNum, commission_usd: commission,
        });
      }
    }

    const finalOrder = await db.entities.Order.update(order.id, {
      payment_status: paymentStatus, payment_reference: paymentReference, payment_verified: paymentVerified,
      status: "PENDING",
    });

    await db.entities.Notification.create({
      tenant_id: orderTenantId, tenant_owner_email: orderTenantOwner,
      title: `Commande ${orderNum} enregistrée`,
      message: paymentVerified
        ? `Votre paiement de ${total} USD a été confirmé. ${plan.length} expédition(s) en préparation.`
        : `Votre commande est enregistrée (${total} USD). Le paiement sera confirmé avant expédition.`,
      type: "order", audience: "customer", order_number: orderNum,
    });
    await db.entities.AuditLog.create({
      action: "order.created", actor: "place-order", entity: "Order", entity_id: order.id,
      reference: orderNum, severity: "info",
      details: {
        total_usd: total, payment_provider: String(body.paymentMethodId),
        payment_status: paymentStatus, payment_verified: paymentVerified,
        fulfillments: plan.length, affiliate_code: creator?.referral_code || null,
        invoice_number: formatInvoice(year, invoiceValue.seq), vat_usd: vatAmount,
      },
    });

    return Response.json({
      order: finalOrder,
      fulfillments: createdFulfillments.map((f: any) => ({ id: f?.id, fulfillment_number: f?.fulfillment_number, status: f?.status })),
      payment: { status: paymentStatus, verified: paymentVerified, total_usd: total },
      quote: { subtotal, discount, shipping, total },
    });
  } catch (e) {
    console.error("place-order: unhandled error", e);
    return err("La commande a échoué. Réessayez.", 500);
  }
}
