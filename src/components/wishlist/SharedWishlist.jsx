import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, ShoppingBag } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { useCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';

/**
 * Read-only view of a wishlist someone shared. Nothing here edits the
 * recipient's own favourites, but every item can be added to the cart.
 */
export default function SharedWishlist({ products, loading }) {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const { format } = useCurrency();

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h1 className="flex items-center gap-2 text-lg font-bold md:text-xl">
          <Heart className="h-5 w-5 text-primary" /> {t('sharedWishlist.title')}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('sharedWishlist.desc')}
        </p>
      </section>

      {loading ? (
        <div className="grid gap-2.5 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <Link to={`/product/${p.slug || p.id}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                <Image src={p.images?.[0]} alt={p.title} className="h-full w-full object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/product/${p.slug || p.id}`} className="line-clamp-2 text-xs font-semibold hover:underline">
                  {p.title}
                </Link>
                <p className="mt-0.5 text-sm font-bold text-primary">{format(p.price_usd)}</p>
              </div>
              <button
                type="button"
                disabled={Number(p.stock) <= 0}
                onClick={() => addItem(p, 1)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
              >
                <ShoppingBag className="h-3.5 w-3.5" /> {t('sharedWishlist.add')}
              </button>
            </div>
          ))}
        </div>
      )}

      <Link to="/" className="inline-block rounded-full border border-border px-4 py-2 text-xs font-semibold">
        {t('sharedWishlist.explore')}
      </Link>
    </div>
  );
}