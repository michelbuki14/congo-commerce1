import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Truck, MapPin, Wallet, Clock, Package, Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import { getProfile } from '@/lib/session';
import { listCouriers } from '@/lib/logistics';
import { formatUSD, round2 } from '@/lib/format';

export default function ShippingCalculator() {
  const { t } = useTranslation();
  const profile = getProfile();
  const [zones, setZones] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState(profile.city || 'Kinshasa');
  const [commune, setCommune] = useState('');
  const [weight, setWeight] = useState('1');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [z, p] = await Promise.all([
        base44.entities.DeliveryZone.filter({ active: true }, 'city', 60).catch(() => []),
        base44.entities.PickupPoint.filter({ active: true }, 'city', 60).catch(() => []),
      ]);
      setZones(z);
      setPoints(p);
      setLoading(false);
    })();
  }, []);

  const cities = [...new Set([...zones.map((z) => z.city), ...points.map((p) => p.city), 'Kinshasa', 'Lubumbashi', 'Goma'])].filter(Boolean).sort();

  const calculate = (e) => {
    e.preventDefault();
    setError('');
    const kg = Math.max(Number(weight) || 0, 0);
    if (!kg) {
      setError(t('shippingCalculator.weightRequired'));
      return;
    }
    const zone = zones.find((z) => z.city === city) || null;
    const couriers = listCouriers()
      .map((c) => ({ name: c.name, quote: c.calculateRate({ weightKg: kg, city }) }))
      .filter((o) => o.quote.available)
      .sort((a, b) => a.quote.fee - b.quote.fee);
    const pickup = points.filter((p) => p.city === city).sort((a, b) => (a.fee_usd || 0) - (b.fee_usd || 0))[0] || null;
    const zoneFee = zone?.fee_usd || 0;
    const carrier = couriers[0] || null;
    setResult({
      kg,
      zone,
      couriers,
      pickup,
      zoneFee,
      carrier,
      homeTotal: round2(zoneFee + (carrier?.quote.fee || 0)),
    });
  };

  return (
    <InfoPage
      icon={Truck}
      title={t('shippingCalculator.title')}
      subtitle={t('shippingCalculator.subtitle')}
    >
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <form onSubmit={calculate} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              value={commune}
              onChange={(e) => setCommune(e.target.value)}
              placeholder={t('shippingCalculator.communePh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={t('shippingCalculator.weightPh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button type="submit" className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground">
            {t('shippingCalculator.calculate')}
          </button>
        </form>
      </section>

      {loading && <div className="h-24 animate-pulse rounded-2xl bg-secondary" />}

      {result && !loading && (
        <>
          <InfoSection title={t('shippingCalculator.estimateTitle', { city, communeSep: commune ? ` — ${commune}` : '', kg: result.kg })}>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> {t('shippingCalculator.homeDelivery')}
                </p>
                <p className="mt-1.5 text-lg font-bold text-primary">{formatUSD(result.homeTotal)}</p>
                <p className="mt-1 text-[11px]">
                  {t('shippingCalculator.zoneFeePart', { fee: formatUSD(result.zoneFee) })}
                  {result.carrier ? t('shippingCalculator.carrierPart', { name: result.carrier.name, fee: formatUSD(result.carrier.quote.fee) }) : t('shippingCalculator.noCarrier')}
                </p>
                <p className="mt-1 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {t('shippingCalculator.etaLine', { eta: result.zone?.eta_days || '2-4' })}
                </p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Store className="h-3.5 w-3.5 text-primary" /> {t('shippingCalculator.pickupTitle')}
                </p>
                <p className="mt-1.5 text-lg font-bold text-primary">{result.pickup ? formatUSD(result.pickup.fee_usd || 0) : t('shippingCalculator.unavailable')}</p>
                <p className="mt-1 text-[11px]">
                  {result.pickup
                    ? `${result.pickup.name} · ${[result.pickup.commune, result.pickup.address].filter(Boolean).join(' · ')}`
                    : t('shippingCalculator.noPickupInCity', { city })}
                </p>
                {result.pickup && (
                  <Link to="/pickup-points" className="mt-1 inline-block text-[11px] font-semibold text-primary">
                    {t('shippingCalculator.allPickupPoints')}
                  </Link>
                )}
              </div>
            </div>
          </InfoSection>

          <InfoSection title={t('shippingCalculator.carrierOptions')}>
            {result.couriers.length ? (
              <div className="space-y-2">
                {result.couriers.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {c.name} {i === 0 && <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{t('shippingCalculator.cheapest')}</span>}
                      </p>
                      <p className="text-[11px]">{t('shippingCalculator.carrierEta', { eta: c.quote.eta })}</p>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      <Wallet className="h-3.5 w-3.5" /> {formatUSD(c.quote.fee)}
                    </span>
                  </div>
                ))}
                <p className="flex items-start gap-1.5 pt-1 text-[11px]">
                  <Package className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t('shippingCalculator.importNote')}
                </p>
              </div>
            ) : (
              <p>{t('shippingCalculator.noCarrierInCity', { city })}</p>
            )}
          </InfoSection>
        </>
      )}

      <InfoSection title={t('shippingCalculator.howTitle')}>
        <p>
          {t('shippingCalculator.howText')}
        </p>
      </InfoSection>
    </InfoPage>
  );
}
