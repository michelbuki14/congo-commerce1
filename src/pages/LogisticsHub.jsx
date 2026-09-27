import React, { useEffect, useMemo, useState } from 'react';
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
      setError('Le nom et la ville sont obligatoires.');
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
      setError(e?.message || "L'enregistrement a échoué.");
    } finally {
      setBusy('');
    }
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Hub logistique" links={ADMIN_LINKS} />

      <OpsHeader
        title="Réseau logistique"
        subtitle="Points de retrait, flottes de livraison et disponibilité des nœuds d'expédition sur l'ensemble du réseau."
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Points de retrait" value={`${activePoints.length} / ${points.length}`} hint="actifs / total" tone={activePoints.length ? 'good' : 'bad'} />
        <StatCard label="Flottes actives" value={`${activeCouriers.length} / ${couriers.length}`} hint="transporteurs disponibles" tone={activeCouriers.length ? 'good' : 'bad'} />
        <StatCard label="Zones desservies" value={`${activeZones.length} / ${zones.length}`} hint="zones de livraison ouvertes" />
        <StatCard
          label="Colis en attente au retrait"
          value={Object.values(loadByPoint).reduce((sum, n) => sum + n, 0)}
          hint="à collecter par les clients"
          tone={Object.values(loadByPoint).reduce((sum, n) => sum + n, 0) > 20 ? 'warn' : 'default'}
        />
      </div>

      {/* Nœuds d'expédition */}
      <section className="rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4" /> Points de retrait</h2>
          <span className="text-[11px] text-muted-foreground">{points.length} nœud(s)</span>
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
                  {loadByPoint[p.id] || 0} en attente
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{p.active === false ? 'Fermé' : 'Ouvert'}</span>
                  <Switch
                    checked={p.active !== false}
                    disabled={busy === p.id}
                    onCheckedChange={(v) => toggle('PickupPoint', p, 'active', v)}
                  />
                </div>
              </div>
            </div>
          )) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucun point de retrait enregistré.</p>
          )}
        </div>

        <form onSubmit={addPoint} className="grid grid-cols-2 gap-2.5 border-t border-border p-4 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Label htmlFor="pp-name" className="text-[11px]">Nom</Label>
            <Input id="pp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dépôt Gombe" />
          </div>
          <div>
            <Label htmlFor="pp-city" className="text-[11px]">Ville</Label>
            <Input id="pp-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Kinshasa" />
          </div>
          <div>
            <Label htmlFor="pp-commune" className="text-[11px]">Commune</Label>
            <Input id="pp-commune" value={form.commune} onChange={(e) => setForm({ ...form, commune: e.target.value })} placeholder="Gombe" />
          </div>
          <div>
            <Label htmlFor="pp-fee" className="text-[11px]">Frais (USD)</Label>
            <Input id="pp-fee" type="number" step="0.1" value={form.fee_usd} onChange={(e) => setForm({ ...form, fee_usd: e.target.value })} />
          </div>
          <div className="col-span-2 md:col-span-3">
            <Label htmlFor="pp-addr" className="text-[11px]">Adresse</Label>
            <Input id="pp-addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="12 avenue du Commerce" />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy === 'new'}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy === 'new' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Ajouter
            </button>
          </div>
          {error ? <p className="col-span-2 text-[11px] text-destructive md:col-span-4">{error}</p> : null}
        </form>
      </section>

      {/* Flottes */}
      <section className="rounded-2xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold"><Truck className="h-4 w-4" /> Flottes de livraison</h2>
        </header>
        <div className="divide-y divide-border">
          {couriers.length ? couriers.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.name} <span className="font-normal text-muted-foreground">({c.code})</span></p>
                <p className="text-[11px] text-muted-foreground">
                  {(c.service_areas || []).join(', ') || 'Zones non renseignées'} · {formatUSD(c.base_rate_usd)} + {formatUSD(c.per_kg_usd)}/kg · {c.avg_days || '—'} j
                  {c.is_mock ? ' · transporteur de test' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${loadByCourier[c.id] ? 'bg-sky-100 text-sky-900' : 'bg-secondary text-muted-foreground'}`}>
                  {loadByCourier[c.id] || 0} course(s)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{c.active === false ? 'Suspendue' : 'Disponible'}</span>
                  <Switch
                    checked={c.active !== false}
                    disabled={busy === c.id}
                    onCheckedChange={(v) => toggle('Courier', c, 'active', v)}
                  />
                </div>
              </div>
            </div>
          )) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucune flotte enregistrée.</p>
          )}
        </div>
      </section>

      {/* Zones */}
      <section className="rounded-2xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold">Zones de livraison</h2>
        </header>
        <div className="divide-y divide-border">
          {zones.length ? zones.map((z) => (
            <div key={z.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{z.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {z.city} · {formatUSD(z.fee_usd)} · {z.eta_days} j {z.supports_pickup ? '· retrait possible' : '· livraison uniquement'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{z.active === false ? 'Fermée' : 'Ouverte'}</span>
                <Switch checked={z.active !== false} disabled={busy === z.id} onCheckedChange={(v) => toggle('DeliveryZone', z, 'active', v)} />
              </div>
            </div>
          )) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucune zone de livraison enregistrée.</p>
          )}
        </div>
      </section>
    </div>
  );
}