import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { respondToShipment, courierUpdateShipment } from '@/lib/orderService';
import CourierJobCard from '@/components/courier/CourierJobCard';
import CourierEarnings from '@/components/courier/CourierEarnings';

const TERMINAL = ['DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'];
const STORAGE_KEY = 'cc_courier_name';

export default function CourierConsole() {
  const [couriers, setCouriers] = useState([]);
  const [selected, setSelected] = useState('');
  const [shipments, setShipments] = useState([]);
  const [fulfillments, setFulfillments] = useState({});
  const [orders, setOrders] = useState({});
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('offers');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    base44.entities.Courier.list('name', 50)
      .then((rows) => {
        setCouriers(rows);
        const stored = localStorage.getItem(STORAGE_KEY);
        setSelected(rows.some((c) => c.name === stored) ? stored : rows[0]?.name || '');
      })
      .catch(() => setLoading(false));
  }, []);

  const load = useCallback(async (name) => {
    if (!name) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [ships, fos, allOrders, wallets] = await Promise.all([
        base44.entities.Shipment.filter({ courier_name: name }, '-created_date', 100).catch(() => []),
        base44.entities.FulfillmentOrder.filter({ courier_name: name }, '-created_date', 100).catch(() => []),
        base44.entities.Order.list('-created_date', 100).catch(() => []),
        base44.entities.Wallet.filter({ owner_type: 'courier', owner_name: name }).catch(() => []),
      ]);
      setShipments(ships);
      setFulfillments(Object.fromEntries(fos.map((f) => [f.id, f])));
      setOrders(Object.fromEntries(allOrders.map((o) => [o.order_number, o])));

      const courierWallet = wallets[0] || null;
      setWallet(courierWallet);
      setTransactions(
        courierWallet
          ? await base44.entities.WalletTransaction.filter({ wallet_id: courierWallet.id }, '-created_date', 20).catch(() => [])
          : [],
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(selected);
  }, [selected, load]);

  const pickCourier = (name) => {
    localStorage.setItem(STORAGE_KEY, name);
    setSelected(name);
  };

  const buckets = useMemo(
    () => ({
      offers: shipments.filter(
        (s) => s.courier_response !== 'accepted' && s.courier_response !== 'declined' && !TERMINAL.includes(s.status),
      ),
      active: shipments.filter((s) => s.courier_response === 'accepted' && !TERMINAL.includes(s.status)),
      done: shipments.filter((s) => TERMINAL.includes(s.status)),
    }),
    [shipments],
  );

  const respond = async (shipment, accepted) => {
    setBusy(shipment.id);
    try {
      const updated = await respondToShipment({ shipment, accepted });
      setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } finally {
      setBusy('');
    }
  };

  const advance = async (shipment, status, label, extra) => {
    setBusy(shipment.id);
    try {
      await courierUpdateShipment({
        shipment,
        fulfillment: fulfillments[shipment.fulfillment_order_id],
        status,
        label,
        extra,
      });
      await load(selected);
    } finally {
      setBusy('');
    }
  };

  const TABS = [
    { id: 'offers', label: `Nouvelles courses (${buckets.offers.length})` },
    { id: 'active', label: `En cours (${buckets.active.length})` },
    { id: 'done', label: `Terminées (${buckets.done.length})` },
  ];

  const visible = buckets[tab];

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-lg font-bold md:text-xl">
          <Truck className="h-5 w-5 text-primary" /> Espace livreur
        </h1>
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          Je livre pour
          <select
            value={selected}
            onChange={(e) => pickCourier(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          >
            {couriers.length === 0 && <option value="">Aucun transporteur</option>}
            {couriers.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      <CourierEarnings wallet={wallet} transactions={transactions} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
          {tab === 'offers'
            ? 'Aucune nouvelle course pour le moment.'
            : tab === 'active'
              ? 'Aucune course en cours.'
              : 'Aucune course terminée.'}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => (
            <CourierJobCard
              key={s.id}
              shipment={s}
              fulfillment={fulfillments[s.fulfillment_order_id]}
              order={orders[s.order_number]}
              busy={busy}
              onRespond={respond}
              onAdvance={advance}
            />
          ))}
        </div>
      )}
    </div>
  );
}