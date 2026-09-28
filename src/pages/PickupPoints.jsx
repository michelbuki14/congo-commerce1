import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, Phone, Wallet, Navigation, Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import { formatUSD } from '@/lib/format';

function mapUrl(point) {
  const query = [point.name, point.commune, point.address, point.city, 'RDC'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function PickupPoints() {
  const { t } = useTranslation();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('all');

  useEffect(() => {
    (async () => {
      const rows = await base44.entities.PickupPoint.filter({ active: true }, 'city', 100).catch(() => []);
      setPoints(rows);
      setLoading(false);
    })();
  }, []);

  const cities = [...new Set(points.map((p) => p.city))].filter(Boolean).sort();
  const visible = city === 'all' ? points : points.filter((p) => p.city === city);
  const grouped = [...new Set(visible.map((p) => p.city))].sort();

  return (
    <InfoPage
      icon={Store}
      title={t('pickupPoints.title')}
      subtitle={t('pickupPoints.subtitle')}
    >
      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
      ) : points.length ? (
        <>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setCity('all')}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                city === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
              }`}
            >
              {t('pickupPoints.allCities', { count: points.length })}
            </button>
            {cities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCity(c)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                  city === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
                }`}
              >
                {c} ({points.filter((p) => p.city === c).length})
              </button>
            ))}
          </div>

          {grouped.map((c) => (
            <InfoSection key={c} title={t('pickupPoints.citySection', { city: c, count: visible.filter((p) => p.city === c).length })}>
              <div className="grid gap-2 md:grid-cols-2">
                {visible
                  .filter((p) => p.city === c)
                  .map((p) => (
                    <div key={p.id} className="rounded-xl border border-border p-3">
                      <p className="text-xs font-semibold text-foreground">{p.name}</p>
                      <p className="mt-1 flex items-start gap-1.5">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{[p.commune, p.address].filter(Boolean).join(' · ') || t('pickupPoints.addressAfterOrder')}</span>
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {p.hours || '08:00 - 18:00'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Wallet className="h-3.5 w-3.5" /> {formatUSD(p.fee_usd || 0)}
                        </span>
                        {p.phone && (
                          <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 font-semibold text-primary">
                            <Phone className="h-3.5 w-3.5" /> {p.phone}
                          </a>
                        )}
                      </p>
                      <a
                        href={mapUrl(p)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-foreground"
                      >
                        <Navigation className="h-3.5 w-3.5" /> {t('pickupPoints.openRoute')}
                      </a>
                    </div>
                  ))}
              </div>
            </InfoSection>
          ))}

          <InfoSection title={t('pickupPoints.howTitle')}>
            <ul className="space-y-1.5">
              <li>{t('pickupPoints.how1')}</li>
              <li>{t('pickupPoints.how2')}</li>
              <li>{t('pickupPoints.how3')}</li>
              <li>{t('pickupPoints.how4')}</li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link to="/shipping-calculator" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                {t('pickupPoints.calcFees')}
              </Link>
              <Link to="/order-tracking" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
                {t('pickupPoints.trackDelivery')}
              </Link>
            </div>
          </InfoSection>
        </>
      ) : (
        <InfoSection title={t('pickupPoints.pointsSection')}>
          <p>{t('pickupPoints.noPoints')}</p>
        </InfoSection>
      )}
    </InfoPage>
  );
}
