import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Banknote, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import EmptyState from '@/components/EmptyState';
import { requestWithdrawal } from '@/lib/wallet';
import { getSessionId } from '@/lib/session';
import { useCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/format';

const METHODS = ['M-Pesa', 'Airtel Money', 'Orange Money', 'Virement bancaire'];
const TYPE_LABELS = {
  CREDIT: 'Crédit',
  DEBIT: 'Débit',
  REFUND: 'Remboursement',
  COMMISSION: 'Commission',
  PAYOUT: 'Versement',
  ADJUSTMENT: 'Ajustement',
};

export default function MyWallet() {
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
    const wallets = await base44.entities.Wallet.filter({ owner_type: 'customer', owner_id: getSessionId() }).catch(() => []);
    const mine = wallets[0] || null;
    setWallet(mine);
    setTransactions(
      mine ? await base44.entities.WalletTransaction.filter({ wallet_id: mine.id }, '-created_date', 50).catch(() => []) : [],
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    const value = Number(amount);
    if (!wallet) {
      setError("Aucun portefeuille actif : votre premier remboursement le créera.");
      return;
    }
    if (!value || value <= 0) {
      setError('Saisissez un montant valide.');
      return;
    }
    if (value > (wallet.balance_usd || 0)) {
      setError('Montant supérieur au solde disponible.');
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
      setMessage(`Demande de retrait de ${format(value)} envoyée via ${method}.`);
      await load();
    } catch {
      setError("La demande n'a pas pu être envoyée. Réessayez.");
    }
  };

  const pending = transactions.filter((t) => t.type === 'PAYOUT' && t.status === 'pending');

  if (loading) return <div className="mx-auto h-48 max-w-3xl animate-pulse rounded-2xl bg-secondary" />;

  return (
    <InfoPage
      icon={WalletIcon}
      title="Mon portefeuille"
      subtitle="Votre solde Congo Commerce, le détail des écritures et vos demandes de retrait par mobile money."
    >
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground">
        <p className="flex items-center gap-2 text-xs font-semibold opacity-90">
          <WalletIcon className="h-4 w-4" /> Solde disponible
        </p>
        <p className="mt-2 text-3xl font-black">{format(wallet?.balance_usd || 0)}</p>
        {Number(wallet?.pending_usd) > 0 && (
          <p className="mt-1 text-xs opacity-90">En attente : {format(wallet.pending_usd)}</p>
        )}
        <p className="mt-3 text-[11px] opacity-80">
          Crédits de remboursement et bons d’achat. Le portefeuille est tenu en partie double : chaque mouvement crée
          une écriture.
        </p>
      </section>

      <InfoSection title="Demander un retrait">
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant en USD"
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
            <Banknote className="h-4 w-4" /> Envoyer la demande
          </button>
          <p className="flex items-start gap-1.5 text-[11px]">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Le montant est bloqué sur votre solde dès la demande, puis versé après validation par notre équipe. Un
            refus recrédite automatiquement le portefeuille.
          </p>
        </form>
      </InfoSection>

      {!!pending.length && (
        <InfoSection title={`Retraits en attente (${pending.length})`}>
          {pending.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold text-foreground">{t.description}</p>
                <p className="text-[11px]">{t.reference} · {formatDateTime(t.created_date)}</p>
              </div>
              <span className="text-sm font-bold">{format(t.amount_usd)}</span>
            </div>
          ))}
        </InfoSection>
      )}

      <InfoSection title="Historique des mouvements">
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
                  <p className="truncate text-xs font-semibold text-foreground">
                    {t.description || TYPE_LABELS[t.type] || t.type}
                  </p>
                  <p className="text-[11px]">
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