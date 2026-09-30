import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, ShoppingBag, Wallet as WalletIcon, TrendingUp, Sparkles, Store, Upload, Settings, BarChart3, Boxes, Banknote, CreditCard, FileDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import { sellerInsights } from '@/lib/ai';
import DashboardNav from '@/components/DashboardNav';
import StatusBadge from '@/components/StatusBadge';
import { Image } from '@/components/ui/image';
import { formatUSD } from '@/lib/format';

const HERO_IMAGE = 'https://media.base44.com/images/public/6ab43a1371d65d1a911b0fe7/5c6b76710_generated_016c1e6f.jpg';

const LINKS = [
  { to: '/seller', key: 'sellerNav.dashboard', end: true },
  { to: '/seller/products', key: 'sellerNav.products' },
  { to: '/seller/orders', key: 'sellerNav.orders' },
  { to: '/seller/import', key: 'seller.import' },
  { to: '/seller/wallet', key: 'sellerNav.wallet' },
  { to: '/seller/settings', key: 'seller.shop' },
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

  if (loadingSeller) {
    return (
      <div className="paper-console">
        <div className="paper-skeleton-block h-40 animate-pulse" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="paper-console">
        <div className="paper-empty">
          <Store className="paper-empty-icon" />
          <p className="paper-empty-title">{t('seller.noShop')}</p>
          <p className="paper-empty-desc">{t('seller.noShopDesc')}</p>
          {isAdmin && (
            <Link to="/admin/users" className="paper-empty-cta">{t('seller.createShop')}</Link>
          )}
        </div>
      </div>
    );
  }

  const revenue = fulfillments.reduce((s, f) => s + (f.subtotal_usd || 0), 0);
  const pending = fulfillments.filter((f) => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(f.status));
  const published = products.filter((p) => p.status === 'published').length;

  const stats = [
    { icon: Package, key: 'seller.publishedProducts', value: `${published}/${products.length}` },
    { icon: TrendingUp, key: 'seller.revenue', value: formatUSD(revenue) },
    { icon: ShoppingBag, key: 'seller.toProcess', value: pending.length },
    { icon: WalletIcon, key: 'wallet.available', value: formatUSD(wallet?.balance_usd || 0) },
  ];

  return (
    <div className="paper-console">
      <div className="paper-hero">
        <Image src={HERO_IMAGE} alt="" />
      </div>

      <DashboardNav title={t('seller.title')} links={LINKS} variant="paper" />

      <div className="paper-shop">
        <span className="paper-shopmark" />
        <strong>{t('seller.managedShop')}</strong>
        {isAdmin ? (
          <select
            value={seller.id}
            onChange={(e) => selectSeller(e.target.value)}
            aria-label={t('seller.managedShop')}
            className="paper-shop-select"
          >
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : (
          <span className="paper-shopname">{seller.name}</span>
        )}
      </div>

      <main className="paper-main">
        <div className="paper-col">
          <section className="paper-section">
            <h2 className="paper-label">{t('seller.overview', { defaultValue: 'Aperçu' })}</h2>
            {loading ? (
              <div className="paper-stats">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="paper-stat paper-skeleton-block animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="paper-stats">
                {stats.map((k) => (
                  <div key={k.key} className="paper-stat">
                    <k.icon className="paper-stat-icon" />
                    <p className="paper-value">{k.value}</p>
                    <p className="paper-caption">{t(k.key)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {!!insights.length && (
            <section className="paper-section paper-ai">
              <h2 className="paper-label">
                <Sparkles className="paper-stat-icon" /> {t('seller.aiTips')}
              </h2>
              <ul className="paper-tips">
                {insights.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="paper-col paper-col-right">
          <section className="paper-section paper-orders">
            <h2 className="paper-label">{t('seller.latestOrders')}</h2>
            {fulfillments.length ? (
              <>
                <div className="paper-orderlist">
                  {fulfillments.slice(0, 6).map((f) => (
                    <div key={f.id} className="paper-order">
                      <div className="min-w-0">
                        <div className="paper-orderno">{f.order_number}</div>
                        <div className="paper-meta">
                          {f.fulfillment_number} · {t('seller.itemCount', { count: (f.items || []).length })}
                        </div>
                      </div>
                      <div className="paper-details">
                        <StatusBadge status={f.status} variant="paper" />
                        <span className="paper-money">{formatUSD(f.subtotal_usd)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/seller/orders" className="paper-all">
                  {t('seller.viewAllOrders')}
                </Link>
              </>
            ) : (
              <p className="paper-caption">{t('seller.noOrders')}</p>
            )}
          </section>
        </div>

        <section className="paper-tiles">
          {TILES.map((tile) => (
            <Link key={tile.to} to={tile.to} className="paper-tile">
              <tile.icon className="paper-tile-icon" />
              <span>{t(tile.key)}</span>
            </Link>
          ))}
          {isAdmin && <Link to="/admin" className="paper-tile">
                      <BarChart3 className="paper-tile-icon" />
                      <span>{t('seller.adminView')}</span>
                    </Link>}
        </section>
      </main>
    </div>
  );
}