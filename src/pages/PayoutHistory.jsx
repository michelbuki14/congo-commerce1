import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Banknote, Clock, Wallet as WalletIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import DashboardNav from '@/components/DashboardNav';
import { formatUSD, formatDateTime } from '@/lib/format';

const LINKS = [
  { to: '/seller', label: 'Tableau de bord', end: true },
  { to: '/seller/products', label: 'Produits' },
  { to: '/seller/orders', label: 'Commandes' },
  { to: '/seller/wallet', label: 'Portefeuille' },
  { to: '/payout-history', label: 'Retraits', end: true },
  { to: '/payout-settings', label: 'Paiement' },
  { to: '/data-export', label: 'Export' },
];

const TABS = [
  { id: 'all', label: 'Tout' },
  { id: 'sales', label: 'Ventes' },
  { id: 'payouts', label: 'Retraits' },
  { id: 'pending', label: 'En attente' },
];

export default function PayoutHistory() {
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
      const wallets = await base44.entities.Wallet.filter({ owner_type: 'seller', owner_name: seller.name }).catch(() => []);
      const mine = wallets[0] || null;
      setWallet(mine);
      if (mine) {
        const rows = await base44.entities.WalletTransaction.filter({ wallet_id: mine.id }, '-created_date', 200).catch(() => []);
        setTransactions(rows);
      }
      setLoading(false);
    })();
  }, [seller, loadingSeller]);

  const payouts = transactions.filter((t) => t.type === 'PAYOUT');
  const sales = transactions.filter((t) => t.direction === 'credit' && t.type !== 'PAYOUT');
  const pending = transactions.filter((t) => t.status === 'pending');

  const visible = transactions.filter((t) => {
    if (tab === 'sales') return t.direction === 'credit' && t.type !== 'PAYOUT';
    if (tab === 'payouts') return t.type === 'PAYOUT';
    if (tab === 'pending') return t.status === 'pending';
    return true;
  });

  if (loadingSeller || loading) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;

  if (!seller) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <WalletIcon className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 font-semibold">Aucune boutique associée à votre compte</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Historique des retraits" links={LINKS} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: WalletIcon, label: 'Solde retirable', value: formatUSD(wallet?.balance_usd || 0) },
          { icon: Clock, label: 'En attente de livraison', value: formatUSD(wallet?.pending_usd || 0) },
          { icon: ArrowDownLeft, label: 'Total encaissé', value: formatUSD(wallet?.lifetime_credit_usd || 0) },
          { icon: Banknote, label: 'Total retiré', value: formatUSD(wallet?.lifetime_debit_usd || 0) },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3.5">
            <k.icon className="h-4 w-4 text-primary" />
            <p className="mt-1.5 text-lg font-bold">{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-bold">Statut des retraits</h2>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>• <span className="font-semibold text-foreground">{pending.filter((t) => t.type === 'PAYOUT').length}</span> retrait(s) en cours de traitement.</p>
          <p>• <span className="font-semibold text-foreground">{payouts.filter((t) => t.status !== 'pending').length}</span> retrait(s) réglé(s) par l'équipe financière.</p>
          <p>• <span className="font-semibold text-foreground">{sales.length}</span> vente(s) créditée(s) sur la période affichée.</p>
        </div>
        <Link to="/payout-settings" className="mt-3 inline-block rounded-full border border-border px-4 py-2 text-xs font-semibold">
          Configurer mes coordonnées de paiement
        </Link>
      </section>

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Mouvements</h2>
        {visible.length ? (
          <div className="space-y-2">
            {visible.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                {t.direction === 'credit' ? (
                  <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description || t.type}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateTime(t.created_date)} · {t.reference || '—'} ·{' '}
                    {t.status === 'pending' ? 'en attente' : t.status === 'reversed' ? 'annulé' : 'comptabilisé'}
                  </p>
                </div>
                <span className={`text-sm font-bold ${t.direction === 'credit' ? 'text-emerald-600' : ''}`}>
                  {t.direction === 'credit' ? '+' : '−'}
                  {formatUSD(t.amount_usd)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucun mouvement dans ce filtre.</p>
        )}
      </section>
    </div>
  );
}