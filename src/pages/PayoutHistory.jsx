import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowDownLeft, ArrowUpRight, Banknote, Clock, Wallet as WalletIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import DashboardNav from '@/components/DashboardNav';
import { formatUSD, formatDateTime } from '@/lib/format';

const LINKS = [
  { to: '/seller', key: 'sellerNav.dashboard', end: true },
  { to: '/seller/products', key: 'sellerNav.products' },
  { to: '/seller/orders', key: 'sellerNav.orders' },
  { to: '/seller/wallet', key: 'sellerNav.wallet' },
  { to: '/payout-history', key: 'sellerNav.payouts', end: true },
  { to: '/payout-settings', key: 'sellerNav.payment' },
  { to: '/data-export', key: 'sellerNav.export' },
];

const TABS = [
  { id: 'all', key: 'wallet.tabAll' },
  { id: 'sales', key: 'wallet.tabSales' },
  { id: 'payouts', key: 'wallet.tabPayouts' },
  { id: 'pending', key: 'wallet.tabPending' },
];

export default function PayoutHistory() {
  const { t } = useTranslation();
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    if (loadingSeller) return;
    (async () => {
      if (!seller) {
        setLoading(false);
        return;
      }
      const wallets = await base44.entities.Wallet.filter({ owner_type: 'seller', owner_id: seller.id }).catch(() => []);
      const mine = wallets[0] || null;
      setWallet(mine);
      if (mine) {
        const rows = await base44.entities.WalletTransaction.filter({ wallet_id: mine.id }, '-created_date', 200).catch(() => []);
        setTransactions(rows);
      }
      setLoading(false);
    })();
  }, [seller, loadingSeller]);

  const payouts = transactions.filter((tx) => tx.type === 'PAYOUT');
  const sales = transactions.filter((tx) => tx.direction === 'credit' && tx.type !== 'PAYOUT');
  const pending = transactions.filter((tx) => tx.status === 'pending');

  const visible = transactions.filter((tx) => {
    if (tab === 'sales') return tx.direction === 'credit' && tx.type !== 'PAYOUT';
    if (tab === 'payouts') return tx.type === 'PAYOUT';
    if (tab === 'pending') return tx.status === 'pending';
    return true;
  });

  if (loadingSeller || loading) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;

  if (!seller) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <WalletIcon className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 font-semibold">{t('wallet.noShop')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('wallet.historyTitle')} links={LINKS} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: WalletIcon, key: 'wallet.available', value: formatUSD(wallet?.balance_usd || 0) },
          { icon: Clock, key: 'wallet.awaitingDelivery', value: formatUSD(wallet?.pending_usd || 0) },
          { icon: ArrowDownLeft, key: 'wallet.totalEarned', value: formatUSD(wallet?.lifetime_credit_usd || 0) },
          { icon: Banknote, key: 'wallet.totalWithdrawn', value: formatUSD(wallet?.lifetime_debit_usd || 0) },
        ].map((k) => (
          <div key={k.key} className="rounded-xl border border-border bg-card p-3.5">
            <k.icon className="h-4 w-4 text-primary" />
            <p className="mt-1.5 text-lg font-bold">{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{t(k.key)}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-bold">{t('wallet.payoutStatus')}</h2>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>• <span className="font-semibold text-foreground">{pending.filter((tx) => tx.type === 'PAYOUT').length}</span> {t('wallet.processingCount')}</p>
          <p>• <span className="font-semibold text-foreground">{payouts.filter((tx) => tx.status !== 'pending').length}</span> {t('wallet.settledCount')}</p>
          <p>• <span className="font-semibold text-foreground">{sales.length}</span> {t('wallet.salesCount')}</p>
        </div>
        <Link to="/payout-settings" className="mt-3 inline-block rounded-full border border-border px-4 py-2 text-xs font-semibold">
          {t('wallet.setupPayment')}
        </Link>
      </section>

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTab(opt.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === opt.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            {t(opt.key)}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('wallet.movements')}</h2>
        {visible.length ? (
          <div className="space-y-2">
            {visible.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                {tx.direction === 'credit' ? (
                  <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tx.description || tx.type}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateTime(tx.created_date)} · {tx.reference || '—'} ·{' '}
                    {tx.status === 'pending' ? t('wallet.pendingStatus') : tx.status === 'reversed' ? t('wallet.reversedStatus') : t('wallet.postedStatus')}
                  </p>
                </div>
                <span className={`text-sm font-bold ${tx.direction === 'credit' ? 'text-emerald-600' : ''}`}>
                  {tx.direction === 'credit' ? '+' : '−'}
                  {formatUSD(tx.amount_usd)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('wallet.noFilterMovements')}</p>
        )}
      </section>
    </div>
  );
}