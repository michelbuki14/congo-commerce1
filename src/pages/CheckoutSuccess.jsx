import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Wallet, MapPin, Truck, Package, Clock } from 'lucide-react';
import { Image } from '@/components/ui/image';
import StatusBadge from '@/components/StatusBadge';
import { getProfile, getOrderIds } from '@/lib/session';
import { fetchMyOrder } from '@/lib/customerAccount';
import { formatUSD, formatDateTime } from '@/lib/format';
import { SHIPMENT_STATUS_LABELS } from '@/lib/logistics';
import BackButton from '@/components/BackButton';

export default function CheckoutSuccess() {
  const { t } = useTranslation();
  const [order, setOrder] = useState(null);
  const [fulfillments, setFulfillments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const fromUrl = new URLSearchParams(window.location.search).get('order');
      const last = getOrderIds()[0];
      try {
        const { order: found, fulfillments: f } = await fetchMyOrder({
          orderNumber: fromUrl || last?.order_number || '',
          phone: getProfile().phone,
        });
        if (!found) {
          setNotFound(true);
          return;
        }
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
    return (<div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <BackButton fallback="/order-history" className="md:hidden" />
        <p className="font-semibold">{t('checkoutSuccess.notFoundTitle')}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('checkoutSuccess.notFoundText')}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link to="/order-tracking" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            {t('checkoutSuccess.trackOrder')}
          </Link>
          <Link to="/" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">
            {t('checkoutSuccess.backToShop')}
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
        <h1 className="mt-2 text-lg font-bold md:text-xl">{t('checkoutSuccess.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fulfillments.length > 1
            ? t('checkoutSuccess.thanksMulti', { name: order.customer_name })
            : t('checkoutSuccess.thanksSingle', { name: order.customer_name })}
        </p>
        <p className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-sm font-bold">{order.order_number}</p>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <span>{t('checkoutSuccess.placedOn', { date: formatDateTime(order.created_date) })}</span>
          <StatusBadge status={order.payment_status} />
        </p>
      </div>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Wallet className="h-4 w-4 text-primary" /> {t('checkoutSuccess.nextStepPayment')}
        </h2>
        {paid ? (
          <p className="text-xs text-muted-foreground">
            {t('checkoutSuccess.paidText', { method: order.payment_method || 'mobile money', ref: order.payment_reference || '—' })}
          </p>
        ) : (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              {t('checkoutSuccess.reservedText', { total: formatUSD(order.total_usd) })}
            </p>
            <p className="rounded-lg bg-secondary/60 px-3 py-2">
              {t('checkoutSuccess.refLabel', { ref: order.payment_reference || order.order_number })}
              {order.payment_phone ? t('checkoutSuccess.payPhone', { phone: order.payment_phone }) : ''}
            </p>
            <p>{t('checkoutSuccess.agentCall', { phone: order.customer_phone || '—' })}</p>
          </div>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <MapPin className="h-4 w-4 text-primary" /> {pickup ? t('checkoutSuccess.pickupTitle') : t('checkoutSuccess.deliveryTitle')}
        </h2>
        {pickup ? (
          <>
            <p className="text-sm">{order.pickup_point_name || t('checkoutSuccess.defaultPickupPoint')}</p>
            {order.pickup_code && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <p className="text-[11px] font-semibold text-muted-foreground">{t('checkoutSuccess.pickupCodeLabel')}</p>
                <p className="mt-1 text-2xl font-black tracking-[0.3em] text-primary">{order.pickup_code}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('checkoutSuccess.pickupHelpPre')}{' '}
              <Link to="/pickup-points" className="font-semibold text-primary">{t('checkoutSuccess.pickupPointLink')}</Link>.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm">
              {order.address || '—'}
              {order.city ? `, ${order.city}` : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('checkoutSuccess.courierCall', { phone: order.customer_phone || '—' })}
            </p>
          </>
        )}
        {order.notes && <p className="text-[11px] text-muted-foreground">{t('checkoutSuccess.noteForwarded', { notes: order.notes })}</p>}
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Package className="h-4 w-4 text-primary" /> {t('checkoutSuccess.whatNext')}
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
                    <Truck className="h-3 w-3" /> {t(SHIPMENT_STATUS_LABELS[f.status] || 'status.UNKNOWN')}
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
            {t('checkoutSuccess.dispatching')}
          </p>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t('checkoutSuccess.itemsTitle')}</h2>
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
          <span>{t('checkoutSuccess.total')}</span>
          <span className="text-primary">{formatUSD(order.total_usd)}</span>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link to="/order-tracking" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          {t('checkoutSuccess.trackDelivery')}
        </Link>
        <Link to={`/invoice/${order.order_number}`} className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">
          {t('checkoutSuccess.viewInvoice')}
        </Link>
        <Link to="/support-tickets" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">
          {t('checkoutSuccess.needHelp')}
        </Link>
        <Link to="/" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">
          {t('checkoutSuccess.continueShopping')}
        </Link>
      </div>
    </div>
  );
}