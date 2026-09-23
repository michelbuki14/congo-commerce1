import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Package, Truck, MapPin, Wallet } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import StatusBadge from '@/components/StatusBadge';
import { formatUSD, formatDateTime } from '@/lib/format';
import { SHIPMENT_STATUS_LABELS } from '@/lib/logistics';

export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [fulfillments, setFulfillments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const o = await base44.entities.Order.get(id);
        const f = await base44.entities.FulfillmentOrder.filter({ order_id: o.id }, 'fulfillment_number', 50);
        setOrder(o);
        setFulfillments(f);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div className="mx-auto h-64 w-full max-w-2xl animate-pulse rounded-2xl bg-secondary" />;
  }

  if (notFound || !order) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <p className="font-semibold">Commande introuvable</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const paid = order.payment_status === 'PAID' || order.payment_status === 'AUTHORIZED';

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h1 className="mt-2 text-lg font-bold md:text-xl">Merci {order.customer_name} !</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {paid
            ? `Paiement confirmé via ${order.payment_method}.`
            : `Commande enregistrée — paiement à la livraison (${order.payment_method}).`}
        </p>
        <p className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-sm font-bold">{order.order_number}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Passée le {formatDateTime(order.created_date)}</p>
      </div>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Suivi</h2>
        <p className="text-xs text-muted-foreground">
          Votre commande a été répartie en {fulfillments.length} expédition(s) selon le vendeur ou le fournisseur de chaque article.
        </p>
        {fulfillments.map((f) => (
          <div key={f.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {f.seller_name || f.supplier_name || 'Congo Commerce'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {f.fulfillment_number} · {f.source_type === 'international_supplier' ? 'Import international' : 'Local RDC'}
                </p>
              </div>
              <StatusBadge status={f.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {f.tracking_number && (
                <span className="flex items-center gap-1">
                  <Truck className="h-3 w-3" /> {f.courier_name} · {f.tracking_number}
                </span>
              )}
              {f.estimated_delivery && (
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" /> Livraison estimée : {f.estimated_delivery}
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1">
              {(f.items || []).map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-secondary">
                    <Image src={it.image} alt={it.title} className="h-full w-full object-cover" />
                  </div>
                  <p className="min-w-0 flex-1 truncate text-xs">{it.title}</p>
                  <span className="text-xs text-muted-foreground">× {it.quantity}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Statut transporteur : {SHIPMENT_STATUS_LABELS[f.status] || f.status}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <MapPin className="h-4 w-4 text-primary" /> Livraison
        </h2>
        <p className="text-sm">
          {order.delivery_method === 'pickup_point'
            ? `Retrait — ${order.pickup_point_name}`
            : `${order.address}, ${order.city}`}
        </p>
        <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
        {order.notes && <p className="text-xs text-muted-foreground">Note : {order.notes}</p>}
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Articles</h2>
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
        <div className="space-y-1 border-t border-border pt-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sous-total</span>
            <span>{formatUSD(order.subtotal_usd)}</span>
          </div>
          {order.discount_usd > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Remise {order.coupon_code}</span>
              <span>-{formatUSD(order.discount_usd)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Livraison</span>
            <span>{order.shipping_usd === 0 ? 'Offerte' : formatUSD(order.shipping_usd)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Total payé</span>
            <span className="text-primary">{formatUSD(order.total_usd)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Soit environ {Math.round(order.total_cdf || 0).toLocaleString('fr-FR')} FC au taux appliqué.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5 text-xs">
          <Wallet className="h-3.5 w-3.5 text-primary" />
          <span>Référence paiement : {order.payment_reference || '—'}</span>
          <StatusBadge status={order.payment_status} />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link to="/track" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">
          Suivre une commande
        </Link>
        <Link to="/returns" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">
          Ouvrir un retour
        </Link>
        <Link to="/" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}