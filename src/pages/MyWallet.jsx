import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Banknote, ShieldCheck } from 'lucide-react';
import { fetchMyWallet } from '@/lib/customerAccount';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import EmptyState from '@/components/EmptyState';
import { requestWithdrawal } from '@/lib/wallet';
import { useCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/format';

const METHODS = ['M-Pesa', 'Airtel Money', 'Orange Money', 'Virement bancaire'];
const TYPE_KEYS = {
  CREDIT: 'wallet.typeCredit',
  DEBIT: 'wallet.typeDebit',
  REFUND: 'wallet.typeRefund',
  COMMISSION: 'wallet.typeCommission',
  PAYOUT: 'wallet.typePayout',
  ADJUSTMENT: 'wallet.typeAdjust',
};

export default function MyWallet() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(METHODS[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    // Customer wallets are keyed by device session id, never by display name:
    // names collide and localStorage is self-asserted, either of which would
    // show one buyer another buyer's balance.
    const { wallet: mine, transactions: txs } = await fetchMyWallet();
    setWallet(mine);
    setTransactions(txs);
    setLoading(false);
  };

  useEffect(() => {
    load();
     
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    const value = Number(amount);
    if (!wallet) {
      setError(t('sellerWallet.noWalletShort'));
      return;
    }
    if (!value || value <= 0) {
      setError(t('sellerWallet.badAmount'));
      return;
    }
    if (value > (wallet.balance_usd || 0)) {
      setError(t('sellerWallet.overBalance'));
      return;
    }
    try {
      await requestWithdrawal({
        wallet,
        amount: value,
        method,
        ownerType: 'customer',
        ownerName: wallet.owner_name,
      });
      setAmount('');
      setMessage(t('sellerWallet.sentShort', { amount: format(value), method }));
      await load();
    } catch {
      setError(t('sellerWallet.requestFailed'));
    }
  };

  const pending = transactions.filter((t) => t.type === 'PAYOUT' && t.status === 'pending');

  if (loading) return <div className="mx-auto h-48 max-w-3xl animate-pulse rounded-2xl bg-secondary" />;

  return (
    <InfoPage
      icon={WalletIcon}
      title={t('myWallet.title')}
      subtitle={t('myWallet.subtitle')}
    >
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground">
        <p className="flex items-center gap-2 text-xs font-semibold opacity-90">
          <WalletIcon className="h-4 w-4" /> {t('wallet.balance')}
        </p>
        <p className="mt-2 text-3xl font-black">{format(wallet?.balance_usd || 0)}</p>
        {Number(wallet?.pending_usd) > 0 && (
          <p className="mt-1 text-xs opacity-90">{t('wallet.pending', { amount: format(wallet.pending_usd) })}</p>
        )}
        <p className="mt-3 text-[11px] opacity-80">
          {t('myWallet.note')}
        </p>
      </section>

      <InfoSection title={t('myWallet.requestTitle')}>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t('sellerWallet.amountUsd')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {message && <p className="text-xs text-primary">{message}</p>}
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            <Banknote className="h-4 w-4" /> {t('sellerWallet.sendRequest')}
          </button>
          <p className="flex items-start gap-1.5 text-[11px]">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('myWallet.heldNote')}
          </p>
        </form>
      </InfoSection>

      {!!pending.length && (
        <InfoSection title={t('myWallet.pendingTitle', { count: pending.length })}>
          {pending.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold text-foreground">{tx.description}</p>
                <p className="text-[11px]">{tx.reference} · {formatDateTime(tx.created_date)}</p>
              </div>
              <span className="text-sm font-bold">{format(tx.amount_usd)}</span>
            </div>
          ))}
        </InfoSection>
      )}

      <InfoSection title={t('wallet.history')}>
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
                  <p className="truncate text-xs font-semibold text-foreground">
                    {tx.description || (TYPE_KEYS[tx.type] ? t(TYPE_KEYS[tx.type]) : tx.type)}
                  </p>
                  <p className="text-[11px]">
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
      </InfoSection>

      <InfoSection title="Vendeur ou créateur ?">
        <p>
          Les soldes de vos boutiques et de vos commissions créateur se retirent depuis la page dédiée aux demandes de
          retrait.
        </p>
        <Link to="/payout-requests" className="inline-block rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
          Demandes de retrait partenaires
        </Link>
      </InfoSection>
    </InfoPage>
  );
}