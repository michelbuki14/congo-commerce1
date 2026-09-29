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

/** True when the order belongs to this device session or the buyer phone. */
const ownsOrder = (order: any, sessionId: string, phone: string) =>
  (!!sessionId && String(order?.session_id || "") === sessionId) ||
  (!!phone &&
    [order?.customer_phone, order?.payment_phone].filter(Boolean).map(digits).includes(digits(phone)));

const ref = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

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
      const [byTenant, byName] = await Promise.all([
        db.entities.Dispute.filter({ tenant_owner_email: email }, "-created_date", 100).catch(() => []),
        names.length
          ? db.entities.Dispute.filter({ seller_name: { $in: names } }, "-created_date", 100).catch(() => [])
          : [],
      ]);
      const disputes = [...(byTenant || []), ...(byName || [])].reduce(
        (acc: any[], d: any) => (acc.some((x) => x.id === d.id) ? acc : [...acc, d]),
        [],
      );
      return Response.json({ disputes });
    }

    if (action === "seller_threads") {
      const me = await base44.auth.me().catch(() => null);
      const email = String(me?.email || "").trim();
      const isAdmin = String(me?.role || "") === "admin";
      if (isAdmin) {
        const all = await db.entities.SupportTicket.list("-created_date", 100).catch(() => []);
        return Response.json({ tickets: all || [] });
      }
      if (!email) return Response.json({ tickets: [] });
      const sellers = await db.entities.Seller.filter({ email }, "name", 5).catch(() => []);
      const names = (sellers || []).map((s: any) => s.name).filter(Boolean);
      const [byTenant, byName] = await Promise.all([
        db.entities.Dispute.filter({ tenant_owner_email: email }, "-created_date", 100).catch(() => []),
        names.length
          ? db.entities.Dispute.filter({ seller_name: { $in: names } }, "-created_date", 100).catch(() => [])
          : [],
      ]);
      const orderNumbers = [...new Set([...(byTenant || []), ...(byName || [])].map((d: any) => d.order_number).filter(Boolean))];
      if (!orderNumbers.length) return Response.json({ tickets: [] });
      const tickets = await db.entities.SupportTicket
        .filter({ order_number: { $in: orderNumbers } }, "-created_date", 100)
        .catch(() => []);
      return Response.json({ tickets: tickets || [] });
    }

    if (action === "create_dispute") {
      const orderNumber = String(body.order_number || "").trim().toUpperCase();
      if (!orderNumber) return err("Numéro de commande requis.");
      const rows = await db.entities.Order.filter({ order_number: orderNumber }).catch(() => []);
      const order = rows?.[0];
      if (!order || !ownsOrder(order, sessionId, phone)) return err("Commande introuvable.", 404);

      const dispute = await db.entities.Dispute.create({
        tenant_id: order.tenant_id || "",
        tenant_owner_email: order.tenant_owner_email || "",
        order_number: orderNumber,
        customer_name: order.customer_name || "Client",
        customer_phone: phone || order.customer_phone || "",
        seller_name: order.items?.[0]?.seller_name || "",
        type: String(body.type || "not_received"),
        description: String(body.description || ""),
        amount_usd: Number(order.total_usd) || 0,
        status: "open",
        priority: "normal",
      });
      await db.entities.Notification.create({
        tenant_id: order.tenant_id || "",
        tenant_owner_email: order.tenant_owner_email || "",
        title: "Nouveau litige ouvert",
        message: `${order.customer_name || "Un client"} ouvre un litige sur ${orderNumber}.`,
        type: "order",
        audience: "admin",
        order_number: orderNumber,
      }).catch(() => null);
      return Response.json({ dispute });
    }

    if (action === "create_return") {
      const orderNumber = String(body.order_number || "").trim().toUpperCase();
      if (!orderNumber) return err("Numéro de commande requis.");
      const rows = await db.entities.Order.filter({ order_number: orderNumber }).catch(() => []);
      const order = rows?.[0];
      if (!order || !ownsOrder(order, sessionId, phone)) return err("Commande introuvable.", 404);

      const items = Array.isArray(body.items) && body.items.length
        ? body.items
        : [{
            product_id: body.product_id || "",
            product_title: body.product_title || "",
            refund_amount_usd: Number(body.refund_amount_usd) || 0,
          }];

      const created = [];
      for (const item of items) {
        created.push(await db.entities.Return.create({
          tenant_id: order.tenant_id || "",
          tenant_owner_email: order.tenant_owner_email || "",
          return_number: ref("RET"),
          order_id: order.id,
          order_number: orderNumber,
          customer_name: order.customer_name || "Client",
          customer_phone: phone || order.customer_phone || "",
          product_id: item.product_id || "",
          product_title: item.product_title || "",
          reason: String(body.reason || "not_received"),
          description: String(body.description || ""),
          refund_amount_usd: Number(item.refund_amount_usd) || 0,
          status: "requested",
        }));
      }
      await db.entities.Notification.create({
        tenant_id: order.tenant_id || "",
        tenant_owner_email: order.tenant_owner_email || "",
        title: "Nouvelle demande de retour",
        message: `${order.customer_name || "Un client"} demande le retour de ${created.length} article(s) sur ${orderNumber}.`,
        type: "order",
        audience: "admin",
        order_number: orderNumber,
      }).catch(() => null);
      return Response.json({ returns: created });
    }

    if (action === "create_ticket") {
      const subject = String(body.subject || "").trim();
      const message = String(body.message || "").trim();
      if (!subject || !message) return err("Objet et message requis.");
      const name = String(body.name || "").trim() || "Client";
      const category = String(body.category || "order");
      const ticket = await db.entities.SupportTicket.create({
        ticket_number: ref("TCK"),
        subject,
        category,
        status: "open",
        priority: category === "payment" ? "high" : "normal",
        customer_name: name,
        customer_email: String(body.email || "").trim(),
        customer_phone: phone,
        order_number: String(body.order_number || "").trim().toUpperCase(),
        session_id: sessionId,
        messages: [{ author: "customer", name, body: message, at: new Date().toISOString() }],
      });
      await db.entities.Notification.create({
        title: "Nouveau ticket support",
        message: `${name} — ${subject} (${ticket.ticket_number})`,
        type: "system",
        audience: "admin",
        order_number: ticket.order_number || "",
      }).catch(() => null);
      return Response.json({ ticket });
    }

    if (action === "append_ticket_message") {
      const ticketId = String(body.ticket_id || "").trim();
      const text = String(body.message || "").trim();
      if (!ticketId || !text) return err("Message requis.");
      const ticket = await db.entities.SupportTicket.get(ticketId).catch(() => null);
      if (!ticket) return err("Ticket introuvable.", 404);
      const owns =
        (!!sessionId && String(ticket.session_id || "") === sessionId) ||
        (!!phone && !!ticket.customer_phone && digits(ticket.customer_phone) === digits(phone));
      if (!owns) return err("Ticket introuvable.", 404);
      const updated = await db.entities.SupportTicket.update(ticket.id, {
        messages: [
          ...(ticket.messages || []),
          { author: "customer", name: ticket.customer_name || "Client", body: text, at: new Date().toISOString() },
        ],
        status: "open",
      });
      return Response.json({ ticket: updated });
    }

    if (action === "case_message" || action === "set_dispute_status") {
      const me = await base44.auth.me().catch(() => null);
      const email = String(me?.email || "").trim();
      const isAdmin = String(me?.role || "") === "admin";
      const orderNumber = String(body.order_number || "").trim().toUpperCase();
      if (!orderNumber) return err("Commande requise.");
      const rows = await db.entities.Dispute.filter({ order_number: orderNumber }).catch(() => []);
      const dispute = rows?.[0];
      if (!dispute) return err("Litige introuvable.", 404);

      let allowed = isAdmin || (!!email && String(dispute.tenant_owner_email || "") === email);
      if (!allowed && email) {
        const sellers = await db.entities.Seller.filter({ email }, "name", 5).catch(() => []);
        allowed = (sellers || []).some((s: any) => s.name && s.name === dispute.seller_name);
      }
      if (!allowed) return err("Accès refusé.", 403);

      if (action === "set_dispute_status") {
        const status = String(body.status || "").trim();
        if (!status) return err("Statut requis.");
        const updated = await db.entities.Dispute.update(dispute.id, {
          status,
          admin_notes: body.note !== undefined ? String(body.note) : dispute.admin_notes || "",
        });
        await db.entities.AuditLog.create({
          action: `dispute.${status}`,
          actor: isAdmin ? "admin" : "mediation",
          entity: "Dispute",
          entity_id: dispute.id,
          reference: orderNumber,
          severity: status === "resolved_seller" ? "warning" : "info",
          details: { amount_usd: dispute.amount_usd, reviewer: email },
        }).catch(() => null);
        return Response.json({ dispute: updated });
      }

      const entry = {
        author: String(body.author || (isAdmin ? "admin" : "seller")),
        author_name: String(body.author_name || ""),
        body: String(body.body || ""),
        resolution: String(body.resolution || ""),
        at: new Date().toISOString(),
        file_uri: body.file_uri || undefined,
        attachment_name: body.attachment_name || undefined,
      };
      const ticketId = String(body.ticket_id || "").trim();
      if (ticketId) {
        const ticket = await db.entities.SupportTicket.get(ticketId).catch(() => null);
        if (!ticket) return err("Fil introuvable.", 404);
        const updated = await db.entities.SupportTicket.update(ticket.id, {
          messages: [...(ticket.messages || []), entry],
          status: "open",
        });
        return Response.json({ ticket: updated });
      }
      const ticket = await db.entities.SupportTicket.create({
        ticket_number: ref("DR"),
        subject: `Résolution de litige — ${orderNumber}`,
        category: "order",
        status: "open",
        priority: "high",
        order_number: orderNumber,
        customer_name: dispute.customer_name || "",
        customer_phone: dispute.customer_phone || "",
        assigned_to: isAdmin ? "mediation" : "vendeur",
        messages: [entry],
      });
      return Response.json({ ticket });
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