import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Wallet as WalletIcon, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import EmptyState from '@/components/EmptyState';
import { requestWithdrawal } from '@/lib/wallet';
import { useCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/format';

const METHODS = ['M-Pesa', 'Airtel Money', 'Orange Money', 'Virement bancaire'];

const STATUS = {
  pending: { label: 'En attente', icon: Clock, className: 'text-amber-600' },
  posted: { label: 'Payé', icon: CheckCircle2, className: 'text-emerald-600' },
  reversed: { label: 'Refusé — recrédité', icon: XCircle, className: 'text-destructive' },
};

export default function PayoutRequests() {
  const { format } = useCurrency();
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(METHODS[0]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (me) => {
    const [sellers, creators] = await Promise.all([
      base44.entities.Seller.filter({ email: me.email }).catch(() => []),
      base44.entities.Creator.filter({ email: me.email }).catch(() => []),
    ]);
    const owners = [
      ...sellers.map((s) => ({ type: 'seller', id: s.id })),
      ...creators.map((c) => ({ type: 'creator', id: c.id })),
    ];
    const found = (
      await Promise.all(
        owners.map((o) => base44.entities.Wallet.filter({ owner_type: o.type, owner_id: o.id }).catch(() => [])),
      )
    ).flat();
    setWallets(found);
    setSelected((prev) => prev || found[0]?.id || '');

    const txs = found.length
      ? (
          await Promise.all(
            found.map((w) =>
              base44.entities.WalletTransaction.filter({ wallet_id: w.id, type: 'PAYOUT' }, '-created_date', 50).catch(() => []),
            ),
          )
        ).flat()
      : [];
    setTransactions(txs.sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || ''))));
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      setUser(me);
      if (me?.email) await load(me);
      else setLoading(false);
    })();
  }, []);

  const wallet = wallets.find((w) => w.id === selected) || null;
  const balance = wallets.reduce((s, w) => s + (Number(w.balance_usd) || 0), 0);
  const pending = transactions.filter((t) => t.status === 'pending');

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const value = Number(amount);
      if (!wallet || !value || value <= 0 || value > (wallet.balance_usd || 0)) return;
      await requestWithdrawal({
        wallet,
        amount: value,
        method,
        ownerType: wallet.owner_type,
        ownerName: wallet.owner_name,
      });
      setAmount('');
      setMessage(`Demande de retrait de ${format(value)} envoyée via ${method}.`);
      await load(user);
    } catch {
      setError("La demande n'a pas pu être envoyée. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="mx-auto h-48 max-w-3xl animate-pulse rounded-2xl bg-secondary" />;

  return (
    <InfoPage
      icon={Banknote}
      title="Demandes de retrait"
      subtitle="Retirez le solde de vos boutiques et de vos commissions créateur, suivez les demandes en cours et l’historique des versements."
    >
      {!wallets.length ? (
        <EmptyState
          icon={WalletIcon}
          title="Aucun portefeuille partenaire"
          description="Aucune boutique ni compte créateur n’est relié à votre adresse e-mail. Contactez l’équipe pour rattacher votre activité."
          actionTo="/sell-with-us"
          actionLabel="Devenir vendeur"
        />
      ) : (
        <>
          <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground">
            <p className="flex items-center gap-2 text-xs font-semibold opacity-90">
              <WalletIcon className="h-4 w-4" /> Solde total disponible
            </p>
            <p className="mt-2 text-3xl font-black">{format(balance)}</p>
            <p className="mt-1 text-[11px] opacity-90">
              {wallets.length} portefeuille(s) · {pending.length} demande(s) en attente
            </p>
          </section>

          <InfoSection title="Nouvelle demande">
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                {wallets.length > 1 && (
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.owner_name} — {w.owner_type} ({format(w.balance_usd || 0)})
                      </option>
                    ))}
                  </select>
                )}
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
              <button type="submit" disabled={saving} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Envoi…' : 'Envoyer la demande'}</button>
              <p className="text-[11px]">
                Le montant est bloqué dès la demande et versé après validation par l’équipe. Un refus recrédite
                automatiquement le portefeuille.
              </p>
            </form>
          </InfoSection>
        </>
      )}

      {!!transactions.length && (
        <InfoSection title="Historique des retraits">
          <div className="space-y-2">
            {transactions.map((t) => {
              const status = STATUS[t.status] || STATUS.pending;
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                  <status.icon className={`h-4 w-4 shrink-0 ${status.className}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{t.description || 'Retrait'}</p>
                    <p className="text-[11px]">
                      {t.owner_name} · {t.reference || '—'} · {formatDateTime(t.created_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{format(t.amount_usd)}</p>
                    <p className={`text-[11px] ${status.className}`}>{status.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </InfoSection>
      )}

      <InfoSection title="Écritures complètes">
        <p>Le détail de chaque mouvement (ventes, commissions, remboursements) reste consultable dans votre espace partenaire.</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/seller/wallet" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            Portefeuille vendeur
          </Link>
          <Link to="/creator" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            Espace créateur
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}