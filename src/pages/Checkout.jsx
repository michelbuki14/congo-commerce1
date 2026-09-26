import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Store, Truck, Ticket, AlertCircle, ShieldCheck, Split } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { useCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';
import { loadPlatformConfig, getCities } from '@/lib/config';
import { listPaymentProviders } from '@/lib/payments';
import { buildCheckoutQuote, findCoupon, placeOrder } from '@/lib/orderService';
import { getProfile, saveProfile } from '@/lib/session';
import EmptyState from '@/components/EmptyState';
import { formatUSD } from '@/lib/format';
import { splitVat, getVatRate } from '@/lib/tax';
import CheckoutConsent from '@/components/CheckoutConsent';
import MobileActionBar from '@/components/MobileActionBar';

export default function Checkout() {
  const { items, clear, count } = useCart();
  const { currency } = useCurrency();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(getProfile());
  const [deliveryMethod, setDeliveryMethod] = useState('home_delivery');
  const [pickupPointId, setPickupPointId] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [zones, setZones] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [consent, setConsent] = useState({ terms: false, marketing: false });
  const [vatRate, setVatRate] = useState(getVatRate());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const providers = useMemo(() => listPaymentProviders(), []);

  useEffect(() => {
    loadPlatformConfig().then(() => setVatRate(getVatRate()));
    (async () => {
      const [z, p] = await Promise.all([
        base44.entities.DeliveryZone.filter({ active: true }).catch(() => []),
        base44.entities.PickupPoint.filter({ active: true }).catch(() => []),
      ]);
      setZones(z);
      setPickupPoints(p);
      if (p[0]) setPickupPointId(p[0].id);
    })();
  }, []);

  const selectedZone = zones.find((z) => z.city === profile.city) || zones[0] || null;
  const selectedPickup = pickupPoints.find((p) => p.id === pickupPointId) || null;

  const deliveryFee = deliveryMethod === 'pickup_point'
    ? Number(selectedPickup?.fee_usd || 0)
    : Number(selectedZone?.fee_usd || 0);

  useEffect(() => {
    if (!items.length) {
      setLoadingQuote(false);
      return;
    }
    let alive = true;
    setLoadingQuote(true);
    buildCheckoutQuote({ items, deliveryFee, coupon })
      .then((q) => {
        if (alive) setQuote(q);
      })
      .catch(() => {
        if (alive) setQuote(null);
      })
      .finally(() => {
        if (alive) setLoadingQuote(false);
      });
    return () => {
      alive = false;
    };
  }, [items, deliveryFee, coupon]);

  const applyCoupon = async () => {
    setCouponMessage('');
    const found = await findCoupon(couponInput);
    if (!found) {
      setCoupon(null);
      setCouponMessage('Code promo invalide ou expiré.');
      return;
    }
    setCoupon(found);
    setCouponMessage(`Code ${found.code} appliqué.`);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!profile.name?.trim() || !profile.phone?.trim()) {
      setError('Renseignez votre nom et votre numéro de téléphone.');
      return;
    }
    if (deliveryMethod === 'home_delivery' && !profile.address?.trim()) {
      setError('Renseignez votre adresse de livraison.');
      return;
    }
    if (deliveryMethod === 'pickup_point' && !selectedPickup) {
      setError('Choisissez un point de retrait.');
      return;
    }
    if (!consent.terms) {
      setError('Vous devez accepter les conditions générales de vente et la politique de confidentialité.');
      return;
    }
    setSubmitting(true);
    saveProfile(profile);
    try {
      const result = await placeOrder({
        items,
        profile,
        delivery: {
          method: deliveryMethod,
          fee_usd: deliveryFee,
          address: profile.address,
          pickup_point_id: selectedPickup?.id || '',
          pickup_point_name: selectedPickup?.name || '',
          notes,
        },
        couponCode: coupon?.code || '',
        paymentMethodId: paymentMethod,
        consent,
      });
      clear();
      navigate(`/order/${result.order.order_number}`);
    } catch (err) {
      setError(err.message || 'Le paiement a échoué. Vérifiez vos informations et réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const groups = useMemo(() => {
    if (!quote?.lines?.length) return [];
    const map = new Map();
    quote.lines.forEach((l) => {
      const p = l.product;
      const key = p.source_type === 'local_seller' ? `s-${p.seller_id}` : `f-${p.supplier_id || p.source_type}`;
      if (!map.has(key)) {
        map.set(key, {
          label: p.source_type === 'local_seller' ? p.seller_name || 'Vendeur local' : p.supplier_name || 'Fournisseur international',
          intl: p.source_type === 'international_supplier',
          count: 0,
        });
      }
      map.get(key).count += l.quantity;
    });
    return [...map.values()];
  }, [quote]);

  if (!count) {
    return (
      <EmptyState
        title="Aucun article à payer"
        description="Ajoutez des articles à votre panier pour passer commande."
        actionTo="/"
        actionLabel="Découvrir des produits"
      />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 pb-28 md:pb-6">
      <h1 className="text-lg font-bold md:text-xl">Paiement</h1>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Contact + address */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <MapPin className="h-4 w-4 text-primary" /> Coordonnées & livraison
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            placeholder="Nom complet"
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            placeholder="Téléphone (+243…)"
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={profile.email || ''}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            placeholder="Email (optionnel)"
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <select
            value={profile.city}
            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          >
            {getCities().map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          {[
            { id: 'home_delivery', label: 'Livraison à domicile', icon: Truck },
            { id: 'pickup_point', label: 'Point de retrait', icon: Store },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setDeliveryMethod(m.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                deliveryMethod === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background'
              }`}
            >
              <m.icon className="h-4 w-4" /> {m.label}
            </button>
          ))}
        </div>

        {deliveryMethod === 'home_delivery' ? (
          <textarea
            value={profile.address}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            rows={2}
            placeholder="Adresse complète : commune, quartier, avenue, numéro"
            className="w-full rounded-lg border border-border bg-background p-3 text-sm"
          />
        ) : (
          <div className="space-y-2">
            {pickupPoints.length ? (
              pickupPoints.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPickupPointId(p.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${
                    pickupPointId === p.id ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.address}, {p.commune} · {p.hours}</p>
                  </div>
                  <span className="text-xs font-semibold">{formatUSD(p.fee_usd || 0)}</span>
                </button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Aucun point de retrait disponible pour le moment.</p>
            )}
          </div>
        )}

        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instructions pour le livreur (optionnel)"
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
      </section>

      {/* Payment */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Moyen de paiement</h2>
        <div className="space-y-2">
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaymentMethod(p.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
                paymentMethod === p.id ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${paymentMethod === p.id ? 'border-primary bg-primary' : 'border-border'}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">{p.instructions}</p>
              </div>
              {p.feePercent > 0 && <span className="text-[11px] text-muted-foreground">{p.feePercent}%</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Fulfillment split preview */}
      {!!groups.length && (
        <section className="space-y-2 rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Split className="h-4 w-4 text-primary" /> {groups.length} expédition{groups.length > 1 ? 's' : ''} pour une seule commande
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Congo Commerce regroupe automatiquement vos articles par vendeur ou fournisseur. Vous suivez une seule commande.
          </p>
          {groups.map((g) => (
            <div key={g.label} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-xs">
              <span className="font-medium">{g.label}</span>
              <span className="text-muted-foreground">{g.intl ? 'International' : 'Local RDC'} · {g.count} article(s)</span>
            </div>
          ))}
        </section>
      )}

      {/* Coupon */}
      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Ticket className="h-4 w-4 text-primary" /> Code promo
        </h2>
        <div className="flex gap-2">
          <input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            placeholder="Saisissez votre code"
            className="h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm uppercase"
          />
          <button type="button" onClick={applyCoupon} className="rounded-lg bg-secondary px-4 text-sm font-semibold">
            Appliquer
          </button>
        </div>
        {couponMessage && (
          <p className={`text-xs ${coupon ? 'text-emerald-600' : 'text-destructive'}`}>{couponMessage}</p>
        )}
        <Link to="/coupons" className="inline-block text-xs font-semibold text-primary">
          Voir les codes disponibles
        </Link>
      </section>

      {/* Summary */}
      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Récapitulatif</h2>
        {loadingQuote || !quote ? (
          <div className="h-24 animate-pulse rounded-lg bg-secondary" />
        ) : (
          <>
            <div className="max-h-52 space-y-2 overflow-y-auto">
              {quote.lines.map((l) => (
                <div key={`${l.product.id}-${l.variant || ''}`} className="flex items-center gap-2">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    <Image src={l.product.images?.[0]} alt={l.product.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{l.product.title}</p>
                    <p className="text-[11px] text-muted-foreground">× {l.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold">{formatUSD(l.line_total_usd)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 border-t border-border pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-semibold">{formatUSD(quote.subtotal)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Remise {coupon?.code}</span>
                  <span className="font-semibold">-{formatUSD(quote.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Livraison</span>
                <span className="font-semibold">{quote.shipping === 0 ? 'Offerte' : formatUSD(quote.shipping)}</span>
              </div>
              {vatRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">dont TVA ({vatRate} %)</span>
                  <span className="font-semibold">{formatUSD(splitVat(quote.total, vatRate).vat)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{formatUSD(quote.total)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Payable en {currency} · calculé côté plateforme au moment de la commande
              </p>
            </div>
          </>
        )}
      </section>

      <CheckoutConsent value={consent} onChange={setConsent} />

      <button
        type="submit"
        disabled={submitting || loadingQuote}
        className="hidden w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-50 md:flex"
      >
        <ShieldCheck className="h-4 w-4" />
        {submitting ? 'Traitement du paiement…' : `Payer ${quote ? formatUSD(quote.total) : ''}`}
      </button>

      <MobileActionBar>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="text-base font-black leading-tight">{quote ? formatUSD(quote.total) : '—'}</p>
        </div>
        <button
          type="submit"
          disabled={submitting || loadingQuote}
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" />
          {submitting ? 'Traitement…' : 'Payer'}
        </button>
      </MobileActionBar>
    </form>
  );
}