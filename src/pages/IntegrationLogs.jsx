import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import StatCard from '@/components/ops/StatCard';
import { ADMIN_LINKS } from '@/lib/navLinks';

const FILTERS = [['all', 'Tous'], ['success', 'Réussis'], ['failed', 'Échecs']];

export default function IntegrationLogs() {
  const [logs, setLogs] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => { base44.entities.InventorySyncLog.list('-created_date', 200).then(setLogs); }, []);

  const shown = (logs || []).filter((l) => filter === 'all' || l.status === filter);
  const failed = (logs || []).filter((l) => l.status === 'failed').length;
  const updated = (logs || []).reduce((s, l) => s + (l.updated || 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
      <DashboardNav title="Journaux d'intégration" links={ADMIN_LINKS} />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Synchronisations" value={logs?.length ?? '–'} />
        <StatCard label="Échecs" value={failed} tone={failed ? 'bad' : 'good'} />
        <StatCard label="Stocks mis à jour" value={updated} />
      </div>
      <div className="flex gap-2">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>{l}</button>
        ))}
      </div>
      {!logs ? <div className="h-40 animate-pulse rounded-2xl bg-secondary" /> : shown.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune synchronisation enregistrée pour l'instant.</p>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {shown.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${l.status === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}`}>{l.status === 'success' ? 'Réussie' : 'Échec'}</span>
              <span className="font-bold">{l.source_name}</span>
              <span className="text-muted-foreground">{new Date(l.created_date).toLocaleString('fr-FR')}</span>
              <span className="text-muted-foreground">{l.trigger === 'manual' ? 'Manuelle' : 'Automatique'}</span>
              {l.status === 'success'
                ? <span>{l.rows} lignes · {l.updated} mis à jour · {l.unmatched_count} introuvables</span>
                : <span className="text-destructive">{l.error}</span>}
              <span className="ml-auto text-muted-foreground">{l.duration_ms} ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}