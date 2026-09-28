import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, ShoppingBag, Wallet as WalletIcon, TrendingUp, Sparkles, Store, Upload, Settings, BarChart3, Boxes, Banknote, CreditCard, FileDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import { sellerInsights } from '@/lib/ai';
import DashboardNav from '@/components/DashboardNav';
import StatusBadge from '@/components/StatusBadge';
import { formatUSD } from '@/lib/format';

const LINKS = [
  { to: '/seller', key: 'sellerNav.dashboard', end: true },
  { to: '/seller/products', key: 'sellerNav.products' },
  { to: '/seller/orders', key: 'sellerNav.orders' },
  { to: '/seller/import', key: 'seller.import' },
  { to: '/seller/wallet', key: 'sellerNav.wallet' },
  { to: '/seller/settings', key: 'sellerNav.shop' },
];

const TILES = [
  { to: '/seller/products', key: 'seller.tileProducts', icon: Package },
  { to: '/seller/orders', key: 'seller.tileOrders', icon: ShoppingBag },
  { to: '/seller/import', key: 'seller.tileImport', icon: Upload },
  { to: '/seller/wallet', key: 'seller.tileWallet', icon: WalletIcon },
  { to: '/seller/settings', key: 'seller.tileSettings', icon: Settings },
  { to: '/seller-portal', key: 'seller.tilePortal', icon: Store },
  { to: '/inventory-management', key: 'seller.tileInventory', icon: Boxes },
  { to: '/payout-history', key: 'seller.tilePayouts', icon: Banknote },
  { to: '/payout-settings', key: 'seller.tilePayment', icon: CreditCard },
  { to: '/data-export', key: 'seller.tileExport', icon: FileDown },
];

export default function SellerDashboard() {
  const { t } = useTranslation();
  const { sellers, seller, isAdmin, loading: loadingSeller, selectSeller } = useActiveSeller();
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
        base44.entities.Wallet.filter({ owner_type: 'seller', owner_id: seller.id }).catch(() => []),
      ]);
      if (!alive) return;
      setProducts(p);
      setFulfillments(f);
      setWallet(wallets[0] || null);
      setLoading(false);

      const tips = await sellerInsights({ sellerId: seller.id });
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
        <p className="mt-2 font-semibold">{t('seller.noShop')}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('seller.noShopDesc')}
        </p>
        {isAdmin && (
          <Link to="/admin/users" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
            {t('seller.createShop')}
          </Link>
        )}
      </div>
    );
  }

  const revenue = fulfillments.reduce((s, f) => s + (f.subtotal_usd || 0), 0);
  const pending = fulfillments.filter((f) => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(f.status));
  const published = products.filter((p) => p.status === 'published').length;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('seller.title')} links={LINKS} />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <Store className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">{t('seller.managedShop')}</span>
        {isAdmin ? (
          <select
            value={seller.id}
            onChange={(e) => selectSeller(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm"
          >
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : (
          <span className="text-sm font-semibold">{seller.name}</span>
        )}
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
            { icon: Package, key: 'seller.publishedProducts', value: `${published}/${products.length}` },
            { icon: TrendingUp, key: 'seller.revenue', value: formatUSD(revenue) },
            { icon: ShoppingBag, key: 'seller.toProcess', value: pending.length },
            { icon: WalletIcon, key: 'wallet.available', value: formatUSD(wallet?.balance_usd || 0) },
          ].map((k) => (
            <div key={k.key} className="rounded-xl border border-border bg-card p-3.5">
              <k.icon className="h-4 w-4 text-primary" />
              <p className="mt-1.5 text-lg font-bold">{k.value}</p>
              <p className="text-[11px] text-muted-foreground">{t(k.key)}</p>
            </div>
          ))}
        </div>
      )}

      {!!insights.length && (
        <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Sparkles className="h-4 w-4 text-primary" /> {t('seller.aiTips')}
          </h2>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {insights.map((tip, i) => (
              <li key={i}>• {tip}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('seller.latestOrders')}</h2>
        {fulfillments.length ? (
          <div className="space-y-2">
            {fulfillments.slice(0, 6).map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{f.order_number}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {f.fulfillment_number} · {t('seller.itemCount', { count: (f.items || []).length })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={f.status} />
                  <span className="text-sm font-semibold">{formatUSD(f.subtotal_usd)}</span>
                </div>
              </div>
            ))}
            <Link to="/seller/orders" className="inline-block text-xs font-semibold text-primary">
              {t('seller.viewAllOrders')}
            </Link>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('seller.noOrders')}</p>
        )}
      </section>

      <section className="grid gap-2 md:grid-cols-3">
        {TILES.map((tile) => (
          <Link key={tile.to} to={tile.to} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
            <tile.icon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{t(tile.key)}</span>
          </Link>
        ))}
        <Link to="/admin" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{t('seller.adminView')}</span>
        </Link>
      </section>
    </div>
  );
}