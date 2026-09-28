import React, { useEffect, useState } from 'react';
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Banknote } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import { requestWithdrawal, WITHDRAWAL_METHOD_IDS } from '@/lib/wallet';
import { useTranslation } from 'react-i18next';
import DashboardNav from '@/components/DashboardNav';
import { formatUSD, formatDateTime } from '@/lib/format';

const LINKS = [
  { to: '/seller', key: 'sellerNav.dashboard', end: true },
  { to: '/seller/products', key: 'sellerNav.products' },
  { to: '/seller/orders', key: 'sellerNav.orders' },
  { to: '/seller/import', key: 'seller.import' },
  { to: '/seller/wallet', key: 'sellerNav.wallet' },
  { to: '/seller/settings', key: 'sellerNav.shop' },
];

const METHODS = ['M-Pesa', 'Airtel Money', 'Orange Money', 'Virement bancaire'];

export default function SellerWallet() {
  const { t } = useTranslation();
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(METHODS[0]);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!seller) return;
    const wallets = await base44.entities.Wallet.filter({ owner_type: 'seller', owner_id: seller.id }).catch(() => []);
    const mine = wallets[0] || null;
    setWallet(mine);
    if (mine) {
      const txs = await base44.entities.WalletTransaction.filter({ wallet_id: mine.id }, '-created_date', 50).catch(() => []);
      setTransactions(txs);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (loadingSeller) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seller, loadingSeller]);

  const submitWithdrawal = async (e) => {
    e.preventDefault();
    setMessage('');
    const value = Number(amount);
    if (!wallet) {
      setMessage(t('sellerWallet.noWallet'));
      return;
    }
    if (!value || value <= 0) {
      setMessage(t('sellerWallet.badAmount'));
      return;
    }
    if (value > (wallet.balance_usd || 0)) {
      setMessage(t('sellerWallet.overBalance'));
      return;
    }
    try {
      const updated = await requestWithdrawal({ wallet, amount: value, method: WITHDRAWAL_METHOD_IDS[method] || 'mpesa' });
      setWallet(updated);
      setAmount('');
      setMessage(t('sellerWallet.sent', { amount: formatUSD(value), method }));
    } catch (err) {
      setMessage(err?.message || t('sellerWallet.failed'));
    }
    await load();
  };

  if (loadingSeller || loading) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('sellerWallet.title')} links={LINKS} />

      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground">
        <p className="flex items-center gap-2 text-xs font-semibold opacity-90">
          <WalletIcon className="h-4 w-4" /> {t('wallet.balance')}
        </p>
        <p className="mt-2 text-3xl font-black">{formatUSD(wallet?.balance_usd || 0)}</p>
        <div className="mt-2 flex gap-4 text-[11px] opacity-90">
          <span>{t('wallet.awaitingDelivery')} : {formatUSD(wallet?.pending_usd || 0)}</span>
          <span>{t('wallet.totalEarned')} : {formatUSD(wallet?.lifetime_credit_usd || 0)}</span>
        </div>
      </section>

      <form onSubmit={submitWithdrawal} className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Banknote className="h-4 w-4 text-primary" /> {t('sellerWallet.requestTitle')}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('sellerWallet.amountUsd')}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
            {METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        {message && <p className="text-xs text-primary">{message}</p>}
        <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          {t('sellerWallet.sendRequest')}
        </button>
        <p className="text-[11px] text-muted-foreground">
          {t('sellerWallet.localSalesNote')}
        </p>
      </form>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('sellerWallet.entries')}</h2>
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
                  <p className="truncate text-sm font-medium">{tx.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateTime(tx.created_date)} · {tx.reference} · {tx.status === 'pending' ? t('wallet.pendingStatus') : t('wallet.postedStatus')}
                  </p>
                </div>
                <span className={`text-sm font-bold ${tx.direction === 'credit' ? 'text-emerald-600' : ''}`}>
                  {tx.direction === 'credit' ? '+' : '−'}{formatUSD(tx.amount_usd)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('sellerWallet.noEntries')}</p>
        )}
      </section>
    </div>
  );
}