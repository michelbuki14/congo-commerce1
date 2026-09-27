import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, MapPin, Clock, Wallet } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import { formatUSD } from '@/lib/format';

export default function ShippingInfo() {
  const [zones, setZones] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const cities = [...new Set(points.map((p) => p.city))];

  return (
    <InfoPage
      icon={Truck}
      title="Livraison, zones et points de retrait"
      subtitle="Villes desservies, frais, délais estimés et adresses des points de retrait partenaires."
    >
      <InfoSection title="Zones de livraison actives">
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-secondary" />
        ) : zones.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {zones.map((z) => (
              <div key={z.id} className="rounded-xl border border-border p-3">
                <p className="text-xs font-semibold text-foreground">{z.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5" /> {formatUSD(z.fee_usd || 0)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {z.eta_days || '2-4'} jours
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {z.city} · {z.country || 'CD'}
                  </span>
                </p>
                {z.supports_pickup && <p className="mt-1">Retrait en point relais disponible dans cette zone.</p>}
              </div>
            ))}
          </div>
        ) : (
          <p>Aucune zone publiée pour le moment. Écrivez au support pour connaître les villes desservies.</p>
        )}
      </InfoSection>

      <InfoSection title="Points de retrait">
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-secondary" />
        ) : points.length ? (
          <div className="space-y-3">
            {cities.map((city) => (
              <div key={city}>
                <p className="text-xs font-bold text-foreground">{city}</p>
                <div className="mt-1.5 grid gap-2 md:grid-cols-2">
                  {points
                    .filter((p) => p.city === city)
                    .map((p) => (
                      <div key={p.id} className="rounded-xl border border-border p-3">
                        <p className="text-xs font-semibold text-foreground">{p.name}</p>
                        <p className="mt-1">
                          {[p.commune, p.address].filter(Boolean).join(' · ') || 'Adresse communiquée après commande'}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> {p.hours || '08:00 - 18:00'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Wallet className="h-3.5 w-3.5" /> {formatUSD(p.fee_usd || 0)}
                          </span>
                          {p.phone && <span>{p.phone}</span>}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Aucun point de retrait publié pour le moment.</p>
        )}
      </InfoSection>

      <InfoSection title="Articles importés">
        <p>
          Les produits provenant de fournisseurs internationaux arrivent sous 12 à 25 jours. Les frais d’importation et
          le transport international sont déjà compris dans le prix affiché, et le colis reste suivi jusqu’à la remise.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/track" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            Suivre ma commande
          </Link>
          <Link to="/faq" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            Questions sur la livraison
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}