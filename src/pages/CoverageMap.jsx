import React, { useEffect, useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import { formatUSD } from '@/lib/format';

/**
 * The pickup points and delivery zones only carry a city (no coordinates are
 * stored), so coverage is drawn city by city from this reference table.
 */
const CITIES = {
  Kinshasa: [-4.3276, 15.3136],
  Lubumbashi: [-11.6609, 27.4794],
  'Mbuji-Mayi': [-6.136, 23.5898],
  Kananga: [-5.896, 22.416],
  Kisangani: [0.5153, 25.191],
  Bukavu: [-2.5083, 28.8608],
  Goma: [-1.6771, 29.2287],
  Kolwezi: [-10.7147, 25.4667],
  Likasi: [-10.9814, 26.7333],
  Matadi: [-5.8174, 13.45],
  Uvira: [-3.3953, 29.1378],
  Bunia: [1.5594, 30.2522],
  Kikwit: [-5.041, 18.816],
  Tshikapa: [-6.4167, 20.8],
  Kalemie: [-5.9475, 29.1947],
  Butembo: [0.14, 29.29],
  Mbandaka: [0.0487, 18.2603],
  Boma: [-5.85, 13.05],
};

const key = (city) => String(city || '').trim().toLowerCase();

const CITY_INDEX = Object.fromEntries(Object.entries(CITIES).map(([name, coords]) => [key(name), { name, coords }]));

const LAYERS = [
  { id: 'points', label: 'Points de retrait' },
  { id: 'zones', label: 'Zones de livraison' },
  { id: 'couriers', label: 'Couverture transporteurs' },
];

export default function CoverageMap() {
  const [points, setPoints] = useState([]);
  const [zones, setZones] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(['points', 'zones', 'couriers']);

  useEffect(() => {
    Promise.all([
      base44.entities.PickupPoint.list('name', 200).catch(() => []),
      base44.entities.DeliveryZone.list('name', 200).catch(() => []),
      base44.entities.Courier.list('name', 100).catch(() => []),
    ])
      .then(([p, z, c]) => {
        setPoints(p);
        setZones(z);
        setCouriers(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const activePoints = points.filter((p) => p.active !== false);
  const activeZones = zones.filter((z) => z.active !== false);
  const activeCouriers = couriers.filter((c) => c.active !== false);

  const pointsByCity = useMemo(() => {
    const map = {};
    activePoints.forEach((p) => {
      const k = key(p.city);
      if (!map[k]) map[k] = [];
      map[k].push(p);
    });
    return map;
  }, [activePoints]);

  const zonesByCity = useMemo(() => {
    const map = {};
    activeZones.forEach((z) => {
      const k = key(z.city);
      if (!map[k]) map[k] = [];
      map[k].push(z);
    });
    return map;
  }, [activeZones]);

  const courierCities = useMemo(() => {
    const map = {};
    activeCouriers.forEach((c) => (c.service_areas || []).forEach((area) => {
      const k = key(area);
      if (!map[k]) map[k] = [];
      map[k].push(c.name);
    }));
    return map;
  }, [activeCouriers]);

  const plotted = new Set([...Object.keys(pointsByCity), ...Object.keys(zonesByCity), ...Object.keys(courierCities)]);
  const unmapped = [
    ...activePoints.filter((p) => !CITY_INDEX[key(p.city)]).map((p) => `${p.name} (${p.city || 'ville inconnue'})`),
    ...activeZones.filter((z) => !CITY_INDEX[key(z.city)]).map((z) => `zone ${z.name} (${z.city || 'ville inconnue'})`),
  ];

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title="Couverture logistique"
        subtitle="Points de retrait, zones de livraison et zones desservies par les transporteurs, ville par ville."
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Villes couvertes" value={plotted.size} hint="avec au moins un service actif" />
        <StatCard label="Points de retrait actifs" value={activePoints.length} tone={activePoints.length ? 'good' : 'bad'} />
        <StatCard label="Zones ouvertes" value={activeZones.length} />
        <StatCard label="Transporteurs actifs" value={activeCouriers.length} tone={activeCouriers.length ? 'good' : 'bad'} />
      </div>

      <div className="flex flex-wrap gap-2">
        {LAYERS.map((l) => {
          const on = visible.includes(l.id);
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setVisible(on ? visible.filter((v) => v !== l.id) : [...visible, l.id])}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${on ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
            >
              {l.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <MapContainer center={[-4.3276, 15.3136]} zoom={5} scrollWheelZoom className="h-[460px] w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {visible.includes('couriers') && Object.entries(courierCities).map(([k, names]) => {
            const city = CITY_INDEX[k];
            if (!city) return null;
            return (
              <Circle
                key={`c-${k}`}
                center={city.coords}
                radius={60000}
                pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.08, weight: 1 }}
              >
                <Tooltip>{`${city.name} — ${names.length} transporteur(s)`}</Tooltip>
              </Circle>
            );
          })}

          {visible.includes('zones') && Object.entries(zonesByCity).map(([k, rows]) => {
            const city = CITY_INDEX[k];
            if (!city) return null;
            return (
              <Circle
                key={`z-${k}`}
                center={city.coords}
                radius={32000}
                pathOptions={{ color: '#0f766e', fillColor: '#0f766e', fillOpacity: 0.12, weight: 1.5 }}
              >
                <Popup>
                  <p className="text-xs font-bold">{city.name} — zones</p>
                  {rows.map((z) => (
                    <p key={z.id} className="text-[11px]">
                      {z.name} · {formatUSD(z.fee_usd)} · {z.eta_days} j {z.supports_pickup ? '· retrait' : ''}
                    </p>
                  ))}
                </Popup>
              </Circle>
            );
          })}

          {visible.includes('points') && Object.entries(pointsByCity).map(([k, rows]) => {
            const city = CITY_INDEX[k];
            if (!city) return null;
            return (
              <CircleMarker
                key={`p-${k}`}
                center={city.coords}
                radius={8 + Math.min(rows.length, 8) * 1.6}
                pathOptions={{ color: '#111111', fillColor: '#e4572e', fillOpacity: 0.85, weight: 2 }}
              >
                <Popup>
                  <p className="text-xs font-bold">{city.name} — {rows.length} point(s) de retrait</p>
                  {rows.map((p) => (
                    <p key={p.id} className="text-[11px]">
                      {p.name}{p.commune ? ` · ${p.commune}` : ''} · {p.hours || '—'} · {formatUSD(p.fee_usd)}
                    </p>
                  ))}
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="grid gap-2.5 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold">Légende</h2>
          <ul className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
            <li><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#e4572e]" /> Points de retrait (taille = nombre de points)</li>
            <li><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#0f766e]" /> Zones de livraison ouvertes</li>
            <li><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#2563eb]" /> Zones desservies par les transporteurs</li>
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Les nœuds sont positionnés à l'échelle de la ville : seules les villes sont enregistrées, pas les coordonnées exactes.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold">Villes non cartographiées</h2>
          {unmapped.length ? (
            <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              {unmapped.slice(0, 8).map((label) => <li key={label}>{label}</li>)}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">Toutes les villes actives sont cartographiées.</p>
          )}
        </div>
      </div>
    </div>
  );
}