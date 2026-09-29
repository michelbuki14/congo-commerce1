import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";

/**
 * submit-review — base44/functions/submit-review/entry.ts
 *
 * Review submission for a signed-in buyer, with server-side entitlement.
 * Ratings are aggregated back onto the product, so an anonymous writer could
 * distort any product's score: the caller must be signed in, must actually
 * have received the product, and may only review it once. The product rating
 * aggregate is recomputed here too, so the public `Product.update` path is no
 * longer needed for reviews.
 */

function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export default async function (req: Request) {
  try {
    if (req.method !== "POST") return err("Method not allowed", 405);
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    // Only a signed-in account may post a review.
    const user = await base44.auth.me().catch(() => null);
    if (!user) return err("Connectez-vous pour publier un avis.", 401);

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

    // One review per account per product — the reviewer is the signed-in account,
    // never a value the browser states about itself.
    const dupes = await db.entities.Review
      .filter({ product_id: productId, customer_email: user.email }, "-created_date", 1)
      .catch(() => []);
    if (dupes?.length) return err("Vous avez déjà publié un avis sur cet article.", 409);

    // Entitlement: a DELIVERED order of this account that contains the product.
    const [byEmail, byId] = await Promise.all([
      db.entities.Order.filter({ customer_email: user.email }, "-created_date", 50).catch(() => []),
      user.id ? db.entities.Order.filter({ created_by_id: user.id }, "-created_date", 50).catch(() => []) : [],
    ]);
    const entitled = [...(byEmail || []), ...(byId || [])].some(
      (o: any) => o.status === "DELIVERED" && (o.items || []).some((i: any) => i.product_id === productId),
    );
    if (!entitled) return err("Seuls les acheteurs ayant reçu l’article peuvent publier un avis.", 403);

    const review = await db.entities.Review.create({
      tenant_id: product.tenant_id || "",
      tenant_owner_email: product.tenant_owner_email || "",
      product_id: product.id,
      product_title: product.title,
      seller_id: product.seller_id || "",
      customer_name: user.full_name || name,
      customer_email: user.email,
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