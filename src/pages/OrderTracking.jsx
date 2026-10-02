import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Truck, Clock, MapPin, Circle, CheckCircle2, Package } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import IntlApprovalCard from '@/components/tracking/IntlApprovalCard';
import { getOrderIds, getProfile } from '@/lib/session';
import { lookupOrder } from '@/lib/orderLookup';
import { formatUSD, formatDateTime } from '@/lib/format';
import { SHIPMENT_STATUS_FLOW, SHIPMENT_STATUS_LABELS, INTL_TRACKING_FLOW } from '@/lib/logistics';
import BackButton from '@/components/BackButton';

export default function OrderTracking({ initialOrderNumber: initialOrderNumberProp, initialPhone: initialPhoneProp } = {}) {
  const { t } = useTranslation();
  const urlInitial = (new URLSearchParams(window.location.search).get('order') || '').toUpperCase();
  const [number, setNumber] = useState(urlInitial || '');
  const [phone, setPhone] = useState(initialPhoneProp || getProfile().phone || '');
  const [order, setOrder] = useState(initialOrderNumberProp ? { order_number: initialOrderNumberProp } : null);
  const [fulfillments, setFulfillments] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const history = getOrderIds();

  const intlFulfillments = fulfillments.filter(
    (f) => f.source_type === 'international_supplier' && !['CANCELLED', 'RETURNED', 'FAILED'].includes(f.status),
  );

  const lookup = async (raw) => {
    const value = String(raw ?? number).trim().toUpperCase();
    setError('');
    if (!value) {
      setError(t('orderTracking.orderNumberRequired'));
      return;
    }
    setSearching(true);
    try {
      const data = await lookupOrder(value, phone.trim() || getProfile().phone);
      setNumber(data.order.order_number);
      setOrder(data.order);
      setFulfillments(data.fulfillments || []);
      setShipments(data.shipments || []);
    } catch (e) {
      setOrder(null);
      setFulfillments([]);
      setShipments([]);
      setError(e.message || t('orderTracking.trackingUnavailable'));
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (urlInitial) lookup(urlInitial);
  }, []);

  const openHistory = async (orderNumber) => {
    setNumber(orderNumber);
    setSearching(true);
    setError('');
    try {
      const data = await lookupOrder(orderNumber, phone.trim() || getProfile().phone);
      setOrder(data.order);
      setFulfillments(data.fulfillments || []);
      setShipments(data.shipments || []);
    } catch (e) {
      setError(e.message || t('orderTracking.trackingUnavailable'));
    } finally {
      setSearching(false);
    }
  };

  const awaitingApproval = fulfillments.filter(
    (f) => f.source_type === 'international_supplier' && f.status === 'AWAITING_CUSTOMER_APPROVAL',
  );
  const trackedFulfillments = fulfillments.filter((f) => !awaitingApproval.includes(f));

  const updates = shipments
    .flatMap((s) => (s.events || []).map((e) => ({ ...e, courier: s.courier_name, tracking: s.tracking_number })))
    .filter((e) => e.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <BackButton fallback="/order-history" className="md:hidden" />
      <h1 className="text-lg font-bold md:text-xl">{t('orderTracking.title')}</h1>

      <form
        onSubmit={(e) => { e.preventDefault(); lookup(); }}
        className="space-y-3 rounded-2xl border border-border bg-card p-4"
      >
        <p className="text-xs text-muted-foreground">{t('orderTracking.helper')}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value.toUpperCase())}
            placeholder={t('orderTracking.orderNumberPh')}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('orderTracking.phonePh')}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={searching}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <Search className="h-4 w-4" /> {searching ? t('orderTracking.searching') : t('orderTracking.search')}
        </button>
      </form>

      {!!history.length && !order && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-bold">{t('orderTracking.deviceOrders')}</h2>
          <div className="space-y-2">
            {history.slice(0, 5).map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => openHistory(h.order_number)}
                className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left"
              >
                <div>
                  <p className="text-sm font-semibold">{h.order_number}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(h.created_date)}</p>
                </div>
                <span className="text-sm font-semibold">{formatUSD(h.total_usd)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {order && (
        <>
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-base font-bold">{order.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {order.customer_name} · {formatDateTime(order.created_date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={order.status} />
                <StatusBadge status={order.payment_status} />
              </div>
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {order.delivery_method === 'pickup_point' ? order.pickup_point_name || t('orderTracking.pickupFallback') : `${order.address || '—'}, ${order.city || ''}`}
              </span>
              <span className="font-semibold text-foreground">
                {t('orderTracking.totalLabel', 'Total')} {formatUSD(order.total_usd)}
              </span>
            </p>
            {order.payment_method && (
              <p className="mt-1 text-xs text-muted-foreground">{order.payment_method}</p>
            )}
            {order.pickup_code && order.delivery_method === 'pickup_point' && (
              <p className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs">
                {t('orderTracking.pickupCodeLabel')} <span className="font-black tracking-[0.25em] text-primary">{order.pickup_code}</span>
              </p>
            )}
          </section>

          {intlFulfillments.map((f) => (
            <IntlApprovalCard
              key={f.id}
              fulfillment={f}
              order={order}
              phone={phone}
              onConfirmed={(updated) =>
                setFulfillments((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)))
              }
            />
          ))}

          {trackedFulfillments.map((f) => {
            const isIntl = f.source_type === 'international_supplier';
            const steps = isIntl ? INTL_TRACKING_FLOW : SHIPMENT_STATUS_FLOW.slice(0, 8);
            const currentIndex = steps.indexOf(f.status);
            const shipment = shipments.find((s) => s.fulfillment_order_id === f.id);
            const shipmentEvents = shipment?.events || [];

            return (
              <section key={f.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{f.seller_name || f.supplier_name || 'Congo Commerce'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {f.fulfillment_number} · {isIntl ? t('trackOrder.importIntl', 'Import international') : t('trackOrder.localDrc', 'Local RDC')}
                    </p>
                  </div>
                  <StatusBadge status={f.status} />
                </div>

                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {isIntl ? (
                    <>
                      <Package className="h-3.5 w-3.5" /> {f.origin_warehouse || t('intlApproval.warehouse', 'Entrepôt Chine')}
                    </>
                  ) : (
                    <>
                      <Truck className="h-3.5 w-3.5" /> {f.courier_name || t('orderTracking.carrierFallback', 'Courrier')} · {f.tracking_number ? t('orderTracking.trackingNo', { number: f.tracking_number }) : t('orderTracking.trackingPending', 'En attente')}
                    </>
                  )}
                </p>

                <div className="mt-3 space-y-2">
                  {steps.map((step, i) => {
                    const done = currentIndex >= i;
                    return (
                      <div key={step} className="flex items-center gap-2.5">
                        {done ? (
                          i === currentIndex ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          )
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                        )}
                        <span className={`text-xs ${done ? 'font-semibold' : 'text-muted-foreground'}`}>
                          {t(SHIPMENT_STATUS_LABELS[step] || 'status.UNKNOWN')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {!!shipmentEvents.length && (
                  <div className="mt-3 space-y-1 rounded-lg bg-secondary/50 p-2.5">
                    {shipmentEvents.slice(-4).reverse().map((ev, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground">
                        <Package className="mr-1 inline h-3 w-3" />
                        {ev.label || t(SHIPMENT_STATUS_LABELS[ev.status] || 'status.UNKNOWN')} — {formatDateTime(ev.at)}
                      </p>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {shipments.length > 0 && (
            shipments.map((s) => {
              const index = SHIPMENT_STATUS_FLOW.indexOf(s.status);
              return (
                <section key={s.id} className="space-y-3 rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-bold">
                        <Truck className="h-4 w-4 text-primary" /> {s.courier_name || t('orderTracking.carrierFallback', 'Courrier')}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.tracking_number ? t('orderTracking.trackingNo', { number: s.tracking_number }) : t('orderTracking.trackingPending', 'En attente')}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>

                  <div className="space-y-2">
                    {SHIPMENT_STATUS_FLOW.slice(0, 8).map((step, i) => {
                      const done = index >= i;
                      return (
                        <div key={step} className="flex items-center gap-2.5">
                          {done ? (
                            <CheckCircle2 className={`h-4 w-4 shrink-0 ${i === index ? 'text-primary' : 'text-emerald-600'}`} />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                          )}
                          <span className={`text-xs ${done ? 'font-semibold' : 'text-muted-foreground'}`}>
                            {t(SHIPMENT_STATUS_LABELS[step] || 'status.UNKNOWN')}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {s.delivered_at && (
                    <p className="text-xs text-emerald-600">
                      {s.delivered_to
                        ? t('orderTracking.deliveredToName', { name: s.delivered_to, date: formatDateTime(s.delivered_at) })
                        : t('orderTracking.deliveredOn', { date: formatDateTime(s.delivered_at) })}
                    </p>
                  )}

                  {!!(s.events || []).length && (
                    <div className="space-y-1.5 rounded-xl bg-secondary/50 p-3">
                      <p className="text-[11px] font-bold">{t('orderTracking.carrierUpdates')}</p>
                      {s.events
                        .slice()
                        .reverse()
                        .slice(0, 6)
                        .map((ev, i) => (
                          <p key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                            <Clock className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>
                              {ev.label || t(SHIPMENT_STATUS_LABELS[ev.status] || 'status.UNKNOWN')} — {formatDateTime(ev.at)}
                            </span>
                          </p>
                        ))}
                    </div>
                  )}
                </section>
              );
            })
          )}

          {!trackedFulfillments.length && !shipments.length && (
            <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              {t('orderTracking.preparing', 'Préparation en cours…')}
            </p>
          )}

          {!!updates.length && (
            <p className="text-[11px] text-muted-foreground">
              {t('orderTracking.lastUpdate', { date: formatDateTime(updates[0].at), courier: updates[0].courier ? ` — ${updates[0].courier}` : '' })}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Link to={`/order/${order.order_number}`} className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">
              {t('orderTracking.orderDetails')}
            </Link>
            <Link to="/dispute-center" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">
              {t('orderTracking.reportIssue')}
            </Link>
            <Link to="/support-tickets" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
              {t('orderTracking.contactSupport')}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
