import React, { useCallback, useEffect, useState } from 'react';
import { Activity, CreditCard, RefreshCw, Server, Truck, TriangleAlert } from 'lucide-react';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import HealthSection from '@/components/health/HealthSection';
import ServiceStatusRow from '@/components/health/ServiceStatusRow';
import IncidentList from '@/components/health/IncidentList';
import { HEALTH_LABELS, loadPlatformHealth } from '@/lib/platformHealth';
import { formatUSD, formatDateTime } from '@/lib/format';
import { useTranslation } from 'react-i18next';

const BANNER = {
  ok: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  degraded: 'border-amber-300 bg-amber-50 text-amber-900',
  down: 'border-red-300 bg-red-50 text-red-900',
  unknown: 'border-border bg-secondary text-foreground',
};

export default function PlatformHealth() {
  const { t } = useTranslation();
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
        title={t('platformHealth.title')}
        subtitle={t('platformHealth.subtitle')}
      >
        <button
          type="button"
          disabled={refreshing}
          onClick={() => load(true)}
          className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> {t('platformHealth.refresh')}
        </button>
      </OpsHeader>

      <div className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 text-xs ${BANNER[overall] || BANNER.unknown}`}>
        <Activity className="h-4 w-4 shrink-0" />
        <span className="font-semibold">{t('platformHealth.overall', { status: HEALTH_LABELS[overall] })}</span>
        <span className="opacity-80">
          {t('platformHealth.componentsLine', { total: all.length, degraded, down })}
        </span>
        <span className="opacity-80">{t('platformHealth.lastAnalysis', { when: formatDateTime(loadedAt) })}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label={t('platformHealth.components')} value={all.length} hint={t('platformHealth.componentsHint')} />
        <StatCard label={t('platformHealth.degraded')} value={degraded} hint={t('platformHealth.degradedHint')} tone={degraded ? 'warn' : 'good'} />
        <StatCard label={t('platformHealth.down')} value={down} hint={t('platformHealth.downHint')} tone={down ? 'bad' : 'good'} />
        <StatCard label={t('platformHealth.volume')} value={formatUSD(volume)} hint={t('platformHealth.gatewayCount', { count: gateways.length })} />
      </div>

      <HealthSection icon={CreditCard} title={t('platformHealth.gateways')} subtitle={t('platformHealth.gatewaysSub')}>
        {gateways.length ? gateways.map((g) => (
          <ServiceStatusRow
            key={g.name}
            name={g.name}
            detail={g.detail}
            meta={g.lastSuccess ? t('platformHealth.lastConfirmed', { when: formatDateTime(g.lastSuccess) }) : t('platformHealth.noConfirmed')}
            status={g.status}
            right={<span className="text-xs font-semibold">{Math.round(g.rate * 100)} %</span>}
          />
        )) : (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t('platformHealth.noPayments')}</p>
        )}
      </HealthSection>

      <HealthSection icon={Truck} title={t('platformHealth.partners')} subtitle={t('platformHealth.partnersSub')}>
        {partners.length ? partners.map((p) => (
          <ServiceStatusRow
            key={p.name}
            name={p.name}
            detail={p.detail}
            meta={p.meta || (p.areas?.length ? t('platformHealth.zones', { zones: p.areas.join(', ') }) : '')}
            status={p.status}
            right={p.total ? <span className="text-xs font-semibold">{t('platformHealth.accepted', { pct: Math.round((1 - p.declineRate) * 100) })}</span> : null}
          />
        )) : (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t('platformHealth.noPartners')}</p>
        )}
      </HealthSection>

      <HealthSection icon={Server} title={t('platformHealth.services')} subtitle={t('platformHealth.servicesSub')}>
        {services.map((s) => (
          <ServiceStatusRow key={s.name} name={s.name} detail={s.detail} meta={s.meta} status={s.status} />
        ))}
      </HealthSection>

      <HealthSection icon={TriangleAlert} title={t('platformHealth.incidents')} subtitle={t('platformHealth.incidentsSub')}>
        <IncidentList incidents={incidents} />
      </HealthSection>
    </div>
  );
}