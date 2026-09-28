import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";

/**
 * get-order — base44/functions/get-order/entry.ts
 *
 * PUBLIC order lookup with proof of ownership. Order numbers are enumerable,
 * so reading by number alone leaks PII (name, phone, address). The caller must
 * also supply the buyer phone recorded on the order; both must match.
 */

function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export default async function (req: Request) {
  try {
    if (req.method !== "POST") return err("Method not allowed", 405);
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const orderNumber = String(body.order_number || "").trim();
    const phone = String(body.phone || "").trim();
    if (!orderNumber || !phone) return err("Le numéro de commande et le téléphone sont requis.");

    const orders = await db.entities.Order.filter({ order_number: orderNumber }).catch(() => []);
    const order = orders?.[0];
    if (!order) return err("Commande introuvable.", 404);
    const matches = [order.customer_phone, order.payment_phone].filter(Boolean).map((p: string) => String(p).replace(/\D/g, ""));
    if (!matches.includes(phone.replace(/\D/g, ""))) return err("Commande introuvable.", 404);

    const fulfillments = await db.entities.FulfillmentOrder.filter({ order_number: orderNumber }).catch(() => []);
    const shipments = await Promise.all(
      (fulfillments || []).map((f: any) =>
        db.entities.Shipment.filter({ fulfillment_order_id: f.id }).catch(() => []),
      ),
    );
    return Response.json({ order, fulfillments: fulfillments || [], shipments: shipments.flat() });
  } catch (e) {
    console.error("get-order: unhandled error", e);
    return err("Recherche indisponible. Réessayez.", 500);
  }
}
