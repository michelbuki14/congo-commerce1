import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

/**
 * customerAccount — base44/functions/customerAccount/entry.ts
 *
 * Orders and wallets are locked down at the row level: only the signed-in owner,
 * the tenant that sold the order, or a platform admin may read them directly.
 * Storefront customers — most of whom never create an account — read their own
 * records through this function instead.
 *
 * Access is proved by the device session id the order was placed with (the same
 * opaque id the cart and checkout already use) or by the buyer phone recorded on
 * the order, so knowing an order number alone is never enough.
 */

function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

const digits = (value: any) => String(value || "").replace(/\D/g, "");

export default async function (req: Request) {
  try {
    if (req.method !== "POST") return err("Method not allowed", 405);
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const action = String(body.action || "");
    const sessionId = String(body.session_id || "").trim();
    const phone = String(body.phone || "").trim();

    if (action === "orders") {
      if (!sessionId && !phone) return Response.json({ orders: [] });
      const limit = Math.min(Number(body.limit) || 50, 100);
      const [bySession, byPhone] = await Promise.all([
        sessionId ? db.entities.Order.filter({ session_id: sessionId }, "-created_date", limit).catch(() => []) : [],
        phone ? db.entities.Order.filter({ customer_phone: phone }, "-created_date", limit).catch(() => []) : [],
      ]);
      const orders = [...(bySession || []), ...(byPhone || [])].reduce(
        (acc: any[], order: any) => (acc.some((x) => x.id === order.id) ? acc : [...acc, order]),
        [],
      );
      return Response.json({ orders });
    }

    if (action === "order") {
      const orderNumber = String(body.order_number || "").trim().toUpperCase();
      if (!orderNumber) return err("Numéro de commande requis.");
      const rows = await db.entities.Order.filter({ order_number: orderNumber }).catch(() => []);
      const order = rows?.[0];
      if (!order) return err("Commande introuvable.", 404);

      const owns =
        (sessionId && String(order.session_id || "") === sessionId) ||
        (!!phone &&
          [order.customer_phone, order.payment_phone].filter(Boolean).map(digits).includes(digits(phone)));
      if (!owns) return err("Commande introuvable.", 404);

      const fulfillments = await db.entities.FulfillmentOrder
        .filter({ order_id: order.id }, "fulfillment_number", 50)
        .catch(() => []);
      return Response.json({ order, fulfillments: fulfillments || [] });
    }

    if (action === "confirm_fulfillment") {
      const orderNumber = String(body.order_number || "").trim().toUpperCase();
      const fulfillmentId = String(body.fulfillment_id || "").trim();
      if (!orderNumber || !fulfillmentId) return err("Expédition requise.");
      const rows = await db.entities.Order.filter({ order_number: orderNumber }).catch(() => []);
      const order = rows?.[0];
      if (!order) return err("Commande introuvable.", 404);

      const owns =
        (sessionId && String(order.session_id || "") === sessionId) ||
        (!!phone &&
          [order.customer_phone, order.payment_phone].filter(Boolean).map(digits).includes(digits(phone)));
      if (!owns) return err("Commande introuvable.", 404);

      const fulfillment = await db.entities.FulfillmentOrder.get(fulfillmentId).catch(() => null);
      if (!fulfillment || fulfillment.order_id !== order.id) return err("Expédition introuvable.", 404);
      if (fulfillment.source_type !== "international_supplier") return err("Confirmation non requise.", 409);
      if (fulfillment.status !== "AWAITING_CUSTOMER_APPROVAL") return err("Cette expédition est déjà confirmée.", 409);

      // The approval does not dispatch the parcel: it releases it to our own
      // packing bench. Packing is the hand-over point to our delivery team.
      const now = new Date().toISOString();
      const updated = await db.entities.FulfillmentOrder.update(fulfillment.id, {
        status: "PACKING",
        customer_approved_at: now,
        customer_approved_by: phone || sessionId,
      });
      await db.entities.Notification.create({
        tenant_id: fulfillment.tenant_id || order.tenant_id || "",
        tenant_owner_email: fulfillment.tenant_owner_email || order.tenant_owner_email || "",
        title: `Expédition confirmée (${order.order_number})`,
        message: `Vous avez validé la marchandise réceptionnée à ${fulfillment.origin_warehouse || "notre entrepôt"}. Nous emballons votre colis avant de le remettre à notre équipe de livraison vers ${order.city || "votre destination"}.`,
        type: "order",
        audience: "customer",
        order_number: order.order_number,
      });
      await db.entities.AuditLog.create({
        action: "fulfillment.customer_approved",
        actor: "customer",
        entity: "FulfillmentOrder",
        entity_id: updated.id,
        reference: order.order_number,
        details: { warehouse: fulfillment.origin_warehouse || "", approved_by: phone || "session" },
      });
      return Response.json({ fulfillment: updated });
    }

    if (action === "wallet") {
      if (!sessionId) return Response.json({ wallet: null, transactions: [] });
      const rows = await db.entities.Wallet
        .filter({ owner_type: "customer", owner_id: sessionId })
        .catch(() => []);
      const wallet = rows?.[0] || null;
      if (!wallet) return Response.json({ wallet: null, transactions: [] });
      const transactions = await db.entities.WalletTransaction
        .filter({ wallet_id: wallet.id }, "-created_date", 50)
        .catch(() => []);
      return Response.json({ wallet, transactions: transactions || [] });
    }

    if (action === "returns") {
      const limit = Math.min(Number(body.limit) || 30, 100);
      const orderNumbers = sessionId
        ? (await db.entities.Order.filter({ session_id: sessionId }, "-created_date", limit).catch(() => []))
            .map((o: any) => o.order_number)
            .filter(Boolean)
        : [];
      const [byPhone, byOrder] = await Promise.all([
        phone ? db.entities.Return.filter({ customer_phone: phone }, "-created_date", limit).catch(() => []) : [],
        orderNumbers.length
          ? db.entities.Return.filter({ order_number: { $in: orderNumbers } }, "-created_date", limit).catch(() => [])
          : [],
      ]);
      const returns = [...(byPhone || []), ...(byOrder || [])].reduce(
        (acc: any[], row: any) => (acc.some((x) => x.id === row.id) ? acc : [...acc, row]),
        [],
      );
      return Response.json({ returns });
    }

    if (action === "disputes") {
      const limit = Math.min(Number(body.limit) || 30, 100);
      const orderNumbers = sessionId
        ? (await db.entities.Order.filter({ session_id: sessionId }, "-created_date", limit).catch(() => []))
            .map((o: any) => o.order_number)
            .filter(Boolean)
        : [];
      const [byPhone, byOrder] = await Promise.all([
        phone ? db.entities.Dispute.filter({ customer_phone: phone }, "-created_date", limit).catch(() => []) : [],
        orderNumbers.length
          ? db.entities.Dispute.filter({ order_number: { $in: orderNumbers } }, "-created_date", limit).catch(() => [])
          : [],
      ]);
      const disputes = [...(byPhone || []), ...(byOrder || [])].reduce(
        (acc: any[], row: any) => (acc.some((x) => x.id === row.id) ? acc : [...acc, row]),
        [],
      );
      return Response.json({ disputes });
    }

    if (action === "tickets") {
      const limit = Math.min(Number(body.limit) || 30, 100);
      const [bySession, byPhone] = await Promise.all([
        sessionId ? db.entities.SupportTicket.filter({ session_id: sessionId }, "-created_date", limit).catch(() => []) : [],
        phone ? db.entities.SupportTicket.filter({ customer_phone: phone }, "-created_date", limit).catch(() => []) : [],
      ]);
      const tickets = [...(bySession || []), ...(byPhone || [])].reduce(
        (acc: any[], row: any) => (acc.some((x) => x.id === row.id) ? acc : [...acc, row]),
        [],
      );
      return Response.json({ tickets });
    }

    if (action === "seller_disputes") {
      const me = await base44.auth.me().catch(() => null);
      const email = String(me?.email || "").trim();
      if (!email) return Response.json({ disputes: [] });
      const sellers = await db.entities.Seller.filter({ email }, "name", 5).catch(() => []);
      const names = (sellers || []).map((s: any) => s.name).filter(Boolean);
      if (!names.length) return Response.json({ disputes: [] });
      const disputes = await db.entities.Dispute
        .filter({ seller_name: { $in: names } }, "-created_date", 100)
        .catch(() => []);
      return Response.json({ disputes: disputes || [] });
    }

    if (action === "dispute_index") {
      const rows = await db.entities.Dispute.list("-created_date", 500).catch(() => []);
      return Response.json({
        disputes: (rows || []).map((d: any) => ({ seller_name: d.seller_name || "", status: d.status || "" })),
      });
    }

    if (action === "signals") {
      const orderNumber = String(body.order_number || "").trim();
      const couponCode = String(body.coupon_code || "").trim();
      const [byPhone, bySession] = await Promise.all([
        phone ? db.entities.Order.filter({ customer_phone: phone }, "-created_date", 50).catch(() => []) : [],
        sessionId ? db.entities.Order.filter({ session_id: sessionId }, "-created_date", 50).catch(() => []) : [],
      ]);
      const prior = (byPhone || []).filter((o: any) => o.order_number !== orderNumber);
      const priorSession = (bySession || []).filter((o: any) => o.order_number !== orderNumber);
      return Response.json({
        prior_count: prior.length,
        shared_phone: new Set(prior.map((o: any) => o.customer_email).filter(Boolean)).size,
        failed_payments: prior.filter((o: any) => o.payment_status === "FAILED").length,
        refunds: prior.filter((o: any) => ["REFUNDED", "PARTIALLY_REFUNDED"].includes(o.payment_status)).length,
        session_count: priorSession.length,
        coupon_count: couponCode ? prior.filter((o: any) => o.coupon_code === couponCode).length : 0,
      });
    }

    return err("Action inconnue.");
  } catch (error) {
    console.error("customerAccount: unhandled error", error);
    return err("Accès indisponible. Réessayez.", 500);
  }
}