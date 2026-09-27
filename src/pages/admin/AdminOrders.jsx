import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Truck, Coins } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import StatusBadge from '@/components/StatusBadge';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { advanceFulfillment } from '@/lib/orderService';
import { SHIPMENT_STATUS_LABELS } from '@/lib/logistics';
import { formatUSD, formatDateTime } from '@/lib/format';
import { printShippingLabels } from '@/lib/shippingLabels';
import BulkActionBar from '@/components/orders/BulkActionBar';

const FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [fulfillments, setFulfillments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState('');
  const [busy, setBusy] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const [o, f] = await Promise.all([
        base44.entities.Order.list('-created_date', 100).catch(() => []),
        base44.entities.FulfillmentOrder.list('-created_date', 300).catch(() => []),
      ]);
      setOrders(o);
      setFulfillments(f);
      setLoading(false);
    })();
  }, []);

  const nextStatus = (status) => {
    const i = FLOW.indexOf(status);
    return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
  };

  const advance = async (f) => {
    const target = nextStatus(f.status);
    if (!target) return;
    setBusy(f.id);
    try {
      const updated = await advanceFulfillment(f, target);
      setFulfillments((prev) => prev.map((x) => (x.id === f.id ? updated : x)));
      if (target === 'DELIVERED') {
        const orderFul = fulfillments.filter((x) => x.order_id === f.order_id && x.id !== f.id);
        const allDone = orderFul.every((x) => x.status === 'DELIVERED');
        if (allDone) {
          const updatedOrder = await base44.entities.Order.update(f.order_id, { status: 'DELIVERED' });
          setOrders((prev) => prev.map((o) => (o.id === f.order_id ? updatedOrder : o)));
        }
      }
    } finally {
      setBusy('');
    }
  };

  const [selected, setSelected] = useState([]);
  const [bulkMsg, setBulkMsg] = useState('');
  const archivedView = statusFilter === 'archived';
  const visible = archivedView
    ? orders.filter((o) => o.archived)
    : orders.filter((o) => !o.archived && (statusFilter === 'all' || o.status === statusFilter));
  const selectedOrders = visible.filter((o) => selected.includes(o.id));
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected(selectedOrders.length === visible.length ? [] : visible.map((o) => o.id));

  const bulkUpdate = async (patch, label) => {
    setBusy('bulk');
    await base44.entities.Order.bulkUpdate(selectedOrders.map((o) => ({ id: o.id, ...patch })));
    await base44.entities.AuditLog.create({ action: 'order.bulk_update', actor: 'admin', entity: 'Order', reference: selectedOrders.map((o) => o.order_number).join(', ').slice(0, 500), severity: 'info', details: patch });
    setOrders((prev) => prev.map((o) => (selected.includes(o.id) ? { ...o, ...patch } : o)));
    setBulkMsg(`${selectedOrders.length} commande(s) ${label}.`);
    setSelected([]);
    setBusy('');
  };

  const bulkPrint = () => {
    setBulkMsg('');
    try { printShippingLabels(selectedOrders, fulfillments); } catch (e) { setBulkMsg(e.message); }
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Commandes" links={ADMIN_LINKS} />

      <div className="flex flex-wrap gap-2">
        {['all', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'archived'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setStatusFilter(s); setSelected([]); }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            {s === 'all' ? 'Toutes' : s === 'archived' ? 'Archivées' : s === 'SHIPPED' ? 'Expédiée' : SHIPMENT_STATUS_LABELS[s] || s}
          </button>
        ))}
      </div>

      <BulkActionBar
        count={selectedOrders.length}
        allSelected={!!visible.length && selectedOrders.length === visible.length}
        onToggleAll={toggleAll}
        onStatus={(status) => bulkUpdate({ status }, `passée(s) en « ${SHIPMENT_STATUS_LABELS[status] || status} »`)}
        onPrint={bulkPrint}
        onArchive={() => bulkUpdate(archivedView ? { archived: false, archived_at: '' } : { archived: true, archived_at: new Date().toISOString() }, archivedView ? 'désarchivée(s)' : 'archivée(s)')}
        archivedView={archivedView}
        busy={busy === 'bulk'}
      />
      {bulkMsg && <p className="text-xs font-semibold text-emerald-700">{bulkMsg}</p>}

      <div className="space-y-2.5">
        {visible.map((o) => {
          const lines = fulfillments.filter((f) => f.order_id === o.id);
          const open = openId === o.id;
          return (
            <div key={o.id} className="flex items-start rounded-2xl border border-border bg-card">
              <input
                type="checkbox"
                aria-label={`Sélectionner ${o.order_number}`}
                checked={selected.includes(o.id)}
                onChange={() => toggle(o.id)}
                className="ml-4 mt-5 h-4 w-4 shrink-0"
              />
              <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setOpenId(open ? '' : o.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <div>
                    <p className="text-sm font-bold">{o.order_number}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {o.customer_name} · {o.customer_phone} · {o.city} · {formatDateTime(o.created_date)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={o.payment_status} />
                  <StatusBadge status={o.status} />
                  <span className="text-sm font-bold">{formatUSD(o.total_usd)}</span>
                </div>
              </button>

              {open && (
                <div className="space-y-3 border-t border-border p-4">
                  <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                    <div><p className="text-muted-foreground">Sous-total</p><p className="font-semibold">{formatUSD(o.subtotal_usd)}</p></div>
                    <div><p className="text-muted-foreground">Livraison</p><p className="font-semibold">{formatUSD(o.shipping_usd)}</p></div>
                    <div><p className="text-muted-foreground">Remise</p><p className="font-semibold">{formatUSD(o.discount_usd)}</p></div>
                    <div><p className="text-muted-foreground">Paiement</p><p className="font-semibold">{o.payment_method}</p></div>
                  </div>
                  {o.affiliate_code && (
                    <p className="text-xs text-muted-foreground">Attribution créateur : {o.affiliate_code}</p>
                  )}

                  {lines.map((f) => (
                    <div key={f.id} className="rounded-xl border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{f.seller_name || f.supplier_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {f.fulfillment_number} · {f.source_type === 'international_supplier' ? 'Import' : 'Local'} · {f.courier_name}
                          </p>
                        </div>
                        <StatusBadge status={f.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {f.tracking_number || '—'}</span>
                        <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> Revenu plateforme {formatUSD(f.platform_revenue_usd)}</span>
                        <span>Payout vendeur {formatUSD(f.seller_payout_usd)} {f.payout_released ? '(libéré)' : '(en attente)'}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {nextStatus(f.status) && (
                          <button
                            type="button"
                            disabled={busy === f.id}
                            onClick={() => advance(f)}
                            className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            → {SHIPMENT_STATUS_LABELS[nextStatus(f.status)]}
                          </button>
                        )}
                        {f.status === 'DELIVERED' && f.payout_released && (
                          <span className="rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-900">
                            Versement libéré
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          );
        })}
        {!visible.length && (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            Aucune commande pour ce filtre.
          </p>
        )}
      </div>
    </div>
  );
}