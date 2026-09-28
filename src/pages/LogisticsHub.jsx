import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MapPin, Plus, Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { formatUSD } from '@/lib/format';

/** Statuses where a parcel is still sitting at (or heading to) a node. */
const IN_FLIGHT = ['CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];
const CLOSED_ORDER = ['DELIVERED', 'CANCELLED'];

const EMPTY_FORM = { name: '', city: '', commune: '', address: '', phone: '', hours: '08:00 - 18:00', fee_usd: '0.5' };

export default function LogisticsHub() {
  const { t } = useTranslation();
  const [points, setPoints] = useState([]);
  const [zones, setZones] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [fulfillments, setFulfillments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      base44.entities.PickupPoint.list('name', 200).catch(() => []),
      base44.entities.DeliveryZone.list('name', 200).catch(() => []),
      base44.entities.Courier.list('name', 100).catch(() => []),
      base44.entities.Order.list('-created_date', 300).catch(() => []),
      base44.entities.FulfillmentOrder.list('-created_date', 300).catch(() => []),
    ])
      .then(([p, z, c, o, f]) => {
        setPoints(p);
        setZones(z);
        setCouriers(c);
        setOrders(o);
        setFulfillments(f);
      })
      .finally(() => setLoading(false));
  }, []);

  /** Parcels parked at each pickup node, still to be collected. */
  const loadByPoint = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (!o.pickup_point_id || CLOSED_ORDER.includes(String(o.status || '').toUpperCase())) return;
      map[o.pickup_point_id] = (map[o.pickup_point_id] || 0) + 1;
    });
    return map;
  }, [orders]);

  const loadByCourier = useMemo(() => {
    const map = {};
    fulfillments.forEach((f) => {
      if (!f.courier_id || !IN_FLIGHT.includes(String(f.status || '').toUpperCase())) return;
      map[f.courier_id] = (map[f.courier_id] || 0) + 1;
    });
    return map;
  }, [fulfillments]);

  const activePoints = points.filter((p) => p.active !== false);
  const activeCouriers = couriers.filter((c) => c.active !== false);
  const activeZones = zones.filter((z) => z.active !== false);

  const toggle = async (entity, record, key, value) => {
    setBusy(record.id);
    try {
      const updated = await base44.entities[entity].update(record.id, { [key]: value });
      const apply = (setter) => setter((prev) => prev.map((r) => (r.id === record.id ? updated : r)));
      if (entity === 'PickupPoint') apply(setPoints);
      if (entity === 'DeliveryZone') apply(setZones);
      if (entity === 'Courier') apply(setCouriers);
    } finally {
      setBusy('');
    }
  };

  const addPoint = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.city.trim()) {
      setError(t('logisticsHub.nameCityRequired'));
      return;
    }
    setBusy('new');
    setError('');
    try {
      const created = await base44.entities.PickupPoint.create({
        ...form,
        fee_usd: Number(form.fee_usd) || 0,
        active: true,
      });
      setPoints((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
    } catch (e) {
      setError(e?.message || t('logisticsHub.saveFailed'));
    } finally {
      setBusy('');
    }
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('logisticsHub.navTitle')} links={ADMIN_LINKS} />

      <OpsHeader
        title={t('logisticsHub.title')}
        subtitle={t('logisticsHub.subtitle')}
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label={t('logisticsHub.statPoints')} value={`${activePoints.length} / ${points.length}`} hint={t('logisticsHub.statActiveTotal')} tone={activePoints.length ? 'good' : 'bad'} />
        <StatCard label={t('logisticsHub.statFleets')} value={`${activeCouriers.length} / ${couriers.length}`} hint={t('logisticsHub.statFleetsHint')} tone={activeCouriers.length ? 'good' : 'bad'} />
        <StatCard label={t('logisticsHub.statZones')} value={`${activeZones.length} / ${zones.length}`} hint={t('logisticsHub.statZonesHint')} />
        <StatCard
          label={t('logisticsHub.statWaiting')}
          value={Object.values(loadByPoint).reduce((sum, n) => sum + n, 0)}
          hint={t('logisticsHub.statWaitingHint')}
          tone={Object.values(loadByPoint).reduce((sum, n) => sum + n, 0) > 20 ? 'warn' : 'default'}
        />
      </div>

      {/* Nœuds d'expédition */}
      <section className="rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4" /> {t('logisticsHub.pointsTitle')}</h2>
          <span className="text-[11px] text-muted-foreground">{t('logisticsHub.nodeCount', { count: points.length })}</span>
        </header>

        <div className="divide-y divide-border">
          {points.length ? points.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {[p.commune, p.city].filter(Boolean).join(' · ')} {p.hours ? `· ${p.hours}` : ''} · {formatUSD(p.fee_usd)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${loadByPoint[p.id] ? 'bg-amber-100 text-amber-900' : 'bg-secondary text-muted-foreground'}`}>
                  {t('logisticsHub.waitingBadge', { count: loadByPoint[p.id] || 0 })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{p.active === false ? t('logisticsHub.closed') : t('logisticsHub.open')}</span>
                  <Switch
                    checked={p.active !== false}
                    disabled={busy === p.id}
                    onCheckedChange={(v) => toggle('PickupPoint', p, 'active', v)}
                  />
                </div>
              </div>
            </div>
          )) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t('logisticsHub.noPoints')}</p>
          )}
        </div>

        <form onSubmit={addPoint} className="grid grid-cols-2 gap-2.5 border-t border-border p-4 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Label htmlFor="pp-name" className="text-[11px]">{t('logisticsHub.fName')}</Label>
            <Input id="pp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('logisticsHub.fNamePh')} />
          </div>
          <div>
            <Label htmlFor="pp-city" className="text-[11px]">{t('logisticsHub.fCity')}</Label>
            <Input id="pp-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Kinshasa" />
          </div>
          <div>
            <Label htmlFor="pp-commune" className="text-[11px]">{t('logisticsHub.fCommune')}</Label>
            <Input id="pp-commune" value={form.commune} onChange={(e) => setForm({ ...form, commune: e.target.value })} placeholder={t('logisticsHub.fCommunePh')} />
          </div>
          <div>
            <Label htmlFor="pp-fee" className="text-[11px]">{t('logisticsHub.fFee')}</Label>
            <Input id="pp-fee" type="number" step="0.1" value={form.fee_usd} onChange={(e) => setForm({ ...form, fee_usd: e.target.value })} />
          </div>
          <div className="col-span-2 md:col-span-3">
            <Label htmlFor="pp-addr" className="text-[11px]">{t('logisticsHub.fAddress')}</Label>
            <Input id="pp-addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('logisticsHub.fAddressPh')} />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy === 'new'}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy === 'new' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {t('logisticsHub.add')}
            </button>
          </div>
          {error ? <p className="col-span-2 text-[11px] text-destructive md:col-span-4">{error}</p> : null}
        </form>
      </section>

      {/* Flottes */}
      <section className="rounded-2xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold"><Truck className="h-4 w-4" /> {t('logisticsHub.fleetsTitle')}</h2>
        </header>
        <div className="divide-y divide-border">
          {couriers.length ? couriers.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.name} <span className="font-normal text-muted-foreground">({c.code})</span></p>
                <p className="text-[11px] text-muted-foreground">
                  {(c.service_areas || []).join(', ') || t('logisticsHub.noZones')} · {formatUSD(c.base_rate_usd)} + {formatUSD(c.per_kg_usd)}/kg · {c.avg_days ? t('logisticsHub.daysCount', { count: c.avg_days }) : '—'}
                  {c.is_mock ? t('logisticsHub.testCarrier') : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${loadByCourier[c.id] ? 'bg-sky-100 text-sky-900' : 'bg-secondary text-muted-foreground'}`}>
                  {t('logisticsHub.tripCount', { count: loadByCourier[c.id] || 0 })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{c.active === false ? t('logisticsHub.suspended') : t('logisticsHub.available')}</span>
                  <Switch
                    checked={c.active !== false}
                    disabled={busy === c.id}
                    onCheckedChange={(v) => toggle('Courier', c, 'active', v)}
                  />
                </div>
              </div>
            </div>
          )) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t('logisticsHub.noFleets')}</p>
          )}
        </div>
      </section>

      {/* Zones */}
      <section className="rounded-2xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold">{t('logisticsHub.zonesTitle')}</h2>
        </header>
        <div className="divide-y divide-border">
          {zones.length ? zones.map((z) => (
            <div key={z.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{z.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {z.city} · {formatUSD(z.fee_usd)} · {t('logisticsHub.zoneEta', { days: z.eta_days })} {z.supports_pickup ? t('logisticsHub.pickupOk') : t('logisticsHub.deliveryOnly')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{z.active === false ? t('logisticsHub.zoneClosed') : t('logisticsHub.zoneOpen')}</span>
                <Switch checked={z.active !== false} disabled={busy === z.id} onCheckedChange={(v) => toggle('DeliveryZone', z, 'active', v)} />
              </div>
            </div>
          )) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t('logisticsHub.noZones2')}</p>
          )}
        </div>
      </section>
    </div>
  );
}