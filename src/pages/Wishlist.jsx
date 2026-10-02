import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, Share2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ProductGrid from '@/components/ProductGrid';
import EmptyState from '@/components/EmptyState';
import SharedWishlist from '@/components/wishlist/SharedWishlist';
import { getWishlist } from '@/lib/session';
import BackButton from '@/components/BackButton';

// A shared wishlist travels as base64-encoded product ids in ?wl=
function encodeIds(ids) {
  try {
    return btoa(ids.join(','));
  } catch {
    return '';
  }
}

function decodeIds(value) {
  try {
    return atob(value)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export default function Wishlist() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharedView, setSharedView] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const local = getWishlist();
    const incoming = decodeIds(new URLSearchParams(window.location.search).get('wl') || '');
    // The owner of a shared link is the device whose own list matches it — they
    // keep the editable page; everyone else gets the read-only view.
    const isOwner = incoming.length > 0 && incoming.length === local.length && incoming.every((id) => local.includes(id));
    const isSharedView = incoming.length > 0 && !isOwner;
    const ids = isSharedView ? incoming : local;
    setSharedView(isSharedView);
    if (!ids.length) {
      setLoading(false);
      return;
    }
    Promise.all(ids.map((id) => base44.entities.Product.get(id).catch(() => null)))
      .then((rows) => setProducts(rows.filter(Boolean)))
      .finally(() => setLoading(false));
  }, []);

  const shareList = async () => {
    const ids = getWishlist();
    if (!ids.length) return;
    const url = `${window.location.origin}/wishlist?wl=${encodeURIComponent(encodeIds(ids))}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t('wishlist.shareTitle'), url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast(t('wishlist.linkCopied'));
        setTimeout(() => setToast(''), 1800);
      }
    } catch {
      /* share cancelled */
    }
  };

  if (sharedView) {
    return <SharedWishlist products={products} loading={loading} />;
  }

  return (<div className="space-y-4 pb-6">
        <BackButton fallback="/" className="md:hidden" />
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">
          {toast}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold md:text-xl">{t('wishlist.title')}</h1>
        {!!products.length && (
          <button
            type="button"
            onClick={shareList}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold"
          >
            <Share2 className="h-3.5 w-3.5" /> {t('wishlist.shareList')}
          </button>
        )}
      </div>
      <ProductGrid
        products={products}
        loading={loading}
        emptyState={
          <EmptyState
            icon={Heart}
            title={t('wishlist.emptyTitle')}
            description={t('wishlist.emptyDesc')}
            actionTo="/"
            actionLabel={t('wishlist.emptyAction')}
          />
        }
      />
    </div>
  );
}