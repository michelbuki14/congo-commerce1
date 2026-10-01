import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";

/**
 * get-order — base44/functions/get-order/entry.ts
 *
 * Order lookup with proof of ownership. Order numbers are enumerable, so
 * reading by number alone leaks PII (name, phone, address). Ownership is proved
 * by the signed-in account itself — the email recorded on the order, or the
 * account that created it. A phone number the caller simply states is never
 * accepted as proof: it is semi-public, so it would let anyone who knows it
 * read a stranger's order.
 */

function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export default async function (req: Request) {
  try {
    if (req.method !== "POST") return err("Method not allowed", 405);
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    // Only a signed-in account may look an order up, and only its own.
    const user = await base44.auth.me().catch(() => null);
    if (!user) return err("Connectez-vous pour suivre votre commande.", 401);

    const body = await req.json().catch(() => ({}));
    const orderNumber = String(body.order_number || "").trim();
    if (!orderNumber) return err("Le numéro de commande est requis.");

    const orders = await db.entities.Order.filter({ order_number: orderNumber }).catch(() => []);
    const order = orders?.[0];
    if (!order) return err("Commande introuvable.", 404);

    const email = String(user.email || "").trim().toLowerCase();
    const owns =
      String(user.role || "") === "admin" ||
      String(order.created_by_id || "") === String(user.id || "") ||
      (!!email && String(order.customer_email || "").trim().toLowerCase() === email);
    if (!owns) return err("Commande introuvable.", 404);

    const fulfillments = await db.entities.FulfillmentOrder.filter({ order_number: orderNumber }).catch(() => []);
    const shipments = await Promise.all(
      (fulfillments || []).map((f: any) =>
        db.entities.Shipment.filter({ fulfillment_order_id: f.id }).catch(() => []),
      ),
    );
    // The origin-warehouse photo is stored privately, and the buyer — who
    // usually has no account — needs to see it, so it is handed over as a
    // short-lived signed link rather than a permanent public URL.
    const withPhoto = await Promise.all(
      (fulfillments || []).map(async (f: any) => {
        if (!f.origin_photo_url) return f;
        try {
          const { signed_url } = await db.integrations.Core.CreateFileSignedUrl({ file_uri: f.origin_photo_url, expires_in: 900 });
          return { ...f, origin_photo_signed_url: signed_url };
        } catch (e) {
          console.error("get-order: signed photo failed", e);
          return f;
        }
      }),
    );
    return Response.json({ order, fulfillments: withPhoto, shipments: shipments.flat() });
  } catch (e) {
    console.error("get-order: unhandled error", e);
    return err("Recherche indisponible. Réessayez.", 500);
  }
}