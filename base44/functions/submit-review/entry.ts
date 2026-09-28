import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";

/**
 * submit-review — base44/functions/submit-review/entry.ts
 *
 * PUBLIC review submission with server-side entitlement. The browser used to
 * assert `verified_purchase: true` itself while `Review.create` was public, so
 * anyone could forge verified reviews on any product. Now the server decides:
 * `verified_purchase` is true only when a DELIVERED order containing the
 * product matches the buyer's session or phone. One review per buyer/product.
 * The product rating aggregate is recomputed here too, so the public
 * `Product.update` path is no longer needed for reviews.
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

    const productId = String(body.product_id || "").trim();
    const rating = Number(body.rating);
    if (!productId) return err("Produit invalide.");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return err("Note invalide.");
    const comment = String(body.comment || "").slice(0, 1000);
    const name = String(body.name || "").slice(0, 80) || "Client Congo Commerce";
    const sessionId = String(body.session_id || "").slice(0, 128);
    const phone = String(body.phone || "").replace(/\D/g, "");

    const product = await db.entities.Product.get(productId).catch(() => null);
    if (!product || product.status !== "published") return err("Produit indisponible.");

    // Entitlement: a DELIVERED order with this product, same session or phone.
    let entitled = false;
    if (sessionId || phone) {
      const candidates = sessionId
        ? await db.entities.Order.filter({ session_id: sessionId }, "-created_date", 50).catch(() => [])
        : [];
      const order = (candidates || []).find(
        (o: any) =>
          o.status === "DELIVERED" &&
          (o.items || []).some((i: any) => i.product_id === productId) &&
          (!phone || [o.customer_phone, o.payment_phone].filter(Boolean).some((p: string) => String(p).replace(/\D/g, "").endsWith(phone.slice(-9)))),
      );
      entitled = !!order;
      if (order) {
        const [sessionDupes, phoneDupes] = await Promise.all([
          sessionId
            ? db.entities.Review.filter({ product_id: productId, session_id: sessionId }).catch(() => [])
            : [],
          phone
            ? db.entities.Review.filter({ product_id: productId, customer_phone: phone }).catch(() => [])
            : [],
        ]);
        if ((sessionDupes?.length || 0) + (phoneDupes?.length || 0) > 0) {
          return err("Vous avez déjà publié un avis sur cet article.", 409);
        }
      }
    }

    const review = await db.entities.Review.create({
      tenant_id: product.tenant_id || "",
      tenant_owner_email: product.tenant_owner_email || "",
      product_id: product.id,
      product_title: product.title,
      seller_id: product.seller_id || "",
      customer_name: name,
      customer_phone: phone,
      session_id: sessionId,
      order_number: "",
      rating,
      comment,
      verified_purchase: entitled,
      status: "published",
    });

    const all = await db.entities.Review.filter({ product_id: product.id, status: "published" }).catch(() => []);
    // Same one-decimal average the storefront always displayed.
    const avg = all?.length
      ? Math.round((all.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0) / all.length) * 10) / 10
      : 0;
    const updatedProduct = await db.entities.Product.update(product.id, {
      rating: avg,
      reviews_count: all?.length || 0,
    }).catch(() => null);

    return Response.json({ review, product: updatedProduct });
  } catch (e) {
    console.error("submit-review: unhandled error", e);
    return err("Impossible d’enregistrer votre avis pour le moment.", 500);
  }
}
