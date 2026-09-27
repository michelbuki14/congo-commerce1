import React, { useCallback, useEffect, useState } from 'react';
import { Activity, CreditCard, RefreshCw, Server, Truck, TriangleAlert } from 'lucide-react';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import HealthSection from '@/components/health/HealthSection';
import ServiceStatusRow from '@/components/health/ServiceStatusRow';
import IncidentList from '@/components/health/IncidentList';
import { HEALTH_LABELS, loadPlatformHealth } from '@/lib/platformHealth';
import { formatUSD, formatDateTime } from '@/lib/format';

const BANNER = {
  ok: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  degraded: 'border-amber-300 bg-amber-50 text-amber-900',
  down: 'border-red-300 bg-red-50 text-red-900',
  unknown: 'border-border bg-secondary text-foreground',
};

export default function PlatformHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    const next = await loadPlatformHealth();
    setHealth(next);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  if (loading || !health) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  const { overall, gateways, partners, services, incidents, loadedAt } = health;
  const all = [...gateways, ...partners, ...services];
  const degraded = all.filter((r) => r.status === 'degraded').length;
  const down = all.filter((r) => r.status === 'down').length;
  const volume = gateways.reduce((sum, g) => sum + g.volume, 0);

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title="Santé de la plateforme"
        subtitle="État opérationnel des partenaires logistiques, des passerelles de paiement et des services cœur, calculé à partir des données réelles des sept derniers jours."
      >
        <button
          type="button"
          disabled={refreshing}
          onClick={() => load(true)}
          className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </OpsHeader>

      <div className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 text-xs ${BANNER[overall] || BANNER.unknown}`}>
        <Activity className="h-4 w-4 shrink-0" />
        <span className="font-semibold">État global : {HEALTH_LABELS[overall]}</span>
        <span className="opacity-80">
          {all.length} composant(s) surveillé(s) · {degraded} dégradé(s) · {down} perturbé(s)
        </span>
        <span className="opacity-80">Dernière analyse : {formatDateTime(loadedAt)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Composants" value={all.length} hint="surveillés en continu" />
        <StatCard label="Dégradés" value={degraded} hint="performance en baisse" tone={degraded ? 'warn' : 'good'} />
        <StatCard label="Perturbés" value={down} hint="action requise" tone={down ? 'bad' : 'good'} />
        <StatCard label="Volume paiements (7 j)" value={formatUSD(volume)} hint={`${gateways.length} passerelle(s)`} />
      </div>

      <HealthSection icon={CreditCard} title="Passerelles de paiement" subtitle="Taux de confirmation réel par moyen de paiement.">
        {gateways.length ? gateways.map((g) => (
          <ServiceStatusRow
            key={g.name}
            name={g.name}
            detail={g.detail}
            meta={g.lastSuccess ? `Dernier paiement confirmé : ${formatDateTime(g.lastSuccess)}` : 'Aucun paiement confirmé sur la période'}
            status={g.status}
            right={<span className="text-xs font-semibold">{Math.round(g.rate * 100)} %</span>}
          />
        )) : (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucun paiement enregistré sur les sept derniers jours.</p>
        )}
      </HealthSection>

      <HealthSection icon={Truck} title="Partenaires logistiques" subtitle="Acceptation des courses et délais d'acheminement.">
        {partners.length ? partners.map((p) => (
          <ServiceStatusRow
            key={p.name}
            name={p.name}
            detail={p.detail}
            meta={p.meta || (p.areas?.length ? `Zones : ${p.areas.join(', ')}` : '')}
            status={p.status}
            right={p.total ? <span className="text-xs font-semibold">{Math.round((1 - p.declineRate) * 100)} % acceptées</span> : null}
          />
        )) : (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucun partenaire logistique configuré.</p>
        )}
      </HealthSection>

      <HealthSection icon={Server} title="Services cœur" subtitle="Orchestration, événements et disponibilité de l'offre.">
        {services.map((s) => (
          <ServiceStatusRow key={s.name} name={s.name} detail={s.detail} meta={s.meta} status={s.status} />
        ))}
      </HealthSection>

      <HealthSection icon={TriangleAlert} title="Incidents récents" subtitle="Événements et workflows en échec, du plus récent au plus ancien.">
        <IncidentList incidents={incidents} />
      </HealthSection>
    </div>
  );
}