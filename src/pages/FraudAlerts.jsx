import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import StatCard from '@/components/ops/StatCard';
import { ADMIN_LINKS } from '@/lib/navLinks';
import FraudAlertCard from '@/components/fraud/FraudAlertCard';

const TABS = [['queue', 'À examiner'], ['high', 'Risque élevé'], ['done', 'Traités']];

export default function FraudAlerts() {
  const [events, setEvents] = useState(null);
  const [tab, setTab] = useState('queue');
  const load = () => base44.entities.FraudEvent.list('-risk_score', 300).then(setEvents);
  useEffect(() => { load(); }, []);

  const decide = async (e, status, notes) => {
    const me = await base44.auth.me();
    await base44.entities.FraudEvent.update(e.id, { status, notes, reviewed_by: me.email, reviewed_at: new Date().toISOString() });
    await base44.entities.AuditLog.create({ action: `fraud_${status}`, entity: 'FraudEvent', entity_id: e.id, actor: me.email, reference: e.order_number || '', severity: status === 'cleared' ? 'info' : 'warning', details: { notes } });
    load();
  };

  const all = events || [];
  const isOpen = (e) => ['open', 'reviewing'].includes(e.status);
  const shown = all.filter((e) => tab === 'queue' ? isOpen(e) : tab === 'high' ? isOpen(e) && ['high', 'critical'].includes(e.risk_level) : !isOpen(e));

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-5">
      <DashboardNav title="Alertes de fraude" links={ADMIN_LINKS} />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="À examiner" value={all.filter(isOpen).length} tone="warning" />
        <StatCard label="Risque élevé" value={all.filter((e) => isOpen(e) && ['high', 'critical'].includes(e.risk_level)).length} tone="bad" />
        <StatCard label="Montant en jeu" value={`${all.filter(isOpen).reduce((s, e) => s + (e.amount_usd || 0), 0).toFixed(0)} $`} />
      </div>
      <div className="flex gap-2">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${tab === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>{l}</button>
        ))}
      </div>
      {!events ? <div className="h-40 animate-pulse rounded-2xl bg-secondary" /> : shown.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune alerte dans cette vue.</p>
      ) : (
        <div className="space-y-3">{shown.map((e) => <FraudAlertCard key={e.id} event={e} onDecide={(s, n) => decide(e, s, n)} />)}</div>
      )}
    </div>
  );
}