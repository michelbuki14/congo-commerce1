import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, Wallet as WalletIcon, TrendingUp, Sparkles, Store, Upload, Settings, BarChart3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import { sellerInsights } from '@/lib/ai';
import DashboardNav from '@/components/DashboardNav';
import StatusBadge from '@/components/StatusBadge';
import { formatUSD } from '@/lib/format';

const LINKS = [
  { to: '/seller', label: 'Tableau de bord', end: true },
  { to: '/seller/products', label: 'Produits' },
  { to: '/seller/orders', label: 'Commandes' },
  { to: '/seller/import', label: 'Import fournisseur' },
  { to: '/seller/wallet', label: 'Portefeuille' },
  { to: '/seller/settings', label: 'Boutique' },
];

const TILES = [
  { to: '/seller/products', label: 'Gérer mes produits', icon: Package },
  { to: '/seller/orders', label: 'Traiter les commandes', icon: ShoppingBag },
  { to: '/seller/import', label: 'Importer un produit', icon: Upload },
  { to: '/seller/wallet', label: 'Retirer mes gains', icon: WalletIcon },
  { to: '/seller/settings', label: 'Configurer ma boutique', icon: Settings },
];

export default function SellerDashboard() {
  const { sellers, seller, loading: loadingSeller, selectSeller } = useActiveSeller();
  const [products, setProducts] = useState([]);
  const [fulfillments, setFulfillments] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seller) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      const [p, f, wallets] = await Promise.all([
        base44.entities.Product.filter({ seller_id: seller.id }, '-created_date', 100).catch(() => []),
        base44.entities.FulfillmentOrder.filter({ seller_id: seller.id }, '-created_date', 50).catch(() => []),
        base44.entities.Wallet.filter({ owner_type: 'seller', owner_name: seller.name }).catch(() => []),
      ]);
      if (!alive) return;
      setProducts(p);
      setFulfillments(f);
      setWallet(wallets[0] || null);
      setLoading(false);

      const revenue = f.reduce((s, x) => s + (x.subtotal_usd || 0), 0);
      const top = [...p].sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0)).slice(0, 5).map((x) => x.title);
      const tips = await sellerInsights({ storeName: seller.name, topProducts: top, revenue: Math.round(revenue), orders: f.length });
      if (alive && tips.length) setInsights(tips);
    })();
    return () => {
      alive = false;
    };
  }, [seller]);

  if (loadingSeller) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;

  if (!seller) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Store className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 font-semibold">Aucune boutique disponible</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Créez une boutique depuis l'administration pour commencer à vendre.
        </p>
        <Link to="/admin/users" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          Créer une boutique
        </Link>
      </div>
    );
  }

  const revenue = fulfillments.reduce((s, f) => s + (f.subtotal_usd || 0), 0);
  const pending = fulfillments.filter((f) => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(f.status));
  const published = products.filter((p) => p.status === 'published').length;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Espace vendeur" links={LINKS} />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <Store className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">Boutique gérée :</span>
        <select
          value={seller.id}
          onChange={(e) => selectSeller(e.target.value)}
          className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm"
        >
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: Package, label: 'Produits publiés', value: `${published}/${products.length}` },
            { icon: TrendingUp, label: "Chiffre d'affaires", value: formatUSD(revenue) },
            { icon: ShoppingBag, label: 'À traiter', value: pending.length },
            { icon: WalletIcon, label: 'Solde retirable', value: formatUSD(wallet?.balance_usd || 0) },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-3.5">
              <k.icon className="h-4 w-4 text-primary" />
              <p className="mt-1.5 text-lg font-bold">{k.value}</p>
              <p className="text-[11px] text-muted-foreground">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {!!insights.length && (
        <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Sparkles className="h-4 w-4 text-primary" /> Conseils IA pour votre boutique
          </h2>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {insights.map((t, i) => (
              <li key={i}>• {t}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Dernières commandes</h2>
        {fulfillments.length ? (
          <div className="space-y-2">
            {fulfillments.slice(0, 6).map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{f.order_number}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {f.fulfillment_number} · {(f.items || []).length} article(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={f.status} />
                  <span className="text-sm font-semibold">{formatUSD(f.subtotal_usd)}</span>
                </div>
              </div>
            ))}
            <Link to="/seller/orders" className="inline-block text-xs font-semibold text-primary">
              Voir toutes les commandes
            </Link>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucune commande pour le moment.</p>
        )}
      </section>

      <section className="grid gap-2 md:grid-cols-3">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
            <t.icon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{t.label}</span>
          </Link>
        ))}
        <Link to="/admin" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Vue administration</span>
        </Link>
      </section>
    </div>
  );
}