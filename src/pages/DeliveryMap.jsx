import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import StatCard from '@/components/ops/StatCard';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { cityCoords } from '@/lib/drcCities';

const ACTIVE = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];
const LAYERS = [['shipments', 'Livraisons', '#2563eb'], ['pickups', 'Points de retrait', '#16a34a'], ['couriers', 'Coursiers actifs', '#ea580c']];

export default function DeliveryMap() {
  const [data, setData] = useState(null);
  const [layer, setLayer] = useState('shipments');

  const load = async () => {
    const [shipments, points, orders] = await Promise.all([
      base44.entities.Shipment.list('-updated_date', 300),
      base44.entities.PickupPoint.filter({ active: true }, 'city', 500),
      base44.entities.Order.list('-created_date', 500),
    ]);
    const cityOf = Object.fromEntries(orders.map((o) => [o.order_number, o.city]));
    setData({ shipments: shipments.map((s) => ({ ...s, city: cityOf[s.order_number] })), points });
  };
  useEffect(() => {
    load();
    return base44.entities.Shipment.subscribe(() => load());
  }, []);

  const cities = useMemo(() => {
    const m = {};
    const bump = (city, key) => {
      const c = cityCoords(city); if (!c) return;
      const k = String(city).trim();
      m[k] = m[k] || { city: k, coords: c, shipments: 0, delivered: 0, pickups: 0, couriers: new Set() };
      if (key) m[k][key] += 1;
      return m[k];
    };
    (data?.shipments || []).forEach((s) => {
      const e = bump(s.city, 'shipments');
      if (e && s.status === 'DELIVERED') e.delivered += 1;
      if (e && ACTIVE.includes(s.status) && s.courier_name) e.couriers.add(s.courier_name);
    });
    (data?.points || []).forEach((p) => bump(p.city, 'pickups'));
    return Object.values(m).map((c) => ({ ...c, couriers: c.couriers.size }));
  }, [data]);

  const active = (data?.shipments || []).filter((s) => ACTIVE.includes(s.status));
  const [, , color] = LAYERS.find(([k]) => k === layer);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-5">
      <DashboardNav title="Carte des livraisons" links={ADMIN_LINKS} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Expéditions" value={data?.shipments.length ?? '–'} />
        <StatCard label="En cours" value={active.length} tone="warning" />
        <StatCard label="Points de retrait" value={data?.points.length ?? '–'} />
        <StatCard label="Coursiers actifs" value={new Set(active.map((s) => s.courier_name).filter(Boolean)).size} />
      </div>
      <div className="flex flex-wrap gap-2">
        {LAYERS.map(([k, l]) => (
          <button key={k} onClick={() => setLayer(k)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${layer === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>{l}</button>
        ))}
      </div>
      <div className="h-[460px] overflow-hidden rounded-2xl border border-border">
        <MapContainer center={[-4, 23.5]} zoom={5} className="h-full w-full">
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {cities.filter((c) => c[layer] > 0).map((c) => (
            <CircleMarker key={c.city} center={c.coords} radius={8 + Math.min(c[layer], 30)} pathOptions={{ color, fillOpacity: 0.4 }}>
              <Tooltip>
                <b>{c.city}</b><br />{c.shipments} expédition(s) · {c.delivered} livrée(s)<br />{c.pickups} point(s) de retrait · {c.couriers} coursier(s) actif(s)
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <p className="text-[11px] text-muted-foreground">Mise à jour en direct à chaque changement d'expédition. Les positions sont agrégées par ville de livraison (pas de suivi GPS individuel).</p>
    </div>
  );
}