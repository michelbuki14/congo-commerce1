import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Heart, Truck, ShieldCheck, Store as StoreIcon, ChevronRight, PackageCheck, Zap, Share2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { useCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';
import { computePriceBreakdown } from '@/lib/pricing';
import { getProfile, getReferralCode, isWishlisted, toggleWishlist } from '@/lib/session';
import { trackEvent } from '@/lib/tracking';
import RatingStars from '@/components/RatingStars';
import QuantityStepper from '@/components/QuantityStepper';
import PriceBreakdown from '@/components/PriceBreakdown';
import MobileActionBar from '@/components/MobileActionBar';
import ProductRow from '@/components/ProductRow';
import ProductReviews from '@/components/ProductReviews';
import Product3DViewer from '@/components/Product3DViewer';
import SectionHeader from '@/components/SectionHeader';
import { compactNumber } from '@/lib/format';
import { inTenantScope, resolveStorefrontScope, scopeRecords } from '@/lib/tenancy';

export default function ProductDetail() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { format } = useCurrency();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [zone, setZone] = useState(null);
  const [sellerSlug, setSellerSlug] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [view3d, setView3d] = useState(false);
  const [selection, setSelection] = useState({});
  const [qty, setQty] = useState(1);
  const [liked, setLiked] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    setView3d(false);
    setActiveImage(0);
    (async () => {
      try {
        const bySlug = await base44.entities.Product.filter({ slug });
        const p = bySlug[0] || (await base44.entities.Product.get(slug));
        const scope = await resolveStorefrontScope();
        if (!alive) return;
        if (!inTenantScope(p, scope)) {
          setNotFound(true);
          return;
        }
        setProduct(p);
        setLiked(isWishlisted(p.id));
        const initial = {};
        (p.variants || []).forEach((v) => {
          if (v?.name && v?.options?.length) initial[v.name] = v.options[0];
        });
        setSelection(initial);

        const city = getProfile().city;
        const [rel, zones, seller, category] = await Promise.all([
          base44.entities.Product.filter({ category_id: p.category_id, status: 'published' }, '-sold_count', 12).catch(() => []),
          base44.entities.DeliveryZone.filter({ city }).catch(() => []),
          p.seller_id ? base44.entities.Seller.get(p.seller_id).catch(() => null) : Promise.resolve(null),
          p.category_id ? base44.entities.Category.get(p.category_id).catch(() => null) : Promise.resolve(null),
        ]);
        if (!alive) return;
        setRelated(scopeRecords(rel, scope).filter((r) => r.id !== p.id).slice(0, 8));
        setZone(zones[0] || null);
        setSellerSlug(seller?.slug || '');
        setCategorySlug(category?.slug || '');
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

  const breakdown = useMemo(() => (product ? computePriceBreakdown(product) : null), [product]);

  const variantLabel = useMemo(() => {
    const parts = Object.entries(selection).map(([k, v]) => `${k}: ${v}`);
    return parts.length ? parts.join(', ') : null;
  }, [selection]);

  // WhatsApp share: the product link carries the visitor's active referral code.
  const whatsAppHref = useMemo(() => {
    if (!product) return '#';
    const page = `${window.location.origin}/product/${product.slug || product.id}`;
    const code = getReferralCode();
    const url = code ? `${page}?ref=${encodeURIComponent(code)}` : page;
    return `https://wa.me/?text=${encodeURIComponent(`${product.title} — ${url}`)}`;
  }, [product]);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const add = (goToCheckout = false) => {
    if (!product) return;
    addItem(product, qty, variantLabel);
    if (goToCheckout) {
      trackEvent('order_checkout_started', { product_id: product.id, value_usd: product.price_usd });
      navigate('/checkout');
    } else {
      flash(t('productDetail.addedToCart'));
    }
  };

  if (loading) {
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-2xl bg-secondary" />
        <div className="space-y-3">
          <div className="h-6 w-3/4 animate-pulse rounded bg-secondary" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-secondary" />
          <div className="h-8 w-1/2 animate-pulse rounded bg-secondary" />
          <div className="h-24 animate-pulse rounded bg-secondary" />
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <p className="font-semibold">{t('productDetail.notFound')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('productDetail.notFoundDesc')}</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {t('productDetail.backHome')}
        </Link>
      </div>
    );
  }

  const isIntl = product.source_type === 'international_supplier';
  const outOfStock = Number(product.stock) <= 0;

  return (
    <div className="space-y-6 pb-28 md:pb-6">
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">
          {toast}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 md:gap-8">
        {/* Gallery */}
        <div className="space-y-2">
          {product.model_3d_url && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView3d(false)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${!view3d ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
              >
                {t('productDetail.photo')}
              </button>
              <button
                type="button"
                onClick={() => setView3d(true)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${view3d ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
              >
                {t('productDetail.view3d')}
              </button>
            </div>
          )}
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-secondary">
            {view3d && product.model_3d_url ? (
              <Product3DViewer modelUrl={product.model_3d_url} fallbackImage={product.images?.[activeImage]} title={product.title} />
            ) : (
              <Image src={product.images?.[activeImage]} alt={`${product.title} - image principale`} className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => setLiked(toggleWishlist(product.id).includes(product.id))}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-card/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t('productDetail.favorite')}
            >
              <Heart className={`h-5 w-5 ${liked ? 'fill-primary text-primary' : ''}`} aria-hidden="true" />
            </button>
            {product.is_flash_sale && (
              <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-amber-950" aria-label="Flash sale">
                <Zap className="h-3 w-3" aria-hidden="true" /> {t('productDetail.flashSale')}
              </span>
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Miniatures du produit">
              {product.images.map((img, i) => (
                <button
                  key={img + i}
                  type="button"
                  role="tab"
                  aria-selected={i === activeImage}
                  aria-label={`${t('productDetail.image')} ${i + 1} sur ${product.images.length}`}
                  onClick={() => setActiveImage(i)}
                  className={`min-h-16 min-w-16 shrink-0 overflow-hidden rounded-lg border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i === activeImage ? 'border-primary' : 'border-transparent'}`}
                >
                  <Image src={img} alt={`${product.title} - vue ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isIntl ? 'bg-sky-100 text-sky-900' : 'bg-emerald-100 text-emerald-900'}`}>
                {isIntl ? t('productDetail.intlBadge') : t('productDetail.localBadge')}
              </span>
              {product.category_name && categorySlug && (
                <Link to={`/search?category=${categorySlug}`} className="text-[11px] text-muted-foreground underline">
                  {product.category_name}
                </Link>
              )}
            </div>
            <h1 className="text-lg font-bold leading-snug md:text-2xl">{product.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <RatingStars rating={product.rating || 0} count={product.reviews_count || 0} size="md" />
              <span className="text-xs text-muted-foreground">{t('product.soldCount', { count: compactNumber(product.sold_count || 0) })}</span>
              <a
                href={whatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-foreground"
              >
                <Share2 className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
              </a>
            </div>
          </div>

          <div className="rounded-2xl bg-secondary/60 p-3">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-primary md:text-3xl">{format(product.price_usd)}</span>
              {product.compare_at_usd > product.price_usd && (
                <span className="pb-1 text-sm text-muted-foreground line-through">{format(product.compare_at_usd)}</span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t('productDetail.finalPriceNote')}
            </p>
          </div>

          {(product.variants || []).map((v) => (
            <div key={v.name}>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{v.name}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label={v.name}>
                {(v.options || []).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={selection[v.name] === opt}
                    aria-label={`${v.name} ${opt}`}
                    onClick={() => setSelection((s) => ({ ...s, [v.name]: opt }))}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium min-h-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selection[v.name] === opt ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, Number(product.stock) || 1)} />
            <span className="text-xs text-muted-foreground">
              {outOfStock ? t('product.outOfStock') : t('productDetail.inStock', { count: product.stock })}
            </span>
          </div>

          <div className="hidden gap-2 md:flex">
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => add(false)}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-primary py-3 text-sm font-semibold text-primary disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t('productDetail.addToCart')}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" /> {t('productDetail.addToCart')}
            </button>
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => add(true)}
              className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t('productDetail.buyNow')}
            >
              {t('productDetail.buyNow')}
            </button>
          </div>

          {/* Delivery */}
          <div className="space-y-2 rounded-xl border border-border bg-card p-3 text-xs">
            <div className="flex items-start gap-2">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">
                  {isIntl
                    ? t('productDetail.importEta', { eta: product.estimated_delivery || t('productDetail.defaultIntlEta') })
                    : t('productDetail.deliveryEta', { eta: product.estimated_delivery || t('productDetail.defaultLocalEta') })}
                </p>
                <p className="text-muted-foreground">
                  {zone
                    ? t('productDetail.zoneEta', { name: zone.name, fee: zone.fee_usd, days: zone.eta_days })
                    : t('productDetail.shippingCalc')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-muted-foreground">
                {t('productDetail.pickupNote')}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-muted-foreground">
                {t('productDetail.buyerProtection')}
              </p>
            </div>
          </div>

          <PriceBreakdown breakdown={breakdown} />

          {product.seller_id && sellerSlug && (
            <Link
              to={`/store/${sellerSlug}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <StoreIcon className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{product.seller_name}</p>
                <p className="text-[11px] text-muted-foreground">{t('productDetail.viewStore')}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}

          {isIntl && (
            <div className="rounded-xl border border-border bg-card p-3 text-xs">
              <p className="font-semibold">{t('productDetail.supplier', { name: product.supplier_name || t('productDetail.intlPartner') })}</p>
              <p className="text-muted-foreground">
                {t('productDetail.supplierRef', { ref: product.external_product_id || '—', origin: product.origin_country || '—' })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <section className="space-y-2">
        <h2 className="text-base font-bold">{t('productDetail.description')}</h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description}</p>
        {product.attributes && Object.keys(product.attributes).length > 0 && (
          <div className="mt-2 grid gap-2 rounded-xl border border-border bg-card p-3 md:grid-cols-2">
            {Object.entries(product.attributes).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{String(v)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <ProductReviews product={product} onChanged={(updated) => setProduct((p) => ({ ...p, ...updated }))} />

      {!!related.length && (
        <section>
          <SectionHeader title={t('productDetail.similar')} to={`/search?category=${categorySlug}`} />
          <ProductRow products={related} />
        </section>
      )}

      <MobileActionBar>
        <span className="shrink-0 text-base font-black">{format(product.price_usd)}</span>
        <button
          type="button"
          disabled={outOfStock}
          onClick={() => add(false)}
          className="flex-1 rounded-full border border-primary py-2.5 text-sm font-semibold text-primary disabled:opacity-40"
        >
          {t('productDetail.add')}
        </button>
        <button
          type="button"
          disabled={outOfStock}
          onClick={() => add(true)}
          className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {t('productDetail.buy')}
        </button>
      </MobileActionBar>
    </div>
  );
}