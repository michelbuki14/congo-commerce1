import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Truck, MapPin, Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { getCities } from '@/lib/config';
import { formatUSD } from '@/lib/format';
import { useTranslation } from 'react-i18next';

const TAB_IDS = ['couriers', 'zones', 'pickups'];

export default function AdminLogistics() {
  const { t } = useTranslation();
  const TABS = TAB_IDS.map((id) => ({ id, label: t(`adminLogistics.tab_${id}`) }));
  const [tab, setTab] = useState('couriers');
  const [couriers, setCouriers] = useState([]);
  const [zones, setZones] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({
    zones: { name: '', city: getCities()[0], fee_usd: 2.5, eta_days: '2-4' },
    pickups: { name: '', city: getCities()[0], commune: '', address: '', phone: '', fee_usd: 0.5 },
  });
  const [savingZone, setSavingZone] = useState(false);
  const [savingPickup, setSavingPickup] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const patchCourier = async (c, field, value) => {
    const updated = await base44.entities.Courier.update(c.id, { [field]: Number(value) || 0 });
    setCouriers((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
  };

  const patchCourierLogo = async (c, value) => {
    const updated = await base44.entities.Courier.update(c.id, { logo_url: value });
    setCouriers((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
  };

  const addZone = async (e) => {
    e.preventDefault();
    if (!drafts.zones.name || savingZone) return;
    setSavingZone(true);
    try {
      await base44.entities.DeliveryZone.create({ ...drafts.zones, country: 'CD', supports_pickup: true, active: true });
      setDrafts({ ...drafts, zones: { name: '', city: getCities()[0], fee_usd: 2.5, eta_days: '2-4' } });
      await load();
    } finally {
      setSavingZone(false);
    }
  };

  const addPickup = async (e) => {
    e.preventDefault();
    if (!drafts.pickups.name || savingPickup) return;
    setSavingPickup(true);
    try {
      await base44.entities.PickupPoint.create({ ...drafts.pickups, hours: '08:00 - 18:00', active: true });
      setDrafts({ ...drafts, pickups: { name: '', city: getCities()[0], commune: '', address: '', phone: '', fee_usd: 0.5 } });
      await load();
    } finally {
      setSavingPickup(false);
    }
  };

  const removeZone = async (z) => {
    await base44.entities.DeliveryZone.delete(z.id);
    setZones((prev) => prev.filter((x) => x.id !== z.id));
  };

  const removePickup = async (p) => {
    await base44.entities.PickupPoint.delete(p.id);
    setPickups((prev) => prev.filter((x) => x.id !== p.id));
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('adminLogistics.title')} links={ADMIN_LINKS} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tx) => (
          <button
            key={tx.id}
            type="button"
            onClick={() => setTab(tx.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${tab === tx.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            {tx.label}
          </button>
        ))}
      </div>

      {tab === 'couriers' && (
        <div className="space-y-2.5">
          {couriers.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-bold">
                  {c.logo_url ? (
                    <Image src={c.logo_url} alt={c.name} className="h-5 w-5 rounded object-cover" />
                  ) : (
                    <Truck className="h-4 w-4 text-primary" />
                  )}
                  {c.name}
                  {c.is_mock && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">{t('adminLogistics.demo')}</span>}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {c.supports_tracking ? t('adminLogistics.trackingOn') : t('adminLogistics.trackingOff')} · {c.supports_cod ? t('adminLogistics.cod') : t('adminLogistics.prepaid')}
                </span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {[
                  { field: 'base_rate_usd', label: t('adminLogistics.baseRate') },
                  { field: 'per_kg_usd', label: t('adminLogistics.perKg') },
                  { field: 'avg_days', label: t('adminLogistics.avgDays') },
                ].map((f) => (
                  <label key={f.field} className="text-[11px] text-muted-foreground">
                    {f.label}
                    <input
                      type="number"
                      defaultValue={c[f.field] ?? 0}
                      onBlur={(e) => patchCourier(c, f.field, e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                    />
                  </label>
                ))}
              </div>
              <label className="mt-3 block text-[11px] text-muted-foreground">
                {t('adminLogistics.logoLabel')}
                <input
                  defaultValue={c.logo_url || ''}
                  onBlur={(e) => patchCourierLogo(c, e.target.value.trim())}
                  placeholder="https://…"
                  className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                />
              </label>
              <p className="mt-2 text-[11px] text-muted-foreground">{t('adminLogistics.serviceAreas', { areas: (c.service_areas || []).join(', ') || '—' })}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'zones' && (
        <>
          <form onSubmit={addZone} className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4">
            <input value={drafts.zones.name} onChange={(e) => setDrafts({ ...drafts, zones: { ...drafts.zones, name: e.target.value } })} placeholder={t('adminLogistics.zoneName')} required className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
            <select value={drafts.zones.city} onChange={(e) => setDrafts({ ...drafts, zones: { ...drafts.zones, city: e.target.value } })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
              {getCities().map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input type="number" step="0.1" value={drafts.zones.fee_usd} onChange={(e) => setDrafts({ ...drafts, zones: { ...drafts.zones, fee_usd: Number(e.target.value) } })} placeholder={t('adminLogistics.feeUsd')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
            <input value={drafts.zones.eta_days} onChange={(e) => setDrafts({ ...drafts, zones: { ...drafts.zones, eta_days: e.target.value } })} placeholder={t('adminLogistics.eta')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
            <button type="submit" disabled={savingZone} className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground md:col-span-4 disabled:opacity-50">
              <Plus className="h-4 w-4" /> {savingZone ? t('adminLogistics.saving') : t('adminLogistics.addZone')}
            </button>
          </form>
          <div className="space-y-2">
            {zones.map((z) => (
              <div key={z.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> {z.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t('adminLogistics.zoneMeta', { city: z.city, country: z.country, fee: formatUSD(z.fee_usd), eta: z.eta_days })}</p>
                </div>
                <button type="button" onClick={() => removeZone(z)} className="rounded-lg p-2 text-destructive hover:bg-secondary" aria-label={t('adminLogistics.delete')}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'pickups' && (
        <>
          <form onSubmit={addPickup} className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-3">
            <input value={drafts.pickups.name} onChange={(e) => setDrafts({ ...drafts, pickups: { ...drafts.pickups, name: e.target.value } })} placeholder={t('adminLogistics.pickupName')} required className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
            <select value={drafts.pickups.city} onChange={(e) => setDrafts({ ...drafts, pickups: { ...drafts.pickups, city: e.target.value } })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
              {getCities().map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input value={drafts.pickups.commune} onChange={(e) => setDrafts({ ...drafts, pickups: { ...drafts.pickups, commune: e.target.value } })} placeholder={t('adminLogistics.commune')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
            <input value={drafts.pickups.address} onChange={(e) => setDrafts({ ...drafts, pickups: { ...drafts.pickups, address: e.target.value } })} placeholder={t('adminLogistics.address')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm md:col-span-2" />
            <input value={drafts.pickups.phone} onChange={(e) => setDrafts({ ...drafts, pickups: { ...drafts.pickups, phone: e.target.value } })} placeholder={t('adminLogistics.phone')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
            <button type="submit" disabled={savingPickup} className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground md:col-span-3 disabled:opacity-50">
              <Plus className="h-4 w-4" /> {savingPickup ? t('adminLogistics.saving') : t('adminLogistics.addPickup')}
            </button>
          </form>
          <div className="space-y-2">
            {pickups.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold"><Store className="h-4 w-4 text-primary" /> {p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.address}, {p.commune} · {p.city} · {p.phone} · {formatUSD(p.fee_usd)}</p>
                </div>
                <button type="button" onClick={() => removePickup(p)} className="rounded-lg p-2 text-destructive hover:bg-secondary" aria-label={t('adminLogistics.delete')}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}