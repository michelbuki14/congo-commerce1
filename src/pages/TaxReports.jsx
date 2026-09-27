import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Receipt } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { downloadCsv, downloadPdf } from '@/lib/export';
import { formatUSD } from '@/lib/format';

const isoDay = (date) => date.toISOString().slice(0, 10);

const COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'invoice', label: 'Facture' },
  { key: 'order', label: 'Commande' },
  { key: 'ht', label: 'Total HT USD' },
  { key: 'vat', label: 'TVA USD' },
  { key: 'total', label: 'Total TTC USD' },
];

export default function TaxReports() {
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(isoDay(new Date(Date.now() - 90 * 86400000)));
  const [to, setTo] = useState(isoDay(new Date()));
  const [paidOnly, setPaidOnly] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list('-created_date', 500).catch(() => []),
      seller
        ? base44.entities.Wallet.filter({ owner_name: seller.name }).catch(() => [])
        : Promise.resolve([]),
    ]).then(async ([allOrders, wallets]) => {
      setOrders(allOrders);
      if (wallets[0]) {
        const rows = await base44.entities.WalletTransaction.filter({ wallet_id: wallets[0].id }, '-created_date', 300).catch(() => []);
        setTxs(rows);
      }
    }).finally(() => setLoading(false));
  }, [seller]);

  const inRange = useMemo(() => {
    const start = new Date(`${from}T00:00:00`).getTime();
    const end = new Date(`${to}T23:59:59`).getTime();
    return orders.filter((o) => {
      const t = new Date(o.created_date).getTime();
      if (!(t >= start && t <= end)) return false;
      if (paidOnly && String(o.payment_status || '').toUpperCase() !== 'PAID') return false;
      return true;
    });
  }, [orders, from, to, paidOnly]);

  const totals = useMemo(() => {
    const sum = (key) => inRange.reduce((acc, o) => acc + (Number(o[key]) || 0), 0);
    const total = sum('total_usd');
    const vat = sum('vat_usd');
    const ht = sum('total_ht_usd') || Math.max(0, total - vat);
    const start = new Date(`${from}T00:00:00`).getTime();
    const end = new Date(`${to}T23:59:59`).getTime();
    const rangeTx = txs.filter((t) => {
      const time = new Date(t.created_date).getTime();
      return time >= start && time <= end;
    });
    const commissions = rangeTx.filter((t) => t.type === 'COMMISSION').reduce((a, t) => a + (Number(t.amount_usd) || 0), 0);
    const payouts = rangeTx.filter((t) => t.type === 'PAYOUT').reduce((a, t) => a + (Number(t.amount_usd) || 0), 0);
    return { ht, vat, total, commissions, payouts, orders: inRange.length };
  }, [inRange, txs, from, to]);

  const exportRows = inRange.map((o) => ({
    date: new Date(o.created_date).toLocaleDateString('fr-FR'),
    invoice: o.invoice_number || '',
    order: o.order_number || '',
    ht: Number(o.total_ht_usd) || 0,
    vat: Number(o.vat_usd) || 0,
    total: Number(o.total_usd) || 0,
  }));

  if (loadingSeller || loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title="Rapports fiscaux"
        subtitle="Synthèse de vos ventes, de la TVA collectée, des commissions et de vos versements sur la période choisie."
      >
        <button
          type="button"
          onClick={() => downloadCsv(`fiscal-${from}-${to}.csv`, COLUMNS, exportRows)}
          className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
        <button
          type="button"
          onClick={() => downloadPdf(`fiscal-${from}-${to}.pdf`, `Rapport fiscal ${from} → ${to}`, COLUMNS, exportRows)}
          className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold"
        >
          <FileText className="h-3.5 w-3.5" /> PDF
        </button>
      </OpsHeader>

      <section className="grid gap-2.5 md:grid-cols-4">
        <div>
          <Label htmlFor="tax-from" className="text-[11px]">Du</Label>
          <Input id="tax-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="tax-to" className="text-[11px]">Au</Label>
          <Input id="tax-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
            <input type="checkbox" checked={paidOnly} onChange={(e) => setPaidOnly(e.target.checked)} />
            Commandes payées uniquement
          </label>
        </div>
        <div className="flex items-end">
          <span className="text-[11px] text-muted-foreground">
            {user?.email ? `Compte : ${user.email}` : ''}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Ventes HT" value={formatUSD(totals.ht)} hint={`${totals.orders} commande(s)`} />
        <StatCard label="TVA collectée" value={formatUSD(totals.vat)} hint="16 % — à reverser" tone={totals.vat ? 'warn' : 'default'} />
        <StatCard label="Total TTC" value={formatUSD(totals.total)} />
        <StatCard label="Commissions plateforme" value={formatUSD(totals.commissions)} hint="frais déduits de vos ventes" />
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold"><Receipt className="h-4 w-4" /> Récapitulatif de la période</h2>
        <dl className="mt-3 grid gap-2 text-xs md:grid-cols-3">
          <div className="rounded-xl bg-secondary/50 p-3">
            <dt className="text-muted-foreground">Chiffre d'affaires HT</dt>
            <dd className="text-base font-bold">{formatUSD(totals.ht)}</dd>
          </div>
          <div className="rounded-xl bg-secondary/50 p-3">
            <dt className="text-muted-foreground">TVA collectée (16 %)</dt>
            <dd className="text-base font-bold">{formatUSD(totals.vat)}</dd>
          </div>
          <div className="rounded-xl bg-secondary/50 p-3">
            <dt className="text-muted-foreground">Versements reçus</dt>
            <dd className="text-base font-bold">{formatUSD(totals.payouts)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Synthèse destinée à votre comptable : elle reprend vos factures et vos mouvements de portefeuille. Elle ne
          remplace pas une déclaration fiscale officielle.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold">Factures de la période</h2>
        </header>
        <div className="divide-y divide-border">
          {exportRows.length ? exportRows.slice(0, 60).map((r) => (
            <div key={`${r.order}-${r.date}`} className="grid grid-cols-2 gap-2 px-4 py-2.5 text-xs md:grid-cols-5">
              <span className="text-muted-foreground">{r.date}</span>
              <span className="font-semibold">{r.invoice || '—'}</span>
              <span>{r.order}</span>
              <span className="text-right">{formatUSD(r.ht)}</span>
              <span className="text-right font-semibold">{formatUSD(r.vat)}</span>
            </div>
          )) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucune commande sur cette période.</p>
          )}
        </div>
      </section>
    </div>
  );
}