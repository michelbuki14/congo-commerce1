// DEPRECATED — withdrawal requests are now handled through the
// automated payout pipeline (payout-request function). Kept for
// rollback only; do not add new callers.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { requireAdmin } from "../../shared/security.ts";
import { postWalletEntry } from "../../shared/walletLedger.ts";

/**
 * request-withdrawal — base44/functions/request-withdrawal/entry.ts
 *
 * Authenticated wallet withdrawal. The caller must own the wallet (owner email
 * matches the signed-in user, or the user is the seller of record). The server
 * enforces: allowlisted method, positive amount, and amount covered by the
 * AVAILABLE balance (balance minus pending — pending money hasn't been
 * released and can never be withdrawn).
 */

const METHODS = ["mpesa", "airtel", "orange", "bank"];

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
    const user = await base44.auth.me().catch(() => null);
    if (!user?.email) return err("Connectez-vous pour demander un retrait.", 401);
    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const method = String(body.method || "").toLowerCase();
    if (!METHODS.includes(method)) return err("Moyen de retrait invalide.");
    const amount = round2(body.amount);
    if (!(amount > 0)) return err("Montant invalide.");

    const wallet = await db.entities.Wallet.get(String(body.wallet_id || "")).catch(() => null);
    if (!wallet) return err("Portefeuille introuvable.", 404);

    // Ownership: direct owner email, or the seller record behind the wallet.
    let owned = String(wallet.owner_email || "").toLowerCase() === String(user.email).toLowerCase();
    if (!owned && wallet.owner_type === "seller" && wallet.owner_id) {
      const seller = await db.entities.Seller.get(wallet.owner_id).catch(() => null);
      owned = !!seller && String(seller.email || "").toLowerCase() === String(user.email).toLowerCase();
    }
    if (!owned) return err("Ce portefeuille ne vous appartient pas.", 403);

    const available = round2((wallet.balance_usd || 0) - (wallet.pending_usd || 0));
    if (round2(amount - available) > 0.005) {
      return err(`Solde disponible insuffisant — disponible : ${available} USD.`, 409);
    }

    const posted = await postWalletEntry(db, wallet, {
      type: "PAYOUT",
      direction: "debit",
      amount,
      description: `Retrait vers ${method} — ${String(body.account || "")}`.slice(0, 200),
      reference: `WD-${Date.now().toString(36).toUpperCase()}`,
      status: "pending",
    });
    // The balance was read a moment ago; a concurrent debit may have taken it
    // since, in which case the ledger refuses the movement.
    if (!posted.ok) {
      return err(`Solde disponible insuffisant — disponible : ${posted.available ?? available} USD.`, 409);
    }
    const updated = posted.wallet;
    const tx = posted.transaction;
    await db.entities.AuditLog.create({
      action: "wallet.withdrawal_requested",
      actor: user.email,
      entity: "Wallet",
      entity_id: wallet.id,
      reference: wallet.owner_name,
      severity: "info",
      details: { amount_usd: amount, method },
    });
    return Response.json({ wallet: updated, transaction: tx });
  } catch (e) {
    console.error("request-withdrawal: unhandled error", e);
    return err("Retrait impossible pour le moment. Réessayez.", 500);
  }
}