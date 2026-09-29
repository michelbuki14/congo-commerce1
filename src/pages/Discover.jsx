import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Share2, ShoppingBag, Plus, BadgeCheck, Play, Volume2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { useCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';
import { getLikedContent, getReferralCode, toggleLikedContent } from '@/lib/session';
import { compactNumber } from '@/lib/format';

export default function Discover() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState([]);
  const [toast, setToast] = useState('');
  const { addItem } = useCart();
  const { format } = useCurrency();

  useEffect(() => {
    setLiked(getLikedContent());
    base44.entities.Content.filter({ status: 'published' }, '-likes_count', 20)
      .then((rows) => {
        setItems(rows);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const like = async (content) => {
    const next = toggleLikedContent(content.id);
    setLiked(next);
    const delta = next.includes(content.id) ? 1 : -1;
    setItems((prev) => prev.map((c) => (c.id === content.id ? { ...c, likes_count: Math.max(0, (c.likes_count || 0) + delta) } : c)));
    await base44.entities.Content.update(content.id, { likes_count: Math.max(0, (content.likes_count || 0) + delta) }).catch(() => {});
  };

  const share = async (content) => {
    const product = await base44.entities.Product.get(content.product_id).catch(() => null);
    const base = `${window.location.origin}/product/${product?.slug || content.product_id}`;
    const code = getReferralCode();
    const url = code ? `${base}?ref=${encodeURIComponent(code)}` : base;
    try {
      if (navigator.share) {
        await navigator.share({ title: content.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        flash(t('discover.linkCopied'));
      }
      await base44.entities.Content.update(content.id, { shares_count: (content.shares_count || 0) + 1 });
      setItems((prev) => prev.map((c) => (c.id === content.id ? { ...c, shares_count: (c.shares_count || 0) + 1 } : c)));
    } catch {
      /* user cancelled */
    }
  };

  const add = async (content) => {
    if (!content.product_id) return;
    try {
      const product = await base44.entities.Product.get(content.product_id);
      addItem(product, 1);
      flash(t('discover.addedToCart'));
    } catch {
      flash(t('discover.unavailable'));
    }
  };

  if (loading) {
    return <div className="mx-auto h-[70vh] w-full max-w-md animate-pulse rounded-2xl bg-secondary" />;
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <p className="font-semibold">{t('discover.emptyTitle')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('discover.emptyDesc')}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">
          {toast}
        </div>
      )}
      <div className="mx-auto h-[calc(100vh-9.5rem)] w-full max-w-md snap-y snap-mandatory overflow-y-auto rounded-2xl">
        {items.map((c) => {
          const isLiked = liked.includes(c.id);
          return (
            <div key={c.id} className="relative mb-3 h-full w-full snap-start overflow-hidden rounded-2xl bg-foreground">
              <Image src={c.media_url || c.thumbnail_url} alt={c.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
              {c.product_id && (
                <Link to={`/product/${c.product_id}`} aria-label={c.product_title || c.title} className="absolute inset-0 z-10" />
              )}

              <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
                {c.media_type === 'video' ? <Play className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                {c.media_type === 'video' ? t('discover.video') : t('discover.photo')}
              </div>

              <div className="pointer-events-none absolute bottom-28 left-3 right-16 z-20 text-white">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-8 w-8 overflow-hidden rounded-full border border-white/60 bg-white/20">
                    <Image src={c.creator_avatar} alt={c.creator_name} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-xs font-bold">
                      @{c.creator_handle}
                      {c.verified && <BadgeCheck className="h-3.5 w-3.5 text-sky-300" />}
                    </p>
                    <p className="text-[10px] opacity-80">{c.creator_name}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold leading-snug">{c.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] opacity-85">{c.caption}</p>
              </div>

              {/* Action rail */}
              <div className="absolute bottom-28 right-3 z-20 flex flex-col items-center gap-4 text-white">
                <button type="button" onClick={() => like(c)} className="flex flex-col items-center gap-1">
                  <Heart className={`h-6 w-6 ${isLiked ? 'fill-primary text-primary' : ''}`} />
                  <span className="text-[10px] font-semibold">{compactNumber(c.likes_count || 0)}</span>
                </button>
                <button type="button" onClick={() => share(c)} className="flex flex-col items-center gap-1">
                  <Share2 className="h-6 w-6" />
                  <span className="text-[10px] font-semibold">{compactNumber(c.shares_count || 0)}</span>
                </button>
                <button type="button" onClick={() => add(c)} className="flex flex-col items-center gap-1">
                  <ShoppingBag className="h-6 w-6" />
                  <span className="text-[10px] font-semibold">{t('discover.cart')}</span>
                </button>
              </div>

              {/* Product bar */}
              {c.product_id && (
                <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center gap-2 rounded-xl bg-white/95 p-2 backdrop-blur">
                  <Link to={`/product/${c.product_id}`} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg" aria-label={c.product_title || c.title}>
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-secondary">
                      <Image src={c.product_image} alt={c.product_title} className="h-full w-full object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-foreground">{c.product_title}</span>
                      <span className="block text-xs font-bold text-primary">{format(c.product_price_usd)}</span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => add(c)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    aria-label={t('discover.addToCart')}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}