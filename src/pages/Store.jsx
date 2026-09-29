import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, MapPin, Truck, UserPlus, UserCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import ProductGrid from '@/components/ProductGrid';
import RatingStars from '@/components/RatingStars';
import EmptyState from '@/components/EmptyState';
import { getFollowedIds, toggleFollowId } from '@/lib/session';
import { compactNumber } from '@/lib/format';
import { inTenantScope, resolveStorefrontScope, scopeRecords } from '@/lib/tenancy';

export default function Store() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        let rows = await base44.entities.Seller.filter({ slug });
        if (!rows.length) rows = await base44.entities.Seller.filter({ id: slug }).catch(() => []);
        const found = rows[0];
        const scope = await resolveStorefrontScope();
        if (!found || !inTenantScope(found, scope)) {
          if (alive) setNotFound(true);
          return;
        }
        const items = await base44.entities.Product.filter({ seller_id: found.id, status: 'published' }, '-created_date', 100);
        if (!alive) return;
        setSeller(found);
        setProducts(scopeRecords(items, scope));
        setFollowing(getFollowedIds().includes(found.id));
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const toggleFollow = async () => {
    if (!seller) return;
    const next = toggleFollowId(seller.id);
    const nowFollowing = next.includes(seller.id);
    setFollowing(nowFollowing);
    const user = await base44.auth.me().catch(() => null);
    if (user) {
      const response = await base44.functions.invoke('sellerProfile', { action: 'follow', seller_id: seller.id, follow: nowFollowing }).catch(() => null);
      if (response?.data?.seller) setSeller(response.data.seller);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !seller) {
    return <EmptyState title={t('store.notFound')} description={t('store.notFoundDesc')} actionTo="/" actionLabel={t('store.backHome')} />;
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="relative overflow-hidden rounded-2xl">
        <Image src={seller.banner_url} alt={seller.name} className="h-36 w-full object-cover md:h-52" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-background bg-secondary md:h-20 md:w-20">
            <Image src={seller.logo_url} alt={seller.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 pb-1 text-background">
            <p className="flex items-center gap-1 text-base font-bold md:text-xl">
              {seller.name}
              {seller.verified && <BadgeCheck className="h-5 w-5 text-sky-300" />}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] opacity-90">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {seller.city}, {seller.country}
              </span>
              <span>{t('store.followers', { count: compactNumber(seller.followers_count || 0) })}</span>
              <span>{t('store.items', { count: products.length })}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleFollow}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ${
              following ? 'bg-background/90 text-foreground' : 'bg-primary text-primary-foreground'
            }`}
          >
            {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
            {following ? t('store.following') : t('store.follow')}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-semibold text-muted-foreground">{t('store.storeRating')}</p>
          <RatingStars rating={seller.rating || 0} count={seller.products_count || 0} size="md" />
        </div>
        <div className="rounded-xl border border-border bg-card p-3 md:col-span-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Truck className="h-3.5 w-3.5" /> {t('store.deliveryPickup')}
          </p>
          <p className="mt-0.5 text-sm">{seller.delivery_info || t('store.defaultDelivery')}</p>
        </div>
      </div>

      {seller.description && (
        <section>
          <h2 className="mb-1.5 text-base font-bold">{t('store.about')}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{seller.description}</p>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-bold">{t('store.products', { count: products.length })}</h2>
        <ProductGrid
          products={products}
          emptyState={<EmptyState title={t('store.noProducts')} description={t('store.noProductsDesc')} />}
        />
      </section>
    </div>
  );
}