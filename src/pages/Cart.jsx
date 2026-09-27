import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
          title="Votre panier est vide"
          description="Parcourez les catégories ou découvrez les vidéos des créateurs."
          actionTo="/"
          actionLabel="Commencer mes achats"
        />
      </div>
    );
  }

  const shipping = zone ? zone.fee_usd : 0;
  const total = Math.round((subtotal + shipping) * 100) / 100;

  return (
    <div className="space-y-5 pb-6">
      <h1 className="text-lg font-bold md:text-xl">Mon panier ({count})</h1>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={`${item.product_id}-${item.variant || ''}`} className="flex gap-3 rounded-xl border border-border bg-card p-2.5">
            <Link to={`/product/${item.slug || item.product_id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
              <Image src={item.image} alt={item.title} className="h-full w-full object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/product/${item.slug || item.product_id}`} className="line-clamp-2 text-sm font-medium">
                {item.title}
              </Link>
              {item.variant && <p className="text-[11px] text-muted-foreground">{item.variant}</p>}
              <p className="text-[11px] text-muted-foreground">
                {item.source_type === 'international_supplier' ? 'Import international' : item.seller_name || 'Vendeur local'}
              </p>
              <div className="mt-1.5 flex items-center justify-between">
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
                    aria-label="Retirer du panier"
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
        <Ticket className="h-4 w-4" /> Vous avez un code promo ? Appliquez-le au paiement
      </Link>

      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Sous-total</span>
          <span className="font-semibold">{format(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Truck className="h-3.5 w-3.5" /> Livraison estimée {zone ? `(${zone.name})` : ''}
          </span>
          <span className="font-semibold">{zone ? format(shipping) : 'Au paiement'}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
          <span>Total</span>
          <span className="text-primary">{zone ? format(total) : format(subtotal)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Montant en {currency} · taux appliqué au moment du paiement. Vérifiez votre ville dans votre profil pour un calcul exact.
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
        Passer au paiement
      </button>

      {!!suggestions.length && (
        <section>
          <SectionHeader title="Vous aimerez aussi" to="/search?sort=sold" />
          <ProductRow products={suggestions} />
        </section>
      )}
    </div>
  );
}