/**
 * walletLedger — base44/shared/walletLedger.ts
 *
 * The single write path for every wallet balance change.
 *
 * Why it exists: balances used to be updated with read-modify-write
 * (`Wallet.update(id, { balance_usd: wallet.balance_usd + amount })`). Two
 * operations running at the same moment read the same starting balance and the
 * second write erased the first — a refund racing a purchase could lose or
 * create money, and a customer could spend the same dollar twice.
 *
 * Every movement here is an atomic `$inc`, so concurrent movements compose
 * instead of overwriting one another. The pre-checks callers rely on
 * (available balance, unrefunded remainder) are optimistic: after a debit the
 * balance is read back and, if a concurrent movement won the race, ours is
 * reversed and refused. An idempotency key is honoured before writing, so a
 * retried call never pays twice.
 */

export const EPSILON = 0.005;

export function round2(value: unknown): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Compare-and-swap rounding: rewrites a float field to its 2-decimal value only
 * if no concurrent movement landed between the read and this call, so the
 * correction can never erase a movement.
 */
async function roundStored(db: any, walletId: string, field: string, raw: unknown): Promise<void> {
  const value = Number(raw) || 0;
  const rounded = round2(value);
  if (rounded === value) return;
  await db.entities.Wallet
    .updateMany({ id: walletId, [field]: value }, { $set: { [field]: rounded } })
    .catch(() => {});
}

export type WalletEntry = {
  type: string;
  direction?: "credit" | "debit";
  amount: number;
  status?: "posted" | "pending" | "reversed";
  description?: string;
  reference?: string;
  idempotencyKey?: string;
  order_id?: string;
  order_number?: string;
  amount_cdf?: number;
  owner_type?: string;
  owner_name?: string;
  owner_email?: string;
  tenant_id?: string;
  tenant_owner_email?: string;
};

/**
 * Moves money on a wallet and writes the matching ledger line.
 *
 * Returns `{ ok: false, reason }` instead of throwing: `insufficient_funds`
 * (the balance could not cover the debit) and `duplicate` (this exact movement
 * was already recorded) are both normal outcomes the caller must report.
 */
export async function postWalletEntry(db: any, wallet: any, entry: WalletEntry) {
  const amount = round2(entry.amount);
  if (!(amount > 0)) return { ok: false, reason: "invalid_amount" as const };
  const direction = entry.direction === "debit" ? "debit" : "credit";
  // A pending *credit* is money owed but not yet released: it is held on
  // pending_usd. A pending *debit* (a withdrawal awaiting approval) has already
  // left the balance, so it must not touch the hold.
  const holdsPending = direction === "credit" && entry.status === "pending";

  if (entry.idempotencyKey) {
    const existing = await db.entities.WalletTransaction
      .filter({ idempotency_key: entry.idempotencyKey })
      .catch(() => []);
    if (existing?.length) return { ok: false, reason: "duplicate" as const, transaction: existing[0] };
  }

  if (direction === "debit") {
    const available = round2((wallet.balance_usd || 0) - (wallet.pending_usd || 0));
    if (round2(amount - available) > EPSILON) {
      return { ok: false, reason: "insufficient_funds" as const, available };
    }
  }

  const increment: Record<string, number> = direction === "debit"
    ? { balance_usd: -amount, lifetime_debit_usd: amount }
    : { balance_usd: amount, lifetime_credit_usd: amount, ...(holdsPending ? { pending_usd: amount } : {}) };
  await db.entities.Wallet.updateMany({ id: wallet.id }, { $inc: increment });

  let after = await db.entities.Wallet.get(wallet.id).catch(() => null);
  if (!after) return { ok: false, reason: "wallet_missing" as const };

  // The check above read a snapshot. If another movement drained the wallet in
  // between, undo ours rather than let the balance go negative.
  if (direction === "debit" && round2(after.balance_usd) < -EPSILON) {
    await db.entities.Wallet.updateMany(
      { id: wallet.id },
      { $inc: { balance_usd: amount, lifetime_debit_usd: -amount } },
    );
    after = await db.entities.Wallet.get(wallet.id).catch(() => null);
    return {
      ok: false,
      reason: "insufficient_funds" as const,
      available: round2((after?.balance_usd || 0) - (after?.pending_usd || 0)),
    };
  }

  await roundStored(db, wallet.id, "balance_usd", after.balance_usd);
  const balance = round2(after.balance_usd);

  const transaction = await db.entities.WalletTransaction.create({
    wallet_id: wallet.id,
    tenant_id: entry.tenant_id ?? wallet.tenant_id ?? "",
    tenant_owner_email: entry.tenant_owner_email ?? wallet.tenant_owner_email ?? "",
    owner_type: entry.owner_type ?? wallet.owner_type,
    owner_name: entry.owner_name ?? wallet.owner_name,
    owner_email: entry.owner_email ?? wallet.owner_email ?? "",
    type: entry.type,
    direction,
    amount_usd: amount,
    amount_cdf: entry.amount_cdf ?? 0,
    balance_after_usd: balance,
    currency: "USD",
    description: entry.description || "",
    reference: entry.reference || "",
    order_id: entry.order_id || "",
    order_number: entry.order_number || "",
    idempotency_key: entry.idempotencyKey || "",
    status: entry.status || "posted",
  });

  return { ok: true, wallet: { ...after, balance_usd: balance }, transaction, balance_after_usd: balance };
}

/**
 * Releases (or claws back) held money. pending_usd is a hold, never a balance,
 * so it is clamped at zero rather than allowed to go negative.
 */
export async function releasePending(db: any, wallet: any, amount: unknown) {
  const value = round2(amount);
  if (!(value > 0)) return wallet;
  await db.entities.Wallet.updateMany({ id: wallet.id }, { $inc: { pending_usd: -value } });
  const after = await db.entities.Wallet.get(wallet.id).catch(() => null);
  if (!after) return wallet;
  if (round2(after.pending_usd) < 0) {
    await db.entities.Wallet
      .updateMany({ id: wallet.id, pending_usd: after.pending_usd }, { $set: { pending_usd: 0 } })
      .catch(() => {});
    return { ...after, pending_usd: 0 };
  }
  await roundStored(db, wallet.id, "pending_usd", after.pending_usd);
  return { ...after, pending_usd: round2(after.pending_usd) };
}