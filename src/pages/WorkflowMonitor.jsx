import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { ADMIN_LINKS } from '@/lib/navLinks';

const LIVE = ['RUNNING', 'RETRYING', 'WAITING'];
const REFRESH_MS = 15000;

const STEP_TONE = {
  COMPLETED: 'bg-emerald-100 text-emerald-900',
  RUNNING: 'bg-sky-100 text-sky-900',
  FAILED: 'bg-red-100 text-red-900',
  SKIPPED: 'bg-secondary text-muted-foreground',
  COMPENSATED: 'bg-amber-100 text-amber-900',
  PENDING: 'bg-secondary text-muted-foreground',
};

const ms = (value) => (Number(value) > 0 ? `${(Number(value) / 1000).toFixed(1)} s` : '—');

export default function WorkflowMonitor() {
  const [executions, setExecutions] = useState([]);
  const [failedSteps, setFailedSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState('');
  const [steps, setSteps] = useState([]);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const [runs, failed] = await Promise.all([
      base44.entities.WorkflowExecution.list('-created_date', 60).catch(() => []),
      base44.entities.WorkflowStep.filter({ status: 'FAILED' }, '-created_date', 100).catch(() => []),
    ]);
    setExecutions(runs);
    setFailedSteps(failed);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const open = async (execution) => {
    if (openId === execution.id) {
      setOpenId('');
      return;
    }
    setOpenId(execution.id);
    setSteps([]);
    const rows = await base44.entities.WorkflowStep
      .filter({ execution_id: execution.id }, 'step_index', 50)
      .catch(() => []);
    setSteps(rows);
  };

  const act = async (action, execution) => {
    setBusy(execution.id);
    setNotice('');
    try {
      const res = await base44.functions.invoke('runWorkflow', {
        action,
        execution_id: execution.id,
        reason: action === 'cancel' ? 'Arrêt manuel depuis la supervision' : undefined,
      });
      setNotice(`${action === 'retry' ? 'Relance' : 'Arrêt'} de ${execution.execution_number || execution.id} : ${res?.data?.status || 'envoyé'}.`);
      await load();
    } catch (e) {
      setNotice(e?.message || "L'opération a échoué.");
    } finally {
      setBusy('');
    }
  };

  const live = executions.filter((e) => LIVE.includes(String(e.status || '').toUpperCase()));
  const failed = executions.filter((e) => String(e.status || '').toUpperCase() === 'FAILED');
  const dead = executions.filter((e) => e.dead_letter);
  const pendingCompensation = failedSteps.filter((s) => !s.compensated);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Supervision des workflows" links={ADMIN_LINKS} />

      <OpsHeader title="Supervision des workflows" subtitle="Exécutions en cours, progression étape par étape et compensations à traiter. Rafraîchissement automatique toutes les 15 secondes.">
        <button type="button" onClick={load} className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold">
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </button>
      </OpsHeader>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="En cours" value={live.length} hint="en exécution ou en attente" tone={live.length ? 'good' : 'default'} />
        <StatCard label="Échecs récents" value={failed.length} hint="à relancer" tone={failed.length ? 'warn' : 'default'} />
        <StatCard label="Lettres mortes" value={dead.length} hint="abandonnées après tentatives" tone={dead.length ? 'bad' : 'default'} />
        <StatCard label="Compensations à traiter" value={pendingCompensation.length} hint="étapes échouées non annulées" tone={pendingCompensation.length ? 'warn' : 'default'} />
      </div>

      {notice ? <p className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs">{notice}</p> : null}

      {pendingCompensation.length ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4" /> Compensations en attente
          </h2>
          <div className="mt-2.5 space-y-1.5">
            {pendingCompensation.slice(0, 8).map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
                <span className="font-semibold">{s.workflow_code} · {s.label || s.name}</span>
                <span className="truncate text-[11px]">{s.error || 'échec sans message'} · {s.attempts}/{s.max_attempts} tentative(s)</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-amber-800">
            Ces étapes ont échoué : l'annulation correspondante (remboursement, libération de stock) doit être confirmée manuellement.
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold">Exécutions récentes</h2>
        </header>
        <div className="divide-y divide-border">
          {executions.length ? executions.map((e) => (
            <div key={e.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <button type="button" onClick={() => open(e)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold">
                    {e.workflow_name || e.workflow_code}
                    <span className="ml-2 font-normal text-muted-foreground">{e.execution_number || ''}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.current_step ? `étape : ${e.current_step} · ` : ''}
                    {e.completed_steps || 0}/{e.total_steps || 0} étapes · {ms(e.duration_ms)} · {e.trigger || 'manual'}
                    {e.trigger_reference ? ` · ${e.trigger_reference}` : ''}
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  {e.dead_letter ? <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-900">abandonnée</span> : null}
                  <StatusBadge status={e.status} />
                  {failed.includes(e) || e.dead_letter ? (
                    <button
                      type="button"
                      disabled={busy === e.id}
                      onClick={() => act('retry', e)}
                      className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                    >
                      {busy === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />} Relancer
                    </button>
                  ) : null}
                  {LIVE.includes(String(e.status || '').toUpperCase()) ? (
                    <button
                      type="button"
                      disabled={busy === e.id}
                      onClick={() => act('cancel', e)}
                      className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-destructive disabled:opacity-50"
                    >
                      <XCircle className="h-3 w-3" /> Arrêter
                    </button>
                  ) : null}
                </div>
              </div>

              {openId === e.id ? (
                <div className="space-y-1.5 bg-secondary/40 px-4 py-3">
                  {steps.length ? steps.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">{String(s.step_index ?? 0).padStart(2, '0')}</span>
                        <span className="font-semibold">{s.label || s.name}</span>
                        {s.critical === false ? <span className="text-[10px] text-muted-foreground">non bloquante</span> : null}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">{ms(s.duration_ms)} · {s.attempts || 0}/{s.max_attempts || 3}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STEP_TONE[s.status] || STEP_TONE.PENDING}`}>{s.status}</span>
                      </span>
                    </div>
                  )) : (
                    <p className="text-[11px] text-muted-foreground">Chargement des étapes…</p>
                  )}
                  {e.error ? <p className="pt-1 text-[11px] text-destructive">{e.error}</p> : null}
                </div>
              ) : null}
            </div>
          )) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucune exécution enregistrée.</p>
          )}
        </div>
      </section>
    </div>
  );
}