import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Zap, Truck, Play, ArrowRight, Store as StoreIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { loadPlatformConfig } from '@/lib/config';
import { Image } from '@/components/ui/image';
import SectionHeader from '@/components/SectionHeader';
import ProductRow from '@/components/ProductRow';
import ProductGrid from '@/components/ProductGrid';
import SellerCard from '@/components/SellerCard';
import ShoppingAssistant from '@/components/ShoppingAssistant';
import EmptyState from '@/components/EmptyState';
import { resolveStorefrontScope, scopeRecords } from '@/lib/tenancy';

export default function Home() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        await loadPlatformConfig();
        const scope = await resolveStorefrontScope();
        const [p, c, s, ct] = await Promise.all([
          base44.entities.Product.filter({ status: 'published' }, '-created_date', 60),
          base44.entities.Category.list('sort_order', 20),
          base44.entities.Seller.filter({ status: 'active' }, '-rating', 8),
          base44.entities.Content.filter({ status: 'published' }, '-likes_count', 10),
        ]);
        if (!alive) return;
        setProducts(scopeRecords(p, scope));
        setCategories(c);
        setSellers(scopeRecords(s, scope));
        setContent(ct);
      } catch {
        // Une coupure réseau ne doit pas vider la page : on propose de réessayer.
        if (alive) setLoadFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const sections = useMemo(() => {
    const local = products.filter((p) => p.source_type !== 'international_supplier');
    const intl = products.filter((p) => p.source_type === 'international_supplier');
    return {
      flash: products.filter((p) => p.is_flash_sale).slice(0, 8),
      featured: products.filter((p) => p.is_featured).slice(0, 8),
      trending: [...products].sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0)).slice(0, 8),
      fresh: products.slice(0, 8),
      local: local.slice(0, 8),
      intl: intl.slice(0, 8),
    };
  }, [products]);

  return (
    <div className="space-y-7 pb-6">
      {loadFailed && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            {t('home.loadFailed')}
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl">
        <Image
          src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=70"
          alt="Congo Commerce"
          className="h-52 w-full object-cover md:h-72"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/55 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center gap-2 p-5 text-background md:p-9">
          <span className="w-fit rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            {t('home.heroBadge')}
          </span>
          <h1 className="max-w-sm text-xl font-black leading-tight md:max-w-lg md:text-3xl">
            {t('home.heroTitle')}
          </h1>
          <p className="max-w-xs text-xs text-background/85 md:max-w-md md:text-sm">
            {t('home.heroSubtitle')}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Link to="/discover" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground md:text-sm">
              {t('home.discoverVideo')}
            </Link>
            <Link to="/categories" className="rounded-full bg-background/20 px-4 py-2 text-xs font-semibold backdrop-blur md:text-sm">
              {t('home.browseCategories')}
            </Link>
            <Link to="/creator" className="w-full text-[11px] font-medium text-background/80 underline md:text-xs">
              {t('home.becomeCreator')}
            </Link>
          </div>
        </div>
      </section>

      {/* Category chips */}
      {!!categories.length && (
        <section>
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:px-0">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/search?category=${c.slug}`}
                className="shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium hover:border-primary"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Flash sale */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold md:text-lg">{t('home.flashSale')}</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{t('home.limitedTime')}</span>
        </div>
        {sections.flash.length ? (
          <ProductRow products={sections.flash} loading={loading} />
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
            {t('home.noFlash')}
          </p>
        )}
      </section>

      <ShoppingAssistant />

      {/* Discovery feed */}
      <section>
        <SectionHeader title={t('home.discovery')} subtitle={t('home.discoverySub')} to="/discover" />
        {loading ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-52 w-32 shrink-0 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : (
          <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-1 md:mx-0 md:px-0">
            {content.slice(0, 8).map((c) => (
              <Link key={c.id} to="/discover" className="relative h-52 w-32 shrink-0 overflow-hidden rounded-xl md:h-64 md:w-40">
                <Image src={c.thumbnail_url || c.media_url} alt={c.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 text-background">
                  <p className="line-clamp-2 text-[10px] font-medium leading-tight">{c.title}</p>
                  <p className="mt-0.5 text-[10px] opacity-80">@{c.creator_handle}</p>
                </div>
                <Play className="absolute left-2 top-2 h-5 w-5 text-background drop-shadow" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Trending */}
      <section>
        <SectionHeader title={t('home.trending')} subtitle={t('home.trendingSub')} to="/search?sort=sold" />
        <ProductGrid products={sections.trending} loading={loading} skeletonCount={4} />
      </section>

      {/* Featured */}
      {!!sections.featured.length && (
        <section>
          <SectionHeader title={t('home.featured')} to="/search?sort=rating" />
          <ProductRow products={sections.featured} />
        </section>
      )}

      {/* Local sellers */}
      <section>
        <SectionHeader title={t('home.localSellers')} subtitle={t('home.localSellersSub')} />
        {loading ? (
          <div className="grid gap-2.5 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : sellers.length ? (
          <div className="grid gap-2.5 md:grid-cols-2">
            {sellers.slice(0, 6).map((s) => (
              <SellerCard key={s.id} seller={s} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={StoreIcon}
            title={t('home.noSellers')}
            description={t('home.noSellersDesc')}
            actionTo="/seller"
            actionLabel={t('home.openShop')}
          />
        )}
      </section>

      {/* Local products */}
      {!!sections.local.length && (
        <section>
          <SectionHeader title={t('home.localProducts')} subtitle={t('home.localProductsSub')} to="/search?source=local" />
          <ProductRow products={sections.local} />
        </section>
      )}

      {/* New arrivals */}
      {!!sections.fresh.length && (
        <section>
          <SectionHeader title={t('home.newArrivals')} to="/search?sort=new" />
          <ProductRow products={sections.fresh} />
        </section>
      )}

      {/* International */}
      {!!sections.intl.length && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold md:text-lg">{t('home.intlTitle')}</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            {t('home.intlNote')}
          </p>
          <ProductRow products={sections.intl} />
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { icon: Truck, title: t('home.featTrackedTitle'), text: t('home.featTrackedText') },
            { icon: Zap, title: t('home.featMobileTitle'), text: t('home.featMobileText') },
            { icon: StoreIcon, title: t('home.featVerifiedTitle'), text: t('home.featVerifiedText') },
            { icon: ArrowRight, title: t('home.featProtectionTitle'), text: t('home.featProtectionText') },
          ].map((f) => (
            <div key={f.title} className="flex gap-3">
              <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}