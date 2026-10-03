// DEPRECATED — replaced by the payments-webhook idempotency guard and
// the automated payment verification flow. This function is kept for
// rollback only; new integrations should use the webhook path.
// Do not add new callers.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { requireAdmin } from "../../shared/security.ts";

/**
 * confirm-payment — base44/functions/confirm-payment/entry.ts
 *
 * ADMIN-ONLY manual money confirmation. Mobile-money orders are recorded
 * PENDING + UNVERIFIED by place-order (no provider callback exists yet); when
 * finance confirms the cash actually arrived (MoMo SMS, aggregator dashboard),
 * this flips the order to PAID + verified and releases the fulfillments into
 * CONFIRMED — the same grant the signed card webhook performs. Idempotent.
 */

function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export default async function (req: Request) {
  try {
    if (req.method !== "POST") return err("Method not allowed", 405);
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (!auth.ok) return auth.response;
    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const orderNumber = String(body.order_number || "").trim();
    if (!orderNumber) return err("order_number est requis.");

    const orders = await db.entities.Order.filter({ order_number: orderNumber }).catch(() => []);
    const order = orders?.[0];
    if (!order) return err("Commande introuvable.", 404);
    if (order.payment_verified && order.payment_status === "PAID") {
      return Response.json({ order, already: true });
    }

    const updated = await db.entities.Order.update(order.id, {
      payment_status: "PAID",
      payment_verified: true,
      payment_reference: String(body.payment_reference || order.payment_reference || `MANUAL-${orderNumber}`),
      status: order.status === "PENDING" ? "CONFIRMED" : order.status,
    });
    const fulfillments = await db.entities.FulfillmentOrder.filter({ order_number: orderNumber }).catch(() => []);
    let advanced = 0;
    for (const f of fulfillments || []) {
      if (f?.status === "PENDING") {
        await db.entities.FulfillmentOrder.update(f.id, { status: "CONFIRMED" });
        advanced += 1;
      }
    }
    await db.entities.AuditLog.create({
      action: "payment.confirmed_manual",
      actor: "admin",
      entity: "Order",
      entity_id: order.id,
      reference: orderNumber,
      severity: "info",
      details: { fulfillments_advanced: advanced, reference: updated.payment_reference },
    });
    return Response.json({ order: updated, fulfillments_advanced: advanced });
  } catch (e) {
    console.error("confirm-payment: unhandled error", e);
    return err("Confirmation impossible. Réessayez.", 500);
  }
}
