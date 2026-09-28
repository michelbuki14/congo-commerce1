import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { requireAdmin } from "../../shared/security.ts";

/**
 * refund-payment — base44/functions/refund-payment/entry.ts
 *
 * ADMIN-ONLY refund execution. Refunds used to be assembled in the browser
 * (wallet credit + ledger + order flag, uncapped amounts, seller shares left
 * payable), so anyone could mint customer balances. Now the server:
 * - caps the refund at the order's unrefunded remainder,
 * - credits the buyer's wallet (keyed by order session, not display name),
 * - reverses unreleased seller/creator shares so a refunded order can never
 *   still pay out on delivery,
 * - marks the order REFUNDED / PARTIALLY_REFUNDED.
 *
 * Provider money movement: card charges are NOT reversed here — the Wix charge
 * id is not stored on the order, so the record flags `provider_refund:
 * manual_required` for finance to complete in the Wix dashboard. Mobile-money
 * and cash never left the platform ledger, so the wallet credit IS the refund.
 */

function round2(n: unknown): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

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
    const amount = round2(body.amount);
    if (!orderNumber) return err("order_number est requis.");
    if (!(amount > 0)) return err("Montant invalide.");

    const orders = await db.entities.Order.filter({ order_number: orderNumber }).catch(() => []);
    const order = orders?.[0];
    if (!order) return err("Commande introuvable.", 404);
    if (order.payment_status === "REFUNDED") return err("Commande déjà remboursée.", 409);

    // Cap at the unrefunded remainder (partial refunds allowed).
    const prior = await db.entities.WalletTransaction
      .filter({ order_number: orderNumber, type: "REFUND", direction: "credit" })
      .catch(() => []);
    const refundedSoFar = round2((prior || []).reduce((s: number, t: any) => s + (Number(t.amount_usd) || 0), 0));
    const remainder = round2((Number(order.total_usd) || 0) - refundedSoFar);
    if (round2(amount - remainder) > 0.005) {
      return err(`Montant supérieur au reliquat remboursable (${remainder} USD).`, 409);
    }

    // Buyer wallet: session id first (stable), display name only for legacy rows.
    const sessionId = String(order.session_id || "");
    let wallet: any = null;
    if (sessionId) {
      const rows = await db.entities.Wallet.filter({ owner_type: "customer", owner_id: sessionId }).catch(() => []);
      wallet = rows?.[0] || null;
    }
    if (!wallet) {
      const rows = await db.entities.Wallet.filter({ owner_type: "customer", owner_name: order.customer_name }).catch(() => []);
      wallet = rows?.[0] || null;
    }
    if (!wallet) {
      wallet = await db.entities.Wallet.create({
        tenant_id: order.tenant_id || "",
        tenant_owner_email: order.tenant_owner_email || "",
        owner_type: "customer",
        owner_name: order.customer_name || "Client",
        owner_email: order.customer_email || "",
        owner_id: sessionId,
        balance_usd: 0,
      });
    }

    const updatedWallet = await db.entities.Wallet.update(wallet.id, {
      balance_usd: round2((wallet.balance_usd || 0) + amount),
      lifetime_credit_usd: round2((wallet.lifetime_credit_usd || 0) + amount),
    });
    const reference = String(body.return_number || body.dispute_id || orderNumber);
    const tx = await db.entities.WalletTransaction.create({
      wallet_id: wallet.id,
      tenant_id: wallet.tenant_id || "",
      tenant_owner_email: wallet.tenant_owner_email || "",
      owner_type: "customer",
      owner_name: wallet.owner_name,
      type: "REFUND",
      direction: "credit",
      amount_usd: amount,
      balance_after_usd: updatedWallet.balance_usd,
      currency: "USD",
      description: `Remboursement ${orderNumber}${body.reason ? ` — ${String(body.reason).slice(0, 120)}` : ""}`,
      reference,
      order_id: order.id,
      order_number: orderNumber,
      status: "posted",
    });

    // Claw back unreleased shares: a refunded order must never still pay out.
    let reversed = 0;
    const fulfillments = await db.entities.FulfillmentOrder.filter({ order_number: orderNumber }).catch(() => []);
    for (const f of fulfillments || []) {
      if (f?.payout_released) continue;
      const pending = await db.entities.WalletTransaction
        .filter({ reference: f.fulfillment_number, status: "pending" })
        .catch(() => []);
      for (const p of pending || []) {
        await db.entities.WalletTransaction.update(p.id, { status: "reversed" });
        const wrows = await db.entities.Wallet.filter({ id: p.wallet_id }).catch(() => []);
        const w = wrows?.[0];
        if (w) {
          await db.entities.Wallet.update(w.id, { pending_usd: Math.max(0, round2((w.pending_usd || 0) - Number(p.amount_usd || 0))) });
        }
        reversed += 1;
      }
      await db.entities.FulfillmentOrder.update(f.id, { payout_released: true });
    }

    const fullyRefunded = round2(refundedSoFar + amount) >= round2(Number(order.total_usd) || 0) - 0.005;
    const updatedOrder = await db.entities.Order.update(order.id, {
      payment_status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
    });

    const providerRefund = order.payment_provider === "card" ? "manual_required" : "n/a_ledger_only";
    await db.entities.Notification.create({
      tenant_id: order.tenant_id || "",
      tenant_owner_email: order.tenant_owner_email || "",
      title: `Remboursement de ${amount} USD`,
      message: `Votre commande ${orderNumber} a été remboursée. Le montant est crédité sur votre portefeuille.`,
      type: "payment",
      audience: "customer",
      order_number: orderNumber,
    });
    await db.entities.AuditLog.create({
      action: "payment.refunded",
      actor: "admin",
      entity: "Order",
      entity_id: order.id,
      reference: orderNumber,
      severity: "info",
      details: { amount_usd: amount, refunded_total_usd: round2(refundedSoFar + amount), shares_reversed: reversed, provider_refund: providerRefund, reason: String(body.reason || "") },
    });

    return Response.json({ order: updatedOrder, transaction: tx, shares_reversed: reversed, provider_refund: providerRefund });
  } catch (e) {
    console.error("refund-payment: unhandled error", e);
    return err("Remboursement impossible. Réessayez.", 500);
  }
}
