import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, ShoppingBag, Ticket, Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { trackEvent } from '@/lib/tracking';
import { Image } from '@/components/ui/image';
import { useCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';
import QuantityStepper from '@/components/QuantityStepper';
import EmptyState from '@/components/EmptyState';
import ProductRow from '@/components/ProductRow';
import SectionHeader from '@/components/SectionHeader';
import { getProfile } from '@/lib/session';

export default function Cart() {
  const { t } = useTranslation();
  const { items, subtotal, updateQuantity, removeItem, count } = useCart();
  const { currency, format } = useCurrency();
  const navigate = useNavigate();
  const [zone, setZone] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    (async () => {
      const city = getProfile().city;
      const [zones, popular] = await Promise.all([
        base44.entities.DeliveryZone.filter({ city }).catch(() => []),
        base44.entities.Product.filter({ status: 'published' }, '-sold_count', 8).catch(() => []),
      ]);
      setZone(zones[0] || null);
      setSuggestions(popular.filter((p) => !items.some((i) => i.product_id === p.id)));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!count) {
    return (
      <div className="space-y-6 pb-6">
        <EmptyState
          icon={ShoppingBag}
          title={t('cart.emptyTitle')}
          description={t('cart.emptyDesc')}
          actionTo="/"
          actionLabel={t('cart.emptyAction')}
        />
      </div>
    );
  }

  const shipping = zone ? zone.fee_usd : 0;
  const total = Math.round((subtotal + shipping) * 100) / 100;

  return (
    <div className="space-y-5 pb-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('cart.title', { count })}</h1>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-4">
      <div className="space-y-3">
        {items.map((item) => (
          <div key={`${item.product_id}-${item.variant || ''}`} className="flex gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
            <Link to={`/product/${item.slug || item.product_id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
              <Image src={item.image} alt={item.title} className="h-full w-full object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/product/${item.slug || item.product_id}`} className="line-clamp-2 text-sm font-medium">
                {item.title}
              </Link>
              {item.variant && <p className="text-[11px] text-muted-foreground">{item.variant}</p>}
              <p className="text-[11px] text-muted-foreground">
                {item.source_type === 'international_supplier' ? t('cart.intlImport') : item.seller_name || t('cart.localSeller')}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-primary">{format(item.price_usd)}</span>
                <div className="flex items-center gap-2">
                  <QuantityStepper
                    size="sm"
                    value={item.quantity}
                    onChange={(q) => updateQuantity(item.product_id, item.variant, q)}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.product_id, item.variant)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-destructive"
                    aria-label={t('cart.remove')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Link to="/coupons" className="flex items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-sm font-semibold text-primary">
        <Ticket className="h-4 w-4" /> {t('cart.couponHint')}
      </Link>

      </div>
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-40">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('cart.subtotal')}</span>
          <span className="font-semibold">{format(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Truck className="h-3.5 w-3.5" /> {t('cart.estimatedShipping', { zone: zone ? `(${zone.name})` : '' })}
          </span>
          <span className="font-semibold">{zone ? format(shipping) : t('cart.atCheckout')}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
          <span>{t('cart.total')}</span>
          <span className="text-primary">{zone ? format(total) : format(subtotal)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t('cart.totalNote', { currency })}
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          trackEvent('order_checkout_started', { value_usd: subtotal });
          navigate('/checkout');
        }}
        className="w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground"
      >
        {t('cart.checkout')}
      </button>
      </aside>
      </div>

      {!!suggestions.length && (
        <section>
          <SectionHeader title={t('cart.suggestions')} to="/search?sort=sold" />
          <ProductRow products={suggestions} />
        </section>
      )}
    </div>
  );
}