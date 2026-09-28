import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const LAYER_IDS = [
  { id: 'points', key: 'layerPoints' },
  { id: 'zones', key: 'layerZones' },
  { id: 'couriers', key: 'layerCouriers' },
];

export default function CoverageMap() {
  const { t } = useTranslation();
  const LAYERS = LAYER_IDS.map((l) => ({ id: l.id, label: t(`coverageMap.${l.key}`) }));
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
    ...activePoints.filter((p) => !CITY_INDEX[key(p.city)]).map((p) => `${p.name} (${p.city || t('coverageMap.unknownCity')})`),
    ...activeZones.filter((z) => !CITY_INDEX[key(z.city)]).map((z) => `zone ${z.name} (${z.city || t('coverageMap.unknownCity')})`),
  ];

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title={t('coverageMap.title')}
        subtitle={t('coverageMap.subtitle')}
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label={t('coverageMap.statCities')} value={plotted.size} hint={t('coverageMap.statCitiesHint')} />
        <StatCard label={t('coverageMap.statPoints')} value={activePoints.length} tone={activePoints.length ? 'good' : 'bad'} />
        <StatCard label={t('coverageMap.statZones')} value={activeZones.length} />
        <StatCard label={t('coverageMap.statCouriers')} value={activeCouriers.length} tone={activeCouriers.length ? 'good' : 'bad'} />
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
                <Tooltip>{t('coverageMap.courierTip', { city: city.name, count: names.length })}</Tooltip>
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
                  <p className="text-xs font-bold">{t('coverageMap.zonesTip', { city: city.name })}</p>
                  {rows.map((z) => (
                    <p key={z.id} className="text-[11px]">
                      {z.name} · {formatUSD(z.fee_usd)} · {t('coverageMap.etaDays', { days: z.eta_days })} {z.supports_pickup ? t('coverageMap.pickupSuffix') : ''}
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
                  <p className="text-xs font-bold">{t('coverageMap.pointsTip', { city: city.name, count: rows.length })}</p>
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
          <h2 className="text-sm font-bold">{t('coverageMap.legend')}</h2>
          <ul className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
            <li><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#e4572e]" /> {t('coverageMap.legendPoints')}</li>
            <li><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#0f766e]" /> {t('coverageMap.legendZones')}</li>
            <li><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#2563eb]" /> {t('coverageMap.legendCouriers')}</li>
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {t('coverageMap.nodesNote')}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold">{t('coverageMap.unmapped')}</h2>
          {unmapped.length ? (
            <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              {unmapped.slice(0, 8).map((label) => <li key={label}>{label}</li>)}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">{t('coverageMap.allMapped')}</p>
          )}
        </div>
      </div>
    </div>
  );
}