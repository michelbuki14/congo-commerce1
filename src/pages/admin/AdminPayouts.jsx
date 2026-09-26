import React, { useEffect, useState } from 'react';
import { Banknote, Check, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { formatUSD, formatDateTime, round2 } from '@/lib/format';

const TABS = [
  { id: 'pending', label: 'À payer' },
  { id: 'posted', label: 'Payés' },
  { id: 'reversed', label: 'Refusés' },
];

export default function AdminPayouts() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [message, setMessage] = useState('');

  const load = async () => {
    const rows = await base44.entities.WalletTransaction.filter(
      { type: 'PAYOUT', direction: 'debit' },
      '-created_date',
      100,
    ).catch(() => []);
    setRequests(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const settle = async (tx, approve) => {
    setMessage('');
    const wallets = await base44.entities.Wallet.filter({ id: tx.wallet_id }).catch(() => []);
    const wallet = wallets[0];

    await base44.entities.WalletTransaction.update(tx.id, { status: approve ? 'posted' : 'reversed' });

    if (!approve && wallet) {
      const amount = Number(tx.amount_usd) || 0;
      const refunded = await base44.entities.Wallet.update(wallet.id, {
        balance_usd: round2((wallet.balance_usd || 0) + amount),
        lifetime_debit_usd: Math.max(0, round2((wallet.lifetime_debit_usd || 0) - amount)),
      });
      await base44.entities.WalletTransaction.create({
        wallet_id: wallet.id,
        owner_type: wallet.owner_type,
        owner_name: wallet.owner_name,
        type: 'REFUND',
        direction: 'credit',
        amount_usd: amount,
        balance_after_usd: refunded.balance_usd,
        currency: 'USD',
        description: 'Retrait refusé — montant recrédité',
        reference: tx.reference,
      });
    }

    await base44.entities.AuditLog.create({
      action: approve ? 'payout.paid' : 'payout.rejected',
      actor: 'admin',
      entity: 'WalletTransaction',
      entity_id: tx.id,
      reference: tx.reference,
      severity: approve ? 'info' : 'warning',
      details: { amount_usd: tx.amount_usd, owner: tx.owner_name, owner_type: tx.owner_type },
    });

    setMessage(
      approve
        ? `Retrait de ${formatUSD(tx.amount_usd)} payé à ${tx.owner_name}.`
        : `Retrait de ${formatUSD(tx.amount_usd)} refusé — montant recrédité sur le portefeuille.`,
    );
    await load();
  };

  const visible = requests.filter((r) => r.status === tab);
  const pendingTotal = requests
    .filter((r) => r.status === 'pending')
    .reduce((s, r) => s + (Number(r.amount_usd) || 0), 0);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Retraits" links={ADMIN_LINKS} />

      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Banknote className="h-4 w-4 text-primary" /> En attente de paiement
        </p>
        <p className="mt-1 text-2xl font-black">{formatUSD(pendingTotal)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Vendeurs, créateurs et livreurs demandent un retrait depuis leur portefeuille. Validez après le transfert
          mobile money ; un refus recrédite automatiquement le montant.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            {t.label} ({requests.filter((r) => r.status === t.id).length})
          </button>
        ))}
      </div>

      {message && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>}

      <div className="space-y-2.5">
        {visible.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold">{r.owner_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.owner_type} · {r.reference || '—'} · {formatDateTime(r.created_date)}
                </p>
                <p className="text-[11px] text-muted-foreground">{r.description}</p>
              </div>
              <span className="text-sm font-bold">{formatUSD(r.amount_usd)}</span>
            </div>

            {r.status === 'pending' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => settle(r, true)}
                  className="flex items-center gap-1 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-900"
                >
                  <Check className="h-3.5 w-3.5" /> Marquer payé
                </button>
                <button
                  type="button"
                  onClick={() => settle(r, false)}
                  className="flex items-center gap-1 rounded-full bg-red-100 px-3.5 py-1.5 text-xs font-semibold text-red-900"
                >
                  <X className="h-3.5 w-3.5" /> Refuser et recréditer
                </button>
              </div>
            )}
          </div>
        ))}
        {!visible.length && (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            Aucun retrait dans cette catégorie.
          </p>
        )}
      </div>
    </div>
  );
}