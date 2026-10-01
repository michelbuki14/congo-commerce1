import React from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';

export default function RatingStars({ rating = 0, count, size = 'sm' }) {
  const { t } = useTranslation();
  const dim = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1" aria-label={t('rating.average', { rating })}>
      <div className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`${dim} ${i <= rounded ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`}
          />
        ))}
      </div>
      {typeof count === 'number' && <span className="text-[11px] text-muted-foreground">({count})</span>}
    </div>
  );
}