import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Package, Truck, CheckCircle2, Circle } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { getOrderIds, getProfile } from '@/lib/session';
import { lookupOrder } from '@/lib/orderLookup';
import { formatUSD, formatDate } from '@/lib/format';
import { SHIPMENT_STATUS_FLOW, SHIPMENT_STATUS_LABELS } from '@/lib/logistics';

export default function TrackOrder() {
  const { t } = useTranslation();
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState(getProfile().phone || '');
  const [order, setOrder] = useState(null);
  const [fulfillments, setFulfillments] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const history = getOrderIds();

  const lookup = async (e) => {
    e.preventDefault();
    setError('');
    setOrder(null);
    if (!number.trim()) {
      setError(t('trackOrder.orderNumberRequired'));
      return;
    }
    setSearching(true);
    try {
      const data = await lookupOrder(number.trim().toUpperCase(), phone.trim() || getProfile().phone);
      setOrder(data.order);
      setFulfillments(data.fulfillments || []);
      setShipments(data.shipments || []);
    } catch (e) {
      setError(e.message || t('trackOrder.lookupFailed'));
    } finally {
      setSearching(false);
    }
  };

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
      setError(e.message || t('trackOrder.lookupFailed'));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">{t('trackOrder.title')}</h1>

      <form onSubmit={lookup} className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value.toUpperCase())}
            placeholder={t('trackOrder.orderNumberPh')}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('trackOrder.phonePh')}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={searching}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <Search className="h-4 w-4" /> {searching ? t('trackOrder.searching') : t('trackOrder.search')}
        </button>
      </form>

      {!!history.length && !order && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-bold">{t('trackOrder.deviceOrders')}</h2>
          <div className="space-y-2">
            {history.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => openHistory(h.order_number)}
                className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left"
              >
                <div>
                  <p className="text-sm font-semibold">{h.order_number}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(h.created_date)}</p>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-base font-bold">{order.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(order.created_date)} · {order.customer_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={order.status} />
                <StatusBadge status={order.payment_status} />
              </div>
            </div>
            <p className="mt-3 text-sm">
              {t('trackOrder.totalLabel')} <span className="font-bold text-primary">{formatUSD(order.total_usd)}</span> · {order.payment_method}
            </p>
          </section>

          {fulfillments.map((f) => {
            const shipment = shipments.find((s) => s.fulfillment_order_id === f.id);
            const currentIndex = SHIPMENT_STATUS_FLOW.indexOf(f.status);
            const steps = SHIPMENT_STATUS_FLOW.slice(0, 8);
            return (
              <section key={f.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{f.seller_name || f.supplier_name || 'Congo Commerce'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {f.fulfillment_number} · {f.source_type === 'international_supplier' ? t('trackOrder.importIntl') : t('trackOrder.localDrc')}
                    </p>
                  </div>
                  <StatusBadge status={f.status} />
                </div>

                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" /> {f.courier_name || t('orderTracking.carrierFallback')} · {f.tracking_number ? t('orderTracking.trackingNo', { number: f.tracking_number }) : t('orderTracking.trackingPending')}
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

                {!!shipment?.events?.length && (
                  <div className="mt-3 space-y-1 rounded-lg bg-secondary/50 p-2.5">
                    {shipment.events.slice(-4).reverse().map((ev, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground">
                        <Package className="mr-1 inline h-3 w-3" />
                        {ev.label} — {formatDate(ev.at)}
                      </p>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          <Link to={`/order/${order.order_number}`} className="block rounded-full border border-border bg-card py-3 text-center text-sm font-semibold">
            {t('trackOrder.viewDetails')}
          </Link>
        </>
      )}
    </div>
  );
}