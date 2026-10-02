import React, { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Truck, Zap } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { useCurrency } from '@/lib/currency';
import { useCart } from '@/lib/cart';
import { isWishlisted, toggleWishlist } from '@/lib/session';
import RatingStars from './RatingStars';
import { compactNumber } from '@/lib/format';

function ProductCard({ product }) {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { addItem } = useCart();
  const [liked, setLiked] = useState(() => isWishlisted(product.id));

  const discount =
    product.compare_at_usd && product.compare_at_usd > product.price_usd
      ? Math.round(((product.compare_at_usd - product.price_usd) / product.compare_at_usd) * 100)
      : 0;

  const isIntl = product.source_type === 'international_supplier';

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-card">
      <Link to={`/product/${product.slug || product.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl" aria-label={`${product.title}, ${format(product.price_usd)}`}>
        <div className="relative aspect-square w-full overflow-hidden bg-secondary">
          <Image
            src={product.images?.[0]}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {discount > 0 && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
              -{discount}%
            </span>
          )}
          {product.is_flash_sale && (
            <span className="absolute left-1.5 bottom-1.5 flex items-center gap-0.5 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">
              <Zap className="h-3 w-3" /> Flash
            </span>
          )}
          {Number(product.stock) <= 0 && (
            <span className="absolute inset-x-0 bottom-0 bg-foreground/80 py-1 text-center text-[10px] font-semibold text-background">
              {t('product.outOfStock')}
            </span>
          )}
        </div>
        <div className="space-y-1 p-2.5">
          <p className="line-clamp-2 min-h-[2.4em] text-xs font-medium leading-snug md:text-[13px]">{product.title}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-primary md:text-base">{format(product.price_usd)}</span>
            {discount > 0 && (
              <span className="text-[11px] text-muted-foreground line-through">{format(product.compare_at_usd)}</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-1">
            <RatingStars rating={product.rating || 0} count={product.reviews_count || 0} />
            <span className="text-[10px] text-muted-foreground">{t('product.soldCount', { count: compactNumber(product.sold_count || 0) })}</span>
          </div>
          <div className="flex items-center gap-1 pt-0.5 text-[10px] text-muted-foreground">
            {isIntl ? (
              <>
                <Truck className="h-3 w-3" /> {t('product.international', { eta: product.estimated_delivery || '18 jours' })}
              </>
            ) : (
              <>
                <Zap className="h-3 w-3 text-emerald-600" /> {t('product.localSeller', { eta: product.estimated_delivery || '2-4 jours' })}
              </>
            )}
          </div>
        </div>
      </Link>

      <button
        type="button"
        aria-label={t('product.addToWishlist')}
        onClick={() => setLiked(toggleWishlist(product.id).includes(product.id))}
        className="absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-card/90 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Heart className={`h-5 w-5 ${liked ? 'fill-primary text-primary' : 'text-foreground'}`} />
      </button>

    </article>
  );
}

export default memo(ProductCard);