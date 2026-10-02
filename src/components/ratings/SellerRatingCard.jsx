import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Star, Truck, Users } from 'lucide-react';
import { formatDate } from '@/lib/format';

const TONES = {
  good: 'bg-emerald-100 text-emerald-900',
  warn: 'bg-amber-100 text-amber-900',
  default: 'bg-secondary text-foreground',
};

function Stars({ value = 0 }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-border'}`} />
      ))}
    </span>
  );
}

/** One seller's public performance card. */
export default memo(function SellerRatingCard({ metrics }) {
  const { t } = useTranslation();
  const { seller, avgRating, reviewsCount, verifiedReviews, fiveStars, orders, productsCount, disputes, openDisputes, disputeRate, trustScore, level, verified, followers, deliveryInfo, city } = metrics;

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            {seller.name}
            {verified ? <BadgeCheck className="h-4 w-4 text-primary" /> : null}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {[city, deliveryInfo].filter(Boolean).join(' · ') || t('sellerRatingCard.defaultSeller')}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${TONES[level.tone] || TONES.default}`}>
          {level.label} · {trustScore}/100
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Stars value={avgRating} />
        <span className="text-xs font-semibold">
          {avgRating ? avgRating.toFixed(1) : '—'}
          <span className="ml-1 font-normal text-muted-foreground">
            {t('sellerRatingCard.reviews', { count: reviewsCount })}{verifiedReviews ? t('sellerRatingCard.verified', { count: verifiedReviews }) : ''}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-4">
        {[
          { icon: Truck, label: t('sellerRatingCard.delivered'), value: orders },
          { icon: Star, label: t('sellerRatingCard.fiveStars'), value: fiveStars },
          { icon: Users, label: t('sellerRatingCard.followers'), value: followers },
          { label: t('sellerRatingCard.catalog'), value: t('sellerRatingCard.catalogValue', { count: productsCount }) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-secondary/60 p-2.5">
            <p className="text-muted-foreground">{stat.label}</p>
            <p className="mt-0.5 text-sm font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-[11px]">
        <span>
          {t('sellerRatingCard.disputesPrefix')} <strong>{disputes}</strong> {t('sellerRatingCard.disputesSuffix', { rate: Math.round(disputeRate * 1000) / 10 })}
          {openDisputes ? t('sellerRatingCard.openDisputes', { count: openDisputes }) : t('sellerRatingCard.noneOpen')}
        </span>
        <Link to={`/store/${seller.slug}`} className="font-semibold text-primary">
          {t('sellerRatingCard.viewStore')}
        </Link>
      </div>

      {metrics.reviews.length ? (
        <div className="space-y-2">
          {metrics.reviews.slice(0, 2).map((review) => (
            <div key={review.id} className="rounded-xl bg-secondary/40 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <Stars value={Number(review.rating) || 0} />
                <span className="text-[10px] text-muted-foreground">{formatDate(review.created_date)}</span>
              </div>
              {review.comment ? <p className="mt-1 text-[11px]">{review.comment}</p> : null}
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {review.customer_name || t('sellerRatingCard.customer')} · {review.product_title || t('sellerRatingCard.product')}
                {review.verified_purchase ? t('sellerRatingCard.verifiedPurchaseSuffix') : ''}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">{t('sellerRatingCard.noReviews')}</p>
      )}
    </article>
  );
});