import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, PackageX, Minus, Plus, Save, Boxes } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import DashboardNav from '@/components/DashboardNav';
import { Image } from '@/components/ui/image';
import { formatUSD } from '@/lib/format';

const LOW_STOCK = 5;

const LINKS = [
  { to: '/seller-portal', label: 'Portail' },
  { to: '/seller/products', label: 'Produits' },
  { to: '/inventory-management', label: 'Stock', end: true },
  { to: '/seller/orders', label: 'Commandes' },
  { to: '/seller/wallet', label: 'Portefeuille' },
];

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'low', label: 'Stock faible' },
  { id: 'out', label: 'Rupture' },
];

export default function InventoryManagement() {
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [products, setProducts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      if (!seller) {
        setLoading(false);
        return;
      }
      const rows = await base44.entities.Product.filter({ seller_id: seller.id }, 'title', 200).catch(() => []);
      setProducts(rows);
      setLoading(false);
    })();
  }, [seller]);

  const stockOf = (p) => Number(p.stock) || 0;
  const low = products.filter((p) => stockOf(p) > 0 && stockOf(p) <= LOW_STOCK);
  const out = products.filter((p) => stockOf(p) <= 0);
  const visible = products.filter((p) => {
    if (filter === 'low') return stockOf(p) > 0 && stockOf(p) <= LOW_STOCK;
    if (filter === 'out') return stockOf(p) <= 0;
    return true;
  });

  const saveStock = async (p, value) => {
    const next = Math.max(0, Number(value) || 0);
    setSavingId(p.id);
    try {
      await base44.entities.Product.update(p.id, { stock: next });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, stock: next } : x)));
      setDrafts((prev) => ({ ...prev, [p.id]: String(next) }));
    } finally {
      setSavingId(null);
    }
  };

  if (loadingSeller || loading) {
    return (
      <div className="space-y-3 pb-8">
        <div className="h-9 w-64 animate-pulse rounded-full bg-secondary" />
        <div className="h-24 animate-pulse rounded-2xl bg-secondary" />
        <div className="h-64 animate-pulse rounded-2xl bg-secondary" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Boxes className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 font-semibold">Aucune boutique associée à votre compte</p>
        <p className="mt-1 text-sm text-muted-foreground">
          L'administration doit rattacher une boutique à l'adresse e-mail avec laquelle vous vous connectez.
        </p>
        <Link to="/seller-application" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          Déposer une candidature vendeur
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Gestion du stock" links={LINKS} />

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Boxes, label: 'Références', value: products.length, tone: 'text-primary' },
          { icon: AlertTriangle, label: `Stock ≤ ${LOW_STOCK}`, value: low.length, tone: 'text-amber-600' },
          { icon: PackageX, label: 'En rupture', value: out.length, tone: 'text-destructive' },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3.5">
            <k.icon className={`h-4 w-4 ${k.tone}`} />
            <p className="mt-1.5 text-lg font-bold">{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {(low.length > 0 || out.length > 0) && (
        <section className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Alertes de réapprovisionnement
          </h2>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {out.slice(0, 5).map((p) => (
              <li key={p.id}>
                • <span className="font-semibold text-foreground">{p.title}</span> est en rupture : la fiche reste visible mais
                les clients ne peuvent plus commander.
              </li>
            ))}
            {low.slice(0, 5).map((p) => (
              <li key={p.id}>
                • <span className="font-semibold text-foreground">{p.title}</span> : plus que {stockOf(p)} en stock.
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
              filter === f.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.map((p) => {
          const stock = stockOf(p);
          const value = drafts[p.id] ?? String(stock);
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-2.5">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                <Image src={p.images?.[0]} alt={p.title} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatUSD(p.price_usd)} · {p.sold_count || 0} vendus · {p.status === 'published' ? 'en ligne' : 'hors ligne'}
                </p>
                <p
                  className={`text-[11px] font-semibold ${
                    stock <= 0 ? 'text-destructive' : stock <= LOW_STOCK ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {stock <= 0 ? 'Rupture de stock' : `${stock} en stock`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => saveStock(p, stock - 1)}
                  disabled={stock <= 0}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-40"
                  aria-label="Retirer une unité"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={(e) => setDrafts({ ...drafts, [p.id]: e.target.value })}
                  className="h-9 w-16 rounded-lg border border-border bg-background px-2 text-center text-sm"
                />
                <button
                  type="button"
                  onClick={() => saveStock(p, stock + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border"
                  aria-label="Ajouter une unité"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => saveStock(p, value)}
                  disabled={savingId === p.id || String(stock) === String(value)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5" /> {savingId === p.id ? '…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          );
        })}
        {!visible.length && (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            {products.length ? 'Aucun produit dans ce filtre.' : 'Aucun produit dans votre boutique pour le moment.'}
          </p>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Les quantités sont mises à jour au fur et à mesure des ventes. Passez à {LOW_STOCK} unités ou moins pour déclencher une
        alerte ici et sur le <Link to="/seller-portal" className="font-semibold text-primary">portail vendeur</Link>.
      </p>
    </div>
  );
}