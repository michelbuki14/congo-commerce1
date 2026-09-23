import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin } from 'lucide-react';
import { Image } from '@/components/ui/image';
import RatingStars from './RatingStars';
import { compactNumber } from '@/lib/format';

export default function SellerCard({ seller }) {
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
          <span>{compactNumber(seller.followers_count || 0)} abonnés</span>
        </div>
        <RatingStars rating={seller.rating || 0} count={seller.products_count || 0} />
      </div>
    </Link>
  );
}