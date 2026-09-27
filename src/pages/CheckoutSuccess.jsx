import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Wallet, MapPin, Truck, Package, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import StatusBadge from '@/components/StatusBadge';
import { getOrderIds } from '@/lib/session';
import { formatUSD, formatDateTime } from '@/lib/format';
import { SHIPMENT_STATUS_LABELS } from '@/lib/logistics';

export default function CheckoutSuccess() {
  const [order, setOrder] = useState(null);
  const [fulfillments, setFulfillments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const fromUrl = new URLSearchParams(window.location.search).get('order');
      const last = getOrderIds()[0];
      try {
        let found = null;
        if (fromUrl) {
          const rows = await base44.entities.Order.filter({ order_number: fromUrl });
          found = rows[0] || null;
        }
        if (!found && last?.id) {
          found = await base44.entities.Order.get(last.id);
        }
        if (!found) {
          setNotFound(true);
          return;
        }
        const f = await base44.entities.FulfillmentOrder.filter({ order_id: found.id }, 'fulfillment_number', 50).catch(() => []);
        setOrder(found);
        setFulfillments(f);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="mx-auto h-64 w-full max-w-3xl animate-pulse rounded-2xl bg-secondary" />;
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <p className="font-semibold">Aucune commande récente à afficher</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Entrez votre numéro de commande pour retrouver votre confirmation et les instructions de paiement.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link to="/order-tracking" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            Suivre ma commande
          </Link>
          <Link to="/" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">
            Retour à la boutique
          </Link>
        </div>
      </div>
    );
  }

  const paid = order.payment_status === 'PAID' || order.payment_status === 'AUTHORIZED';
  const pickup = order.delivery_method === 'pickup_point';

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h1 className="mt-2 text-lg font-bold md:text-xl">Commande confirmée</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Merci {order.customer_name} ! Votre commande est enregistrée et transmise {fulfillments.length > 1 ? 'aux vendeurs concernés' : 'au vendeur'}.
        </p>
        <p className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-sm font-bold">{order.order_number}</p>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <span>Passée le {formatDateTime(order.created_date)}</span>
          <StatusBadge status={order.payment_status} />
        </p>
      </div>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Wallet className="h-4 w-4 text-primary" /> Prochaine étape : paiement
        </h2>
        {paid ? (
          <p className="text-xs text-muted-foreground">
            Paiement confirmé via {order.payment_method || 'mobile money'}. Référence {order.payment_reference || '—'}. Aucune
            autre action n'est requise : le vendeur prépare votre colis.
          </p>
        ) : (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              Votre commande est réservée. Réglez <span className="font-bold text-primary">{formatUSD(order.total_usd)}</span> par
              mobile money au numéro marchand communiqué par téléphone, en indiquant la référence ci-dessous.
            </p>
            <p className="rounded-lg bg-secondary/60 px-3 py-2">
              Référence à indiquer : <span className="font-bold text-foreground">{order.payment_reference || order.order_number}</span>
              {order.payment_phone ? ` · téléphone de paiement ${order.payment_phone}` : ''}
            </p>
            <p>Un agent vous appelle au {order.customer_phone || '—'} pour valider la transaction avant l'expédition.</p>
          </div>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <MapPin className="h-4 w-4 text-primary" /> {pickup ? 'Retrait de votre colis' : 'Livraison de votre colis'}
        </h2>
        {pickup ? (
          <>
            <p className="text-sm">{order.pickup_point_name || 'Point de retrait partenaire'}</p>
            {order.pickup_code && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <p className="text-[11px] font-semibold text-muted-foreground">Code de retrait à présenter sur place</p>
                <p className="mt-1 text-2xl font-black tracking-[0.3em] text-primary">{order.pickup_code}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Présentez ce code avec votre numéro de commande dans les 7 jours.{' '}
              <Link to="/pickup-points" className="font-semibold text-primary">Voir l'adresse et les horaires du point</Link>.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm">
              {order.address || '—'}
              {order.city ? `, ${order.city}` : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              Nous vous appelons au {order.customer_phone || '—'} avant le passage du livreur. Prévoyez le montant exact en
              espèces si vous avez choisi le paiement à la livraison.
            </p>
          </>
        )}
        {order.notes && <p className="text-[11px] text-muted-foreground">Note transmise : {order.notes}</p>}
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Package className="h-4 w-4 text-primary" /> Ce qui va se passer
        </h2>
        {fulfillments.length ? (
          <div className="space-y-2">
            {fulfillments.map((f) => (
              <div key={f.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{f.seller_name || f.supplier_name || 'Congo Commerce'}</p>
                  <StatusBadge status={f.status} />
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Truck className="h-3 w-3" /> {SHIPMENT_STATUS_LABELS[f.status] || f.status}
                  </span>
                  {f.estimated_delivery && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {f.estimated_delivery}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Votre commande est en cours de répartition entre les vendeurs. Le suivi s'affichera dès la préparation.
          </p>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Articles commandés</h2>
        {(order.items || []).map((it, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
              <Image src={it.image} alt={it.title} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{it.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {it.variant ? `${it.variant} · ` : ''}× {it.quantity} · {it.seller_name}
              </p>
            </div>
            <span className="text-sm font-semibold">{formatUSD(it.line_total_usd)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
          <span>Total</span>
          <span className="text-primary">{formatUSD(order.total_usd)}</span>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link to="/order-tracking" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Suivre ma livraison
        </Link>
        <Link to={`/invoice/${order.order_number}`} className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">
          Voir la facture
        </Link>
        <Link to="/support-tickets" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">
          Besoin d'aide
        </Link>
        <Link to="/" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}