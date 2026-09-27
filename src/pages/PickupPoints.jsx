import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Phone, Wallet, Navigation, Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import { formatUSD } from '@/lib/format';

function mapUrl(point) {
  const query = [point.name, point.commune, point.address, point.city, 'RDC'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function PickupPoints() {
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
      title="Points de retrait en RDC"
      subtitle="Retirez votre colis dans un point relais partenaire : adresse, horaires et contact de chaque point, avec itinéraire vers la carte."
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
              Toutes les villes ({points.length})
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
            <InfoSection key={c} title={`${c} — ${visible.filter((p) => p.city === c).length} point(s) de retrait`}>
              <div className="grid gap-2 md:grid-cols-2">
                {visible
                  .filter((p) => p.city === c)
                  .map((p) => (
                    <div key={p.id} className="rounded-xl border border-border p-3">
                      <p className="text-xs font-semibold text-foreground">{p.name}</p>
                      <p className="mt-1 flex items-start gap-1.5">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{[p.commune, p.address].filter(Boolean).join(' · ') || 'Adresse communiquée après commande'}</span>
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
                        <Navigation className="h-3.5 w-3.5" /> Ouvrir l'itinéraire
                      </a>
                    </div>
                  ))}
              </div>
            </InfoSection>
          ))}

          <InfoSection title="Comment retirer un colis">
            <ul className="space-y-1.5">
              <li>• Choisissez « retrait en point relais » à la commande et réglez les frais du point.</li>
              <li>• Vous recevez un code de retrait à présenter sur place, avec le numéro de commande.</li>
              <li>• Le colis est gardé 7 jours au point relais avant retour au vendeur.</li>
              <li>• Présentez une pièce d'identité ou le téléphone utilisé à la commande.</li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link to="/shipping-calculator" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                Calculer mes frais
              </Link>
              <Link to="/order-tracking" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
                Suivre ma livraison
              </Link>
            </div>
          </InfoSection>
        </>
      ) : (
        <InfoSection title="Points de retrait">
          <p>Aucun point de retrait n'est publié pour le moment. Écrivez au support pour connaître les adresses disponibles.</p>
        </InfoSection>
      )}
    </InfoPage>
  );
}