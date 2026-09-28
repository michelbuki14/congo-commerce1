import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckSquare, Loader2, Printer, Square } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import { advanceFulfillment } from '@/lib/orderService';
import { SHIPMENT_STATUS_FLOW, SHIPMENT_STATUS_LABELS } from '@/lib/logistics';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { formatUSD } from '@/lib/format';
import { esc } from '@/lib/shippingLabels';

const CLOSED = ['DELIVERED', 'CANCELLED', 'RETURNED'];

/** Prints one shipping label per selected parcel, in a dedicated window. */
function printLabels(rows, orders, L) {
  const win = window.open('', '_blank', 'width=900,height=1200');
  if (!win) return;
  const blocks = rows.map((f) => {
    const order = orders[f.order_number] || {};
    const pickup = order.delivery_method === 'pickup_point';
    return `<section class="label">
      <header><strong>Congo Commerce</strong><span>${esc(f.fulfillment_number)}</span></header>
      <p class="ref">${esc(f.order_number)}</p>
      <p class="to">${esc(order.customer_name || L.client)}<br/>${esc(order.customer_phone)}</p>
      <p class="addr">${pickup ? `${L.pickupPrefix}${esc(order.pickup_point_name || L.pickupFallback)}` : `${esc(order.address)}<br/>${esc(order.city)}`}</p>
      <p class="meta">${L.itemCount(f.items ? f.items.length : 0)} · ${esc(f.courier_name || L.noCourier)}${f.tracking_number ? ` · ${esc(f.tracking_number)}` : ''}</p>
      ${pickup && order.pickup_code ? `<p class="code">${L.pickupCode}${esc(order.pickup_code)}</p>` : ''}
    </section>`;
  }).join('');
  win.document.write(`<!doctype html><html lang="${L.lang}"><head><meta charset="utf-8" /><title>${esc(L.docTitle)}</title>
    <style>
      body{font-family:system-ui,-apple-system,sans-serif;margin:16px;color:#111}
      .label{border:1.5px solid #111;border-radius:10px;padding:14px;margin-bottom:12px;page-break-inside:avoid}
      header{display:flex;justify-content:space-between;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
      .ref{font-size:20px;font-weight:800;margin:8px 0 4px}
      .to{font-size:14px;font-weight:700;margin:0}
      .addr{font-size:12px;margin:6px 0 0}
      .meta{font-size:11px;color:#555;margin:6px 0 0}
      .code{font-size:13px;font-weight:700;margin:6px 0 0}
    </style></head><body>${blocks}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export default function BulkOrders() {
  const { t } = useTranslation();
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [rows, setRows] = useState([]);
  const [orders, setOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState('open');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!seller) {
      setLoading(false);
      return;
    }
    Promise.all([
      base44.entities.FulfillmentOrder.filter({ seller_id: seller.id }, '-created_date', 200).catch(() => []),
      base44.entities.Order.list('-created_date', 300).catch(() => []),
    ])
      .then(([fulfillments, allOrders]) => {
        setRows(fulfillments);
        setOrders(Object.fromEntries(allOrders.map((o) => [o.order_number, o])));
      })
      .finally(() => setLoading(false));
  }, [seller]);

  const visible = useMemo(
    () => rows.filter((f) => (filter === 'open' ? !CLOSED.includes(String(f.status || '')) : true)),
    [rows, filter],
  );
  const picked = visible.filter((f) => selected.includes(f.id));
  const allPicked = visible.length > 0 && picked.length === visible.length;

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const bulk = async (mode) => {
    if (!picked.length) return;
    setBusy(mode);
    setNotice('');
    const done = [];
    try {
      for (const f of picked) {
        const index = SHIPMENT_STATUS_FLOW.indexOf(String(f.status || ''));
        const target = mode === 'cancel'
          ? 'CANCELLED'
          : index >= 0 && index < SHIPMENT_STATUS_FLOW.length - 1
            ? SHIPMENT_STATUS_FLOW[index + 1]
            : null;
        if (!target) continue;
        const updated = await advanceFulfillment(f, target);
        done.push(updated);
      }
      setRows((prev) => prev.map((f) => done.find((d) => d.id === f.id) || f));
      setSelected([]);
      setNotice(
        mode === 'cancel'
          ? t('bulkOrders.cancelledMsg', { count: done.length })
          : t('bulkOrders.advancedMsg', { count: done.length }),
      );
    } catch (e) {
      setNotice(e?.message || t('bulkOrders.bulkFailed'));
    } finally {
      setBusy('');
    }
  };

  if (loadingSeller || loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title={t('bulkOrders.title')}
        subtitle={t('bulkOrders.subtitle')}
      >
        <button
          type="button"
          disabled={!picked.length}
          onClick={() => printLabels(picked, orders, {
            client: t('bulkOrders.labelClient'),
            pickupPrefix: t('bulkOrders.labelPickupPrefix'),
            pickupFallback: t('bulkOrders.labelPickupFallback'),
            noCourier: t('bulkOrders.labelNoCourier'),
            pickupCode: t('bulkOrders.labelPickupCode'),
            lang: t('bulkOrders.labelLang'),
            docTitle: t('bulkOrders.labelDocTitle'),
            itemCount: (c) => t('bulkOrders.itemCount', { count: c }),
          })}
          className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold disabled:opacity-40"
        >
          <Printer className="h-3.5 w-3.5" /> {t('bulkOrders.printLabels', { count: picked.length || '' })}
        </button>
      </OpsHeader>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label={t('bulkOrders.statShown')} value={visible.length} />
        <StatCard label={t('bulkOrders.statSelected')} value={picked.length} tone={picked.length ? 'good' : 'default'} />
        <StatCard label={t('bulkOrders.statOpen')} value={rows.filter((f) => !CLOSED.includes(String(f.status || ''))).length} tone="warn" />
        <StatCard label={t('bulkOrders.statValue')} value={formatUSD(picked.reduce((s, f) => s + (Number(f.subtotal_usd) || 0), 0))} />
      </div>

      {notice ? <p className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs">{notice}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        {[{ id: 'open', label: t('bulkOrders.filterOpen') }, { id: 'all', label: t('bulkOrders.filterAll') }].map((tx) => (
          <button
            key={tx.id}
            type="button"
            onClick={() => setFilter(tx.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${filter === tx.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelected(allPicked ? [] : visible.map((f) => f.id))}
          className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold"
        >
          {allPicked ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          {allPicked ? t('bulkOrders.deselectAll') : t('bulkOrders.selectAll')}
        </button>

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!picked.length || !!busy}
            onClick={() => bulk('advance')}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            {busy === 'advance' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {t('bulkOrders.advance')}
          </button>
          <button
            type="button"
            disabled={!picked.length || !!busy}
            onClick={() => bulk('cancel')}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-destructive disabled:opacity-40"
          >
            {t('bulkOrders.cancelSel')}
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="divide-y divide-border">
          {visible.length ? visible.map((f) => {
            const on = selected.includes(f.id);
            const order = orders[f.order_number] || {};
            return (
              <div key={f.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${on ? 'bg-secondary/40' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggle(f.id)}
                  aria-label={t('bulkOrders.selectAria', { num: f.order_number })}
                  className="shrink-0 text-muted-foreground"
                >
                  {on ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{f.order_number}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {f.fulfillment_number} · {order.customer_name || t('bulkOrders.customerFallback')} · {order.city || '—'}
                    {order.delivery_method === 'pickup_point' ? t('bulkOrders.pickupSuffix') : ''} · {t('bulkOrders.itemCount', { count: (f.items || []).length })}
                  </p>
                </div>
                <span className="text-xs font-semibold">{formatUSD(f.subtotal_usd)}</span>
                <StatusBadge status={f.status} />
                {!CLOSED.includes(String(f.status || '')) ? (
                  <span className="text-[11px] text-muted-foreground">
                    {t('bulkOrders.nextStep', { step: t(SHIPMENT_STATUS_LABELS[SHIPMENT_STATUS_FLOW[SHIPMENT_STATUS_FLOW.indexOf(String(f.status || '')) + 1]] || 'status.UNKNOWN') })}
                  </span>
                ) : null}
              </div>
            );
          }) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t('bulkOrders.empty')}</p>
          )}
        </div>
      </section>
    </div>
  );
}