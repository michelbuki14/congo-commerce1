import { base44 } from '@/api/base44Client';
import { round2 } from '@/lib/format';

/**
 * Debits a wallet and books a PAYOUT ledger entry that the admin team settles
 * from the payouts console (approve = paid, refuse = amount credited back).
 * Returns the updated wallet.
 */
export async function requestWithdrawal({ wallet, amount, method, ownerType, ownerName }) {
  const value = round2(Number(amount) || 0);
  const updated = await base44.entities.Wallet.update(wallet.id, {
    balance_usd: round2((wallet.balance_usd || 0) - value),
    lifetime_debit_usd: round2((wallet.lifetime_debit_usd || 0) + value),
  });
  await base44.entities.WalletTransaction.create({
    wallet_id: wallet.id,
    owner_type: ownerType || wallet.owner_type,
    owner_name: ownerName || wallet.owner_name,
    type: 'PAYOUT',
    direction: 'debit',
    amount_usd: value,
    balance_after_usd: updated.balance_usd,
    currency: 'USD',
    description: `Retrait vers ${method}`,
    reference: `WD-${Date.now().toString(36).toUpperCase()}`,
    status: 'pending',
  });
  await base44.entities.AuditLog.create({
    action: 'wallet.withdrawal_requested',
    actor: ownerType || wallet.owner_type,
    entity: 'Wallet',
    entity_id: wallet.id,
    reference: ownerName || wallet.owner_name,
    severity: 'info',
    details: { amount_usd: value, method },
  });
  return updated;
}