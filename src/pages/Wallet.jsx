import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/EmptyState';
import { getSessionId } from '@/lib/session';
import { useCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/format';

const TYPE_KEYS = {
  CREDIT: 'wallet.typeCredit',
  DEBIT: 'wallet.typeDebit',
  REFUND: 'wallet.typeRefund',
  COMMISSION: 'wallet.typeCommission',
  PAYOUT: 'wallet.typePayout',
  ADJUSTMENT: 'wallet.typeAdjust',
};

export default function Wallet() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const wallets = await base44.entities.Wallet.filter({ owner_type: 'customer', owner_id: getSessionId() }).catch(() => []);
      const mine = wallets[0] || null;
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
      <h1 className="text-lg font-bold md:text-xl">{t('wallet.title')}</h1>

      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground">
        <p className="flex items-center gap-2 text-xs font-semibold opacity-90">
          <WalletIcon className="h-4 w-4" /> {t('wallet.balance')}
        </p>
        <p className="mt-2 text-3xl font-black">{format(wallet?.balance_usd || 0)}</p>
        {Number(wallet?.pending_usd) > 0 && (
          <p className="mt-1 text-xs opacity-90">{t('wallet.pending', { amount: format(wallet.pending_usd) })}</p>
        )}
        <p className="mt-3 text-[11px] opacity-80">
          {t('wallet.note')}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('wallet.history')}</h2>
        {transactions.length ? (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                {tx.direction === 'credit' ? (
                  <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tx.description || (TYPE_KEYS[tx.type] ? t(TYPE_KEYS[tx.type]) : tx.type)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateTime(tx.created_date)} · {tx.reference || '—'} · {tx.status === 'pending' ? t('wallet.pendingStatus') : t('wallet.postedStatus')}
                  </p>
                </div>
                <span className={`text-sm font-bold ${tx.direction === 'credit' ? 'text-emerald-600' : ''}`}>
                  {tx.direction === 'credit' ? '+' : '−'}{format(tx.amount_usd)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={WalletIcon}
            title={t('wallet.noMovements')}
            description={t('wallet.noMovementsDesc')}
          />
        )}
      </section>
    </div>
  );
}