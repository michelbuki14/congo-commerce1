import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import RatingStars from './RatingStars';
import { compactNumber } from '@/lib/format';

export default function SellerCard({ seller }) {
  const { t } = useTranslation();
  const [sales, setSales] = useState(Number(seller.total_sales) || 0);
  // A rating is only shown when real reviews back it. `products_count` was
  // being rendered as the review count, which read as a rated shop with zero
  // reviews. Shops without reviews are labelled the way the trust model
  // already describes them (see lib/vendorRatings.js trustLevel).
  const rating = Number(seller.rating) || 0;
  const reviewsCount = Number(seller.reviews_count) || 0;

  // Social proof: the seller's own counter when set, otherwise the units sold
  // across their published catalogue.
  useEffect(() => {
    const declared = Number(seller.total_sales) || 0;
    if (declared > 0) {
      setSales(declared);
      return undefined;
    }
    let alive = true;
    base44.entities.Product.filter({ seller_id: seller.id })
      .then((rows) => {
        if (alive) setSales(rows.reduce((sum, p) => sum + (Number(p.sold_count) || 0), 0));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [seller.id, seller.total_sales]);

  return (
    <Link
      to={`/store/${seller.slug}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-secondary">
        <Image src={seller.logo_url} alt={seller.name} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate text-sm font-semibold">{seller.name}</p>
          {seller.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" /> {seller.city}
          </span>
          <span>·</span>
          <span>{t('sellerCard.followers', { count: compactNumber(seller.followers_count || 0) })}</span>
        </div>
        <div className="flex items-center gap-2">
          {reviewsCount > 0 ? (
            <RatingStars rating={rating} count={reviewsCount} />
          ) : (
            <span className="text-[11px] text-muted-foreground">{t('rating.new')}</span>
          )}
          {sales > 0 && <span className="text-[11px] text-muted-foreground">{t('sellerCard.sales', { count: compactNumber(sales) })}</span>}
        </div>
      </div>
    </Link>
  );
}