import React, { useEffect, useState } from 'react';
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/EmptyState';
import { getProfile } from '@/lib/session';
import { useCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/format';

const TYPE_LABELS = {
  CREDIT: 'Crédit',
  DEBIT: 'Débit',
  REFUND: 'Remboursement',
  COMMISSION: 'Commission',
  PAYOUT: 'Versement',
  ADJUSTMENT: 'Ajustement',
};

export default function Wallet() {
  const { format } = useCurrency();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const profile = getProfile();
      const wallets = await base44.entities.Wallet.filter({ owner_type: 'customer' }).catch(() => []);
      const mine = wallets.find((w) => w.owner_name === profile.name && profile.name) || null;
      setWallet(mine);
      if (mine) {
        const txs = await base44.entities.WalletTransaction.filter({ wallet_id: mine.id }, '-created_date', 50).catch(() => []);
        setTransactions(txs);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="h-48 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">Mon portefeuille</h1>

      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground">
        <p className="flex items-center gap-2 text-xs font-semibold opacity-90">
          <WalletIcon className="h-4 w-4" /> Solde disponible
        </p>
        <p className="mt-2 text-3xl font-black">{format(wallet?.balance_usd || 0)}</p>
        {Number(wallet?.pending_usd) > 0 && (
          <p className="mt-1 text-xs opacity-90">En attente : {format(wallet.pending_usd)}</p>
        )}
        <p className="mt-3 text-[11px] opacity-80">
          Crédits de remboursement et bons d'achat. Le portefeuille est tenu en partie double : chaque mouvement crée une écriture.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Historique des mouvements</h2>
        {transactions.length ? (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                {t.direction === 'credit' ? (
                  <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description || TYPE_LABELS[t.type] || t.type}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateTime(t.created_date)} · {t.reference || '—'} · {t.status === 'pending' ? 'en attente' : 'comptabilisé'}
                  </p>
                </div>
                <span className={`text-sm font-bold ${t.direction === 'credit' ? 'text-emerald-600' : ''}`}>
                  {t.direction === 'credit' ? '+' : '−'}{format(t.amount_usd)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={WalletIcon}
            title="Aucun mouvement"
            description="Les remboursements et crédits promotionnels apparaîtront ici."
          />
        )}
      </section>
    </div>
  );
}