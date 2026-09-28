import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Layers, Ruler, Truck } from 'lucide-react';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import StatCard from '@/components/ops/StatCard';
import RateForm from '@/components/shipping/RateForm';
import RateTable from '@/components/shipping/RateTable';
import QuoteSimulator from '@/components/shipping/QuoteSimulator';
import { DEFAULT_SHIPPING_CONFIG, averageRate, loadShippingConfig } from '@/lib/shippingRates';
import { getCities, loadPlatformConfig } from '@/lib/config';
import { formatUSD } from '@/lib/format';
import { useTranslation } from 'react-i18next';

export default function LogisticsRates() {
  const { t } = useTranslation();
  const [rates, setRates] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [config, setConfig] = useState(DEFAULT_SHIPPING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadPlatformConfig();
    (async () => {
      const [rows, carrierRows, cfg] = await Promise.all([
        base44.entities.ShippingRate.list('-priority', 200).catch(() => []),
        base44.entities.Courier.list('name', 50).catch(() => []),
        loadShippingConfig(),
      ]);
      setRates(rows);
      setCouriers(carrierRows);
      setConfig(cfg);
      setLoading(false);
    })();
  }, []);

  const destinations = useMemo(
    () => [...new Set([...getCities(), ...rates.map((r) => r.destination)])].filter(Boolean).sort(),
    [rates],
  );

  const createRate = async (rate) => {
    setBusy(true);
    try {
      const created = await base44.entities.ShippingRate.create(rate);
      setRates((prev) => [created, ...prev]);
    } finally {
      setBusy(false);
    }
  };

  const patchRate = async (rate, field, value) => {
    const payload = field === 'eta_days' ? { [field]: value } : { [field]: Number(value) || 0 };
    const updated = await base44.entities.ShippingRate.update(rate.id, payload);
    setRates((prev) => prev.map((r) => (r.id === rate.id ? updated : r)));
  };

  const toggleRate = async (rate) => {
    const updated = await base44.entities.ShippingRate.update(rate.id, { active: rate.active === false });
    setRates((prev) => prev.map((r) => (r.id === rate.id ? updated : r)));
  };

  const deleteRate = async (rate) => {
    await base44.entities.ShippingRate.delete(rate.id);
    setRates((prev) => prev.filter((r) => r.id !== rate.id));
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  const active = rates.filter((r) => r.active !== false);
  const avg1kg = averageRate(active, 1);
  const coveredDestinations = new Set(active.map((r) => r.destination)).size;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('logisticsRates.title')} links={ADMIN_LINKS} />

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
        <Layers className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {t('logisticsRates.gridNote')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label={t('logisticsRates.active')} value={active.length} hint={t('logisticsRates.inactive', { count: rates.length - active.length })} />
        <StatCard label={t('logisticsRates.destinations')} value={coveredDestinations} hint={t('logisticsRates.destHint')} />
        <StatCard label={t('logisticsRates.carriers')} value={couriers.length} hint={t('logisticsRates.carrierHint')} />
        <StatCard label={t('logisticsRates.avg1kg')} value={avg1kg != null ? formatUSD(avg1kg) : '—'} hint={t('logisticsRates.avgHint')} />
      </div>

      <RateForm couriers={couriers} destinations={destinations} onSubmit={createRate} busy={busy} />

      <RateTable rates={rates} onPatch={patchRate} onToggle={toggleRate} onDelete={deleteRate} />

      <QuoteSimulator rates={active} config={config} couriers={couriers} destinations={destinations} />

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Ruler className="h-3.5 w-3.5" /> {t('logisticsRates.volumetric', { divisor: config.volumetric_divisor })}
        <Truck className="ml-1 h-3.5 w-3.5" />
      </p>
    </div>
  );
}