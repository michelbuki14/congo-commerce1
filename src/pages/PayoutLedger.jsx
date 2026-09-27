import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import { downloadCsv, downloadPdf } from '@/lib/export';
import { formatUSD } from '@/lib/format';

const TYPES = ['CREDIT', 'DEBIT', 'COMMISSION', 'PAYOUT', 'REFUND', 'ADJUSTMENT'];
const STATUSES = ['posted', 'pending', 'reversed'];

const TYPE_LABELS = {
  CREDIT: 'Crédit',
  DEBIT: 'Débit',
  COMMISSION: 'Commission',
  PAYOUT: 'Retrait',
  REFUND: 'Remboursement',
  ADJUSTMENT: 'Ajustement',
};

const STATUS_TONE = {
  posted: 'bg-emerald-100 text-emerald-900',
  pending: 'bg-amber-100 text-amber-900',
  reversed: 'bg-red-100 text-red-900',
};

const COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'direction', label: 'Sens' },
  { key: 'amount', label: 'Montant USD' },
  { key: 'balance', label: 'Solde après' },
  { key: 'status', label: 'Statut' },
  { key: 'reference', label: 'Référence' },
  { key: 'description', label: 'Libellé' },
];

export default function PayoutLedger() {
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!seller && !user) return;
    (async () => {
      const [byName, byEmail] = await Promise.all([
        seller ? base44.entities.Wallet.filter({ owner_name: seller.name }).catch(() => []) : [],
        user ? base44.entities.Wallet.filter({ owner_email: user.email }).catch(() => []) : [],
      ]);
      const found = byName[0] || byEmail[0] || null;
      setWallet(found);
      if (found) {
        const txs = await base44.entities.WalletTransaction.filter({ wallet_id: found.id }, '-created_date', 300).catch(() => []);
        setRows(txs);
      }
    })().finally(() => setLoading(false));
  }, [seller, user]);

  const visible = useMemo(() => rows.filter((r) => {
    if (type !== 'all' && String(r.type || '') !== type) return false;
    if (status !== 'all' && String(r.status || 'posted') !== status) return false;
    return true;
  }), [rows, type, status]);

  const exportRows = visible.map((r) => ({
    date: new Date(r.created_date).toLocaleString('fr-FR'),
    type: TYPE_LABELS[r.type] || r.type,
    direction: r.direction === 'debit' ? 'Débit' : 'Crédit',
    amount: (r.direction === 'debit' ? -1 : 1) * (Number(r.amount_usd) || 0),
    balance: Number(r.balance_after_usd) || 0,
    status: r.status || 'posted',
    reference: r.reference || r.order_number || '',
    description: r.description || '',
  }));

  if (loadingSeller || loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  if (!wallet) {
    return (
      <div className="space-y-5 pb-8">
        <OpsHeader title="Grand livre des versements" subtitle="Chaque crédit, débit et versement rattaché à votre boutique." />
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          Aucun portefeuille vendeur n'est encore ouvert pour votre boutique. Il est créé automatiquement à votre première vente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader title="Grand livre des versements" subtitle="Chaque crédit, débit et versement rattaché à votre boutique, ligne par ligne.">
        <button
          type="button"
          onClick={() => downloadCsv(`grand-livre-${Date.now()}.csv`, COLUMNS, exportRows)}
          className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
        <button
          type="button"
          onClick={() => downloadPdf(`grand-livre-${Date.now()}.pdf`, 'Grand livre des versements', COLUMNS, exportRows)}
          className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold"
        >
          <FileText className="h-3.5 w-3.5" /> PDF
        </button>
      </OpsHeader>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Solde disponible" value={formatUSD(wallet.balance_usd)} tone="good" />
        <StatCard label="En attente" value={formatUSD(wallet.pending_usd)} hint="versements en cours" tone={Number(wallet.pending_usd) ? 'warn' : 'default'} />
        <StatCard label="Total crédité" value={formatUSD(wallet.lifetime_credit_usd)} />
        <StatCard label="Total débité" value={formatUSD(wallet.lifetime_debit_usd)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setType('all')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${type === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          Tous types
        </button>
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${type === t ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="ml-auto rounded-full border border-input bg-card px-3.5 py-1.5 text-xs font-semibold"
        >
          <option value="all">Tous les statuts</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden grid-cols-12 gap-2 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
          <span className="col-span-2">Date</span>
          <span className="col-span-2">Type</span>
          <span className="col-span-3">Libellé</span>
          <span className="col-span-2 text-right">Montant</span>
          <span className="col-span-2 text-right">Solde après</span>
          <span className="col-span-1 text-right">Statut</span>
        </div>
        <div className="divide-y divide-border">
          {visible.length ? visible.map((r) => {
            const debit = r.direction === 'debit';
            return (
              <div key={r.id} className="grid grid-cols-2 gap-2 px-4 py-3 text-xs md:grid-cols-12 md:items-center">
                <span className="text-muted-foreground md:col-span-2">{new Date(r.created_date).toLocaleDateString('fr-FR')}</span>
                <span className="flex items-center gap-1.5 font-semibold md:col-span-2">
                  {debit ? <ArrowUpRight className="h-3.5 w-3.5 text-red-600" /> : <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />}
                  {TYPE_LABELS[r.type] || r.type}
                </span>
                <span className="col-span-2 truncate text-muted-foreground md:col-span-3">
                  {r.description || r.reference || r.order_number || '—'}
                </span>
                <span className={`text-right font-bold md:col-span-2 ${debit ? 'text-red-600' : 'text-emerald-600'}`}>
                  {debit ? '−' : '+'}{formatUSD(r.amount_usd)}
                </span>
                <span className="text-right text-muted-foreground md:col-span-2">{formatUSD(r.balance_after_usd)}</span>
                <span className="col-span-2 text-right md:col-span-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[r.status || 'posted'] || STATUS_TONE.posted}`}>
                    {r.status || 'posted'}
                  </span>
                </span>
              </div>
            );
          }) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucun mouvement pour ce filtre.</p>
          )}
        </div>
      </section>
    </div>
  );
}