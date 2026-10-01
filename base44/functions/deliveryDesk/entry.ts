import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

/**
 * deliveryDesk — base44/functions/deliveryDesk/entry.ts
 *
 * The delivery-side counterpart of `customerAccount`.
 *
 * Fulfilments and shipments are locked at the row level to the seller who owns
 * them, the courier carrying them, the tenant that sold them, or a platform
 * admin. A courier therefore resolves the orders they deliver — and the order
 * behind one delivery file — through this function, which checks the caller's
 * own binding before returning anything.
 */

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

const lower = (value: any) => String(value || "").trim().toLowerCase();

export default async function (req: Request) {
  try {
    if (req.method !== "POST") return fail("Method not allowed", 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.email) return fail("Authentification requise", 401);

    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const email = lower(user.email);
    const admin = user.role === "admin";
    const action = String(body.action || "");

    if (action === "orders") {
      const names = (Array.isArray(body.courier_names) ? body.courier_names : [])
        .map((n: any) => String(n || "").trim())
        .filter(Boolean);
      if (!names.length) return Response.json({ orders: [] });

      if (!admin) {
        const fleets = await db.entities.Courier.filter({ email }).catch(() => []);
        const allowed = new Set((fleets || []).map((c: any) => String(c.name || "").trim()).filter(Boolean));
        if (!names.every((n: string) => allowed.has(n))) return fail("Accès refusé", 403);
      }

      const groups = await Promise.all(
        names.map((n: string) =>
          db.entities.FulfillmentOrder.filter({ courier_name: n }, "-created_date", 100).catch(() => []),
        ),
      );
      const numbers = [...new Set(groups.flat().map((f: any) => f.order_number).filter(Boolean))];
      if (!numbers.length) return Response.json({ orders: [] });

      const orderGroups = await Promise.all(
        numbers.map((n: any) => db.entities.Order.filter({ order_number: n }).catch(() => [])),
      );
      return Response.json({ orders: orderGroups.flat() });
    }

    if (action === "order") {
      const fulfillmentId = String(body.fulfillment_id || "").trim();
      if (!fulfillmentId) return fail("Dossier de livraison requis.");
      const fulfillment = await db.entities.FulfillmentOrder.get(fulfillmentId).catch(() => null);
      if (!fulfillment) return fail("Dossier de livraison introuvable.", 404);

      const allowed =
        admin ||
        lower(fulfillment.seller_email) === email ||
        lower(fulfillment.courier_email) === email ||
        lower(fulfillment.tenant_owner_email) === email;
      if (!allowed) return fail("Accès refusé", 403);

      const order = fulfillment.order_id
        ? await db.entities.Order.get(fulfillment.order_id).catch(() => null)
        : null;
      return Response.json({ order });
    }

    return fail("Action inconnue.");
  } catch (error) {
    console.error("deliveryDesk: unhandled error", error);
    return fail("Accès indisponible. Réessayez.", 500);
  }
}