import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

/**
 * customerAccount — base44/functions/customerAccount/entry.ts
 *
 * Orders and wallets are locked down at the row level: only the signed-in owner,
 * the tenant that sold the order, or a platform admin may read them directly.
 * The storefront reads its own records through this function instead.
 *
 * Every action runs for the signed-in account, and ownership is proved by that
 * account's identity — the email recorded on the order, or the account that
 * created the row. A phone number or device session the caller simply states is
 * never accepted as proof of ownership: a phone number is semi-public, so it
 * would let anyone who knows it read a stranger's orders, returns, disputes and
 * tickets. Because this function acts with the service role, it establishes for
 * itself who is calling and scopes every query to that account.
 */

function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

const lower = (value: any) => String(value || "").trim().toLowerCase();

const ref = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

const dedupe = (rows: any[]) =>
  (rows || []).reduce((acc: any[], row: any) => (acc.some((x) => x.id === row.id) ? acc : [...acc, row]), []);

/** The only statuses a case may be ruled into (the entity's own enum). */
const DISPUTE_STATUSES = new Set([
  "open",
  "investigating",
  "resolved_buyer",
  "resolved_seller",
  "escalated",
  "closed",
]);

/** The resolutions a shop owner may propose on a case. */
const RESOLUTION_IDS = new Set(["refund", "replacement", "goodwill", "reject"]);

export default async function (req: Request) {
  try {
    if (req.method !== "POST") return err("Method not allowed", 405);
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    // ---- Trust boundary -----------------------------------------------------
    const user = await base44.auth.me().catch(() => null);
    if (!user) return err("Connectez-vous pour accéder à votre compte.", 401);
    const email = lower(user.email);
    const isAdmin = String(user.role || "") === "admin";

    const action = String(body.action || "");
    const sessionId = String(body.session_id || "").trim();
    const phone = String(body.phone || "").trim();

    /** The order belongs to the signed-in account (an admin may see any order). */
    const ownOrder = (order: any) =>
      !!order &&
      (isAdmin ||
        String(order.created_by_id || "") === String(user.id || "") ||
        (!!email && lower(order.customer_email) === email));

    /** Orders the signed-in account may see. */
    async function myOrders(limit: number) {
      if (isAdmin) return (await db.entities.Order.list("-created_date", limit).catch(() => [])) || [];
      const [byEmail, byId] = await Promise.all([
        email ? db.entities.Order.filter({ customer_email: user.email }, "-created_date", limit).catch(() => []) : [],
        user.id ? db.entities.Order.filter({ created_by_id: user.id }, "-created_date", limit).catch(() => []) : [],
      ]);
      return dedupe([...(byEmail || []), ...(byId || [])]);
    }

    async function myOrderNumbers(limit: number) {
      return (await myOrders(limit)).map((o: any) => o.order_number).filter(Boolean);
    }

    if (action === "orders") {
      const limit = Math.min(Number(body.limit) || 50, 100);
      return Response.json({ orders: await myOrders(limit) });
    }

    if (action === "order") {
      const orderNumber = String(body.order_number || "").trim().toUpperCase();
      if (!orderNumber) return err("Numéro de commande requis.");
      const rows = await db.entities.Order.filter({ order_number: orderNumber }).catch(() => []);
      const order = rows?.[0];
      if (!ownOrder(order)) return err("Commande introuvable.", 404);

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
      if (!ownOrder(order)) return err("Commande introuvable.", 404);

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
        customer_approved_by: user.email || phone || sessionId,
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
        details: { warehouse: fulfillment.origin_warehouse || "", approved_by: user.email || "session" },
      });
      return Response.json({ fulfillment: updated });
    }

    if (action === "wallet") {
      // The account's own wallet — found by the email it is held under, or by
      // the account that created it. A device session id is never accepted as a
      // key: it is a caller-supplied string that anyone who guesses it could
      // repeat, so it proves nothing and may not open a wallet. Every wallet a
      // real flow creates carries the owner's email (checkout, refunds), so
      // nothing legitimate is lost by ignoring it.
      const [byEmail, byOwner] = await Promise.all([
        email ? db.entities.Wallet.filter({ owner_type: "customer", owner_email: user.email }).catch(() => []) : [],
        user.id ? db.entities.Wallet.filter({ owner_type: "customer", created_by_id: user.id }).catch(() => []) : [],
      ]);
      const wallet =
        (byEmail || []).find((w: any) => w.status !== "frozen") ||
        (byOwner || []).find((w: any) => w.status !== "frozen") ||
        null;
      if (!wallet) return Response.json({ wallet: null, transactions: [] });
      const transactions = await db.entities.WalletTransaction
        .filter({ wallet_id: wallet.id }, "-created_date", 50)
        .catch(() => []);
      return Response.json({ wallet, transactions: transactions || [] });
    }

    if (action === "returns") {
      const limit = Math.min(Number(body.limit) || 30, 100);
      const orderNumbers = await myOrderNumbers(limit);
      if (!orderNumbers.length) return Response.json({ returns: [] });
      const returns = await db.entities.Return
        .filter({ order_number: { $in: orderNumbers } }, "-created_date", limit)
        .catch(() => []);
      return Response.json({ returns: returns || [] });
    }

    if (action === "disputes") {
      const limit = Math.min(Number(body.limit) || 30, 100);
      const orderNumbers = await myOrderNumbers(limit);
      if (!orderNumbers.length) return Response.json({ disputes: [] });
      const disputes = await db.entities.Dispute
        .filter({ order_number: { $in: orderNumbers } }, "-created_date", limit)
        .catch(() => []);
      return Response.json({ disputes: disputes || [] });
    }

    if (action === "tickets") {
      const limit = Math.min(Number(body.limit) || 30, 100);
      const [byEmail, byId] = await Promise.all([
        email ? db.entities.SupportTicket.filter({ customer_email: user.email }, "-created_date", limit).catch(() => []) : [],
        user.id ? db.entities.SupportTicket.filter({ created_by_id: user.id }, "-created_date", limit).catch(() => []) : [],
      ]);
      return Response.json({ tickets: dedupe([...(byEmail || []), ...(byId || [])]) });
    }

    if (action === "seller_disputes") {
      if (!email) return Response.json({ disputes: [] });
      const sellers = await db.entities.Seller.filter({ email: user.email }, "name", 5).catch(() => []);
      const names = (sellers || []).map((s: any) => s.name).filter(Boolean);
      const [byTenant, byName] = await Promise.all([
        db.entities.Dispute.filter({ tenant_owner_email: user.email }, "-created_date", 100).catch(() => []),
        names.length
          ? db.entities.Dispute.filter({ seller_name: { $in: names } }, "-created_date", 100).catch(() => [])
          : [],
      ]);
      return Response.json({ disputes: dedupe([...(byTenant || []), ...(byName || [])]) });
    }

    if (action === "seller_threads") {
      if (isAdmin) {
        const all = await db.entities.SupportTicket.list("-created_date", 100).catch(() => []);
        return Response.json({ tickets: all || [] });
      }
      if (!email) return Response.json({ tickets: [] });
      const sellers = await db.entities.Seller.filter({ email: user.email }, "name", 5).catch(() => []);
      const names = (sellers || []).map((s: any) => s.name).filter(Boolean);
      const [byTenant, byName] = await Promise.all([
        db.entities.Dispute.filter({ tenant_owner_email: user.email }, "-created_date", 100).catch(() => []),
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
      if (!ownOrder(order)) return err("Commande introuvable.", 404);

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
      if (!ownOrder(order)) return err("Commande introuvable.", 404);

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
          reason: String(item.reason || body.reason || "not_received"),
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
      const name = String(user.full_name || body.name || "").trim() || "Client";
      const category = String(body.category || "order");
      const ticket = await db.entities.SupportTicket.create({
        ticket_number: ref("TCK"),
        subject,
        category,
        status: "open",
        priority: category === "payment" ? "high" : "normal",
        customer_name: name,
        // The account's own email is the ownership anchor the ticket is read
        // back by, so it never comes from the client.
        customer_email: String(user.email || "").trim(),
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
      const owns =
        !!ticket &&
        (isAdmin ||
          String(ticket.created_by_id || "") === String(user.id || "") ||
          (!!email && lower(ticket.customer_email) === email));
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
      const orderNumber = String(body.order_number || "").trim().toUpperCase();
      if (!orderNumber) return err("Commande requise.");
      const rows = await db.entities.Dispute.filter({ order_number: orderNumber }).catch(() => []);
      const dispute = rows?.[0];
      if (!dispute) return err("Litige introuvable.", 404);

      let allowed = isAdmin || (!!email && lower(dispute.tenant_owner_email) === email);
      if (!allowed && email) {
        const sellers = await db.entities.Seller.filter({ email: user.email }, "name", 5).catch(() => []);
        allowed = (sellers || []).some((s: any) => s.name && s.name === dispute.seller_name);
      }
      if (!allowed) return err("Accès refusé.", 403);

      if (action === "set_dispute_status") {
        // Ruling on a case decides money and blame, and the app only offers
        // these controls to mediation. A shop owner answers a case; it does not
        // close it, and it never writes mediation's private notes.
        if (!isAdmin) return err("Réservé aux administrateurs.", 403);
        const status = String(body.status || "").trim();
        if (!DISPUTE_STATUSES.has(status)) return err("Statut invalide.");
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
          details: { amount_usd: dispute.amount_usd, reviewer: user.email },
        }).catch(() => null);
        return Response.json({ dispute: updated });
      }

      // Who wrote a message is decided here, never by the caller: a shop owner
      // must not be able to post into a mediation thread under the "admin" label.
      const entry = {
        author: isAdmin ? "admin" : "seller",
        author_name: String(user.full_name || user.email || "").slice(0, 120),
        body: String(body.body || "").slice(0, 4000),
        resolution: isAdmin
          ? ""
          : (RESOLUTION_IDS.has(String(body.resolution || "")) ? String(body.resolution) : ""),
        at: new Date().toISOString(),
        file_uri: body.file_uri || undefined,
        attachment_name: body.attachment_name || undefined,
      };
      const ticketId = String(body.ticket_id || "").trim();
      if (ticketId) {
        const ticket = await db.entities.SupportTicket.get(ticketId).catch(() => null);
        // The thread must be the one attached to this case — otherwise a seller
        // could write into a stranger's support conversation.
        if (!ticket || String(ticket.order_number || "") !== orderNumber) return err("Fil introuvable.", 404);
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
      // Trust metrics for the public ratings page: per-shop counts only. The
      // individual cases stay private — no case rows, no per-case statuses and
      // no order numbers leave here for a caller who does not own them.
      const rows = await db.entities.Dispute.list("-created_date", 500).catch(() => []);
      const bySeller = new Map<string, any>();
      for (const d of rows || []) {
        const name = String(d.seller_name || "").trim();
        if (!name) continue;
        const key = name.toLowerCase();
        const entry = bySeller.get(key) || { seller_name: name, disputes: 0, open_disputes: 0 };
        entry.disputes += 1;
        if (["open", "investigating", "escalated"].includes(String(d.status || ""))) entry.open_disputes += 1;
        bySeller.set(key, entry);
      }
      return Response.json({ disputes: [...bySeller.values()] });
    }

    if (action === "signals") {
      const orderNumber = String(body.order_number || "").trim();
      const couponCode = String(body.coupon_code || "").trim();
      const prior = (await myOrders(50)).filter((o: any) => o.order_number !== orderNumber);
      return Response.json({
        prior_count: prior.length,
        shared_phone: new Set(prior.map((o: any) => o.customer_email).filter(Boolean)).size,
        failed_payments: prior.filter((o: any) => o.payment_status === "FAILED").length,
        refunds: prior.filter((o: any) => ["REFUNDED", "PARTIALLY_REFUNDED"].includes(o.payment_status)).length,
        session_count: prior.filter((o: any) => !!sessionId && String(o.session_id || "") === sessionId).length,
        coupon_count: couponCode ? prior.filter((o: any) => o.coupon_code === couponCode).length : 0,
      });
    }

    return err("Action inconnue.");
  } catch (error) {
    console.error("customerAccount: unhandled error", error);
    return err("Accès indisponible. Réessayez.", 500);
  }
}