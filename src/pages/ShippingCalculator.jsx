import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, MapPin, Wallet, Clock, Package, Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import { getProfile } from '@/lib/session';
import { listCouriers } from '@/lib/logistics';
import { formatUSD, round2 } from '@/lib/format';

export default function ShippingCalculator() {
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
      setError('Indiquez le poids du colis en kilos.');
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
      title="Calculateur de livraison"
      subtitle="Estimez les frais de livraison selon votre ville, votre commune et le poids du colis. Le montant final est confirmé au paiement."
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
              placeholder="Commune / quartier"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Poids (kg)"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button type="submit" className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground">
            Calculer les frais
          </button>
        </form>
      </section>

      {loading && <div className="h-24 animate-pulse rounded-2xl bg-secondary" />}

      {result && !loading && (
        <>
          <InfoSection title={`Estimation pour ${city}${commune ? ` — ${commune}` : ''} · ${result.kg} kg`}>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Livraison à domicile
                </p>
                <p className="mt-1.5 text-lg font-bold text-primary">{formatUSD(result.homeTotal)}</p>
                <p className="mt-1 text-[11px]">
                  Frais de zone {formatUSD(result.zoneFee)}
                  {result.carrier ? ` + ${result.carrier.name} ${formatUSD(result.carrier.quote.fee)}` : ' — aucun transporteur ne dessert encore cette ville'}
                </p>
                <p className="mt-1 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Délai estimé : {result.zone?.eta_days || '2-4'} jours
                </p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Store className="h-3.5 w-3.5 text-primary" /> Retrait en point relais
                </p>
                <p className="mt-1.5 text-lg font-bold text-primary">{result.pickup ? formatUSD(result.pickup.fee_usd || 0) : 'Indisponible'}</p>
                <p className="mt-1 text-[11px]">
                  {result.pickup
                    ? `${result.pickup.name} · ${[result.pickup.commune, result.pickup.address].filter(Boolean).join(' · ')}`
                    : `Aucun point de retrait publié à ${city} pour le moment.`}
                </p>
                {result.pickup && (
                  <Link to="/pickup-points" className="mt-1 inline-block text-[11px] font-semibold text-primary">
                    Voir tous les points de retrait
                  </Link>
                )}
              </div>
            </div>
          </InfoSection>

          <InfoSection title="Options transporteurs disponibles">
            {result.couriers.length ? (
              <div className="space-y-2">
                {result.couriers.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {c.name} {i === 0 && <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Moins cher</span>}
                      </p>
                      <p className="text-[11px]">Délai {c.quote.eta}</p>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      <Wallet className="h-3.5 w-3.5" /> {formatUSD(c.quote.fee)}
                    </span>
                  </div>
                ))}
                <p className="flex items-start gap-1.5 pt-1 text-[11px]">
                  <Package className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Les articles importés de fournisseurs internationaux sont expédiés sous 12 à 25 jours, frais déjà compris
                  dans le prix affiché.
                </p>
              </div>
            ) : (
              <p>Aucun transporteur ne dessert {city} pour l'instant. Écrivez au support pour connaître les villes desservies.</p>
            )}
          </InfoSection>
        </>
      )}

      <InfoSection title="Comment sont calculés les frais">
        <p>
          L'estimation additionne le tarif de la zone de livraison et le tarif du transporteur partenaire (prise en charge
          plus coût au kilo). Les frais sont recalculés côté serveur au moment du paiement : le montant affiché ici reste
          indicatif, hors promotions éventuelles.
        </p>
      </InfoSection>
    </InfoPage>
  );
}