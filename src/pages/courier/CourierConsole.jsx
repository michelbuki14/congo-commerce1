import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { respondToShipment, courierUpdateShipment } from '@/lib/orderService';
import { useTenantScope } from '@/lib/tenant';
import CourierHeader from '@/components/courier/CourierHeader';
import CourierJobCard from '@/components/courier/CourierJobCard';
import CourierTrackingView from '@/components/courier/CourierTrackingView';
import CourierEarnings from '@/components/courier/CourierEarnings';

const TERMINAL = ['DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'];

export default function CourierConsole() {
  const { t } = useTranslation();
  const { tenants: couriers, tenant: courier, isAdmin, loading: loadingCourier, selectTenant } = useTenantScope('Courier');
  const [user, setUser] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [fulfillments, setFulfillments] = useState({});
  const [orders, setOrders] = useState({});
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('offers');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  // A courier may work for several fleets: their console covers every fleet they
  // are bound to, an admin inspects one fleet at a time through the switcher.
  const fleets = useMemo(
    () => (isAdmin ? (courier ? [courier] : []) : couriers),
    [isAdmin, courier, couriers],
  );
  const fleetNames = useMemo(() => fleets.map((f) => f.name).filter(Boolean), [fleets]);
  const fleetKey = fleets.map((f) => f.id).join(',');

  const load = useCallback(async (names) => {
    if (!names.length) {
      setShipments([]);
      setFulfillments({});
      setOrders({});
      setWallet(null);
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [shipGroups, foGroups, allOrders, walletGroups] = await Promise.all([
        Promise.all(names.map((n) => base44.entities.Shipment.filter({ courier_name: n }, '-created_date', 100).catch(() => []))),
        Promise.all(names.map((n) => base44.entities.FulfillmentOrder.filter({ courier_name: n }, '-created_date', 100).catch(() => []))),
        base44.entities.Order.list('-created_date', 100).catch(() => []),
        Promise.all(names.map((n) => base44.entities.Wallet.filter({ owner_type: 'courier', owner_name: n }).catch(() => []))),
      ]);

      const ships = shipGroups
        .flat()
        .sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || '')));
      const fos = foGroups.flat();
      setShipments(ships);
      setFulfillments(Object.fromEntries(fos.map((f) => [f.id, f])));
      setOrders(Object.fromEntries(allOrders.map((o) => [o.order_number, o])));

      const wallets = walletGroups.flat();
      setWallet(
        wallets.length
          ? {
              balance_usd: wallets.reduce((s, w) => s + (w.balance_usd || 0), 0),
              lifetime_credit_usd: wallets.reduce((s, w) => s + (w.lifetime_credit_usd || 0), 0),
            }
          : null,
      );

      const txGroups = await Promise.all(
        wallets.map((w) => base44.entities.WalletTransaction.filter({ wallet_id: w.id }, '-created_date', 20).catch(() => [])),
      );
      setTransactions(
        txGroups
          .flat()
          .sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || '')))
          .slice(0, 20),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(fleetNames);
  }, [fleetKey, load]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const pickCourier = (id) => selectTenant(id);

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
    setError('');
    try {
      const updated = await respondToShipment({ shipment, accepted });
      setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (accepted) setTab('active');
      return true;
    } catch (e) {
      setError(t('courierConsole.actionFailed'));
      return false;
    } finally {
      setBusy('');
    }
  };

  const advance = async (shipment, status, label, extra) => {
    setBusy(shipment.id);
    setError('');
    try {
      await courierUpdateShipment({
        shipment,
        fulfillment: fulfillments[shipment.fulfillment_order_id],
        status,
        label,
        extra,
      });
      await load(fleetNames);
      return true;
    } catch (e) {
      setError(t('courierConsole.actionFailed'));
      return false;
    } finally {
      setBusy('');
    }
  };

  const TABS = [
    { id: 'offers', label: t('courierConsole.tabOffers', { count: buckets.offers.length }) },
    { id: 'active', label: t('courierConsole.tabActive', { count: buckets.active.length }) },
    { id: 'tracking', label: t('courierConsole.tabTracking', { count: buckets.active.length }) },
    { id: 'done', label: t('courierConsole.tabDone', { count: buckets.done.length }) },
  ];

  const visible = buckets[tab];

  return (
    <div className="space-y-5 pb-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
        <Truck className="h-5 w-5 text-primary" /> {t('courierConsole.title')}
      </h1>

      {!loadingCourier && (
        <CourierHeader
          user={user}
          fleets={fleets}
          activeFleet={isAdmin ? courier : fleets[0] || null}
          isAdmin={isAdmin}
          couriers={couriers}
          onSelectFleet={pickCourier}
        />
      )}

      <CourierEarnings wallet={wallet} transactions={transactions} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tx) => (
          <button
            key={tx.id}
            type="button"
            onClick={() => setTab(tx.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === tx.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            {tx.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl border border-destructive bg-card p-3 text-xs font-medium text-destructive">{error}</p>
      )}

      {loading || loadingCourier ? (
        <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
      ) : !courier ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
{t('courierConsole.noFleet')}
        </p>
      ) : tab === 'tracking' ? (
        <CourierTrackingView
          shipments={buckets.active}
          fulfillments={fulfillments}
          orders={orders}
          busy={busy}
          showFleet={fleets.length > 1}
          onAdvance={advance}
        />
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
          {tab === 'offers'
            ? t('courierConsole.emptyOffers')
            : tab === 'active'
              ? t('courierConsole.emptyActive')
              : t('courierConsole.emptyDone')}
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
              showFleet={fleets.length > 1}
              onRespond={respond}
              onAdvance={advance}
            />
          ))}
        </div>
      )}
    </div>
  );
}