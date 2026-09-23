import React from 'react';
import { Star } from 'lucide-react';

export default function RatingStars({ rating = 0, count, size = 'sm' }) {
  const dim = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`${dim} ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`}
          />
        ))}
      </div>
      {typeof count === 'number' && <span className="text-[11px] text-muted-foreground">({count})</span>}
    </div>
  );
}