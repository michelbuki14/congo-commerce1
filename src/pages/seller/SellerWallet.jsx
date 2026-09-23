import React, { useEffect, useState } from 'react';
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Banknote } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import DashboardNav from '@/components/DashboardNav';
import { formatUSD, formatDateTime } from '@/lib/format';

const LINKS = [
  { to: '/seller', label: 'Tableau de bord', end: true },
  { to: '/seller/products', label: 'Produits' },
  { to: '/seller/orders', label: 'Commandes' },
  { to: '/seller/import', label: 'Import fournisseur' },
  { to: '/seller/wallet', label: 'Portefeuille' },
  { to: '/seller/settings', label: 'Boutique' },
];

const METHODS = ['M-Pesa', 'Airtel Money', 'Orange Money', 'Virement bancaire'];

export default function SellerWallet() {
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(METHODS[0]);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!seller) return;
    const wallets = await base44.entities.Wallet.filter({ owner_type: 'seller', owner_name: seller.name }).catch(() => []);
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

  const requestWithdrawal = async (e) => {
    e.preventDefault();
    setMessage('');
    const value = Number(amount);
    if (!wallet) {
      setMessage('Aucun portefeuille actif : votre premier versement le créera.');
      return;
    }
    if (!value || value <= 0) {
      setMessage('Saisissez un montant valide.');
      return;
    }
    if (value > (wallet.balance_usd || 0)) {
      setMessage('Montant supérieur au solde disponible.');
      return;
    }
    const updated = await base44.entities.Wallet.update(wallet.id, {
      balance_usd: Math.round(((wallet.balance_usd || 0) - value) * 100) / 100,
      lifetime_debit_usd: Math.round(((wallet.lifetime_debit_usd || 0) + value) * 100) / 100,
    });
    await base44.entities.WalletTransaction.create({
      wallet_id: wallet.id,
      owner_type: 'seller',
      owner_name: seller.name,
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
      actor: 'seller',
      entity: 'Wallet',
      entity_id: wallet.id,
      reference: seller.name,
      severity: 'info',
      details: { amount_usd: value, method },
    });
    setWallet(updated);
    setAmount('');
    setMessage(`Demande de retrait de ${formatUSD(value)} envoyée via ${method}.`);
    await load();
  };

  if (loadingSeller || loading) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Portefeuille vendeur" links={LINKS} />

      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground">
        <p className="flex items-center gap-2 text-xs font-semibold opacity-90">
          <WalletIcon className="h-4 w-4" /> Solde disponible
        </p>
        <p className="mt-2 text-3xl font-black">{formatUSD(wallet?.balance_usd || 0)}</p>
        <div className="mt-2 flex gap-4 text-[11px] opacity-90">
          <span>En attente de livraison : {formatUSD(wallet?.pending_usd || 0)}</span>
          <span>Total encaissé : {formatUSD(wallet?.lifetime_credit_usd || 0)}</span>
        </div>
      </section>

      <form onSubmit={requestWithdrawal} className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Banknote className="h-4 w-4 text-primary" /> Demander un retrait
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant en USD"
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
          Envoyer la demande
        </button>
        <p className="text-[11px] text-muted-foreground">
          Les ventes locales sont créditées en attente puis libérées à la livraison confirmée. Chaque mouvement crée une écriture.
        </p>
      </form>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Écritures</h2>
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
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateTime(t.created_date)} · {t.reference} · {t.status === 'pending' ? 'en attente' : 'comptabilisé'}
                  </p>
                </div>
                <span className={`text-sm font-bold ${t.direction === 'credit' ? 'text-emerald-600' : ''}`}>
                  {t.direction === 'credit' ? '+' : '−'}{formatUSD(t.amount_usd)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucune écriture pour le moment.</p>
        )}
      </section>
    </div>
  );
}