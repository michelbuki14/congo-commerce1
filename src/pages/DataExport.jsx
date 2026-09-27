import React, { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Database } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import DashboardNav from '@/components/DashboardNav';
import { downloadCsv, downloadPdf } from '@/lib/export';
import { formatUSD, formatDate } from '@/lib/format';

const LINKS = [
  { to: '/seller', label: 'Tableau de bord', end: true },
  { to: '/seller/products', label: 'Produits' },
  { to: '/seller/orders', label: 'Commandes' },
  { to: '/seller/wallet', label: 'Portefeuille' },
  { to: '/payout-history', label: 'Retraits' },
  { to: '/payout-settings', label: 'Paiement' },
  { to: '/data-export', label: 'Export', end: true },
];

const DATASETS = [
  {
    id: 'orders',
    label: 'Commandes clients',
    hint: 'Commandes contenant vos articles, avec statut et montant.',
    columns: [
      { key: 'order_number', label: 'Commande' },
      { key: 'date', label: 'Date' },
      { key: 'customer_name', label: 'Client' },
      { key: 'customer_phone', label: 'Téléphone' },
      { key: 'city', label: 'Ville' },
      { key: 'status', label: 'Statut' },
      { key: 'payment_status', label: 'Paiement' },
      { key: 'total_usd', label: 'Total USD' },
    ],
  },
  {
    id: 'sales',
    label: 'Historique des ventes',
    hint: 'Expéditions qui vous sont rattachées, avec vos gains.',
    columns: [
      { key: 'fulfillment_number', label: 'Expédition' },
      { key: 'order_number', label: 'Commande' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Statut' },
      { key: 'items_count', label: 'Articles' },
      { key: 'subtotal_usd', label: 'Sous-total USD' },
      { key: 'seller_payout_usd', label: 'Gains USD' },
    ],
  },
  {
    id: 'products',
    label: 'Catalogue produits',
    hint: 'Vos fiches, prix, stock et statut de publication.',
    columns: [
      { key: 'title', label: 'Produit' },
      { key: 'status', label: 'Statut' },
      { key: 'price_usd', label: 'Prix USD' },
      { key: 'stock', label: 'Stock' },
      { key: 'sold_count', label: 'Vendus' },
      { key: 'category_name', label: 'Catégorie' },
      { key: 'created_date', label: 'Créé le' },
    ],
  },
];

export default function DataExport() {
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [dataset, setDataset] = useState('orders');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [since, setSince] = useState('');

  useEffect(() => {
    if (loadingSeller) return;
    (async () => {
      if (!seller) {
        setLoading(false);
        return;
      }
      const [orders, fulfillments, products] = await Promise.all([
        base44.entities.Order.list('-created_date', 200).catch(() => []),
        base44.entities.FulfillmentOrder.filter({ seller_id: seller.id }, '-created_date', 200).catch(() => []),
        base44.entities.Product.filter({ seller_id: seller.id }, '-created_date', 200).catch(() => []),
      ]);

      setRows({
        orders: orders
          .filter((o) => (o.items || []).some((i) => i.seller_name === seller.name))
          .map((o) => ({
            order_number: o.order_number,
            date: formatDate(o.created_date),
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            city: o.city,
            status: o.status,
            payment_status: o.payment_status,
            total_usd: o.total_usd,
            created_date: o.created_date,
          })),
        sales: fulfillments.map((f) => ({
          fulfillment_number: f.fulfillment_number,
          order_number: f.order_number,
          date: formatDate(f.created_date),
          status: f.status,
          items_count: (f.items || []).length,
          subtotal_usd: f.subtotal_usd,
          seller_payout_usd: f.seller_payout_usd,
          created_date: f.created_date,
        })),
        products: products.map((p) => ({
          title: p.title,
          status: p.status,
          price_usd: p.price_usd,
          stock: p.stock,
          sold_count: p.sold_count,
          category_name: p.category_name,
          created_date: formatDate(p.created_date),
        })),
      });
      setLoading(false);
    })();
  }, [seller, loadingSeller]);

  const active = DATASETS.find((d) => d.id === dataset);
  const all = rows[dataset] || [];
  const filtered = since ? all.filter((r) => !r.created_date || new Date(r.created_date) >= new Date(since)) : all;
  const filename = `${seller?.slug || 'boutique'}-${dataset}-${new Date().toISOString().slice(0, 10)}`;

  if (loadingSeller || loading) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;

  if (!seller) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Database className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 font-semibold">Aucune boutique associée à votre compte</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Export des données" links={LINKS} />

      <div className="grid gap-2 md:grid-cols-3">
        {DATASETS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDataset(d.id)}
            className={`rounded-xl border p-3.5 text-left ${dataset === d.id ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
          >
            <p className="text-sm font-semibold">{d.label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{d.hint}</p>
          </button>
        ))}
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[11px] font-semibold">
            Depuis le
            <input
              type="date"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              className="mt-0.5 block h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <p className="text-[11px] text-muted-foreground">
            {filtered.length} ligne(s) prête(s) à exporter
            {dataset !== 'products' && ` · total ${formatUSD(filtered.reduce((s, r) => s + (r.total_usd || r.subtotal_usd || 0), 0))}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadCsv(`${filename}.csv`, active.columns, filtered)}
            disabled={!filtered.length}
            className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" /> Exporter en CSV
          </button>
          <button
            type="button"
            onClick={() => downloadPdf(`${filename}.pdf`, `${seller.name} — ${active.label}`, active.columns, filtered)}
            disabled={!filtered.length}
            className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            <FileText className="h-4 w-4" /> Exporter en PDF
          </button>
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Download className="h-3.5 w-3.5" /> Les fichiers sont générés dans votre navigateur : aucune donnée n'est envoyée à un
          service externe.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Aperçu</h2>
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] uppercase text-muted-foreground">
                  {active.columns.map((c) => (
                    <th key={c.key} className="whitespace-nowrap py-1.5 pr-4 font-semibold">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 12).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {active.columns.map((c) => (
                      <td key={c.key} className="whitespace-nowrap py-1.5 pr-4">
                        {typeof r[c.key] === 'number' ? r[c.key].toLocaleString('en-US') : String(r[c.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 12 && (
              <p className="mt-2 text-[11px] text-muted-foreground">Aperçu limité à 12 lignes — l'export contient tout.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucune donnée pour ce jeu ou cette période.</p>
        )}
      </section>
    </div>
  );
}