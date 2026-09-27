import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, Loader2, PauseCircle, Workflow } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import WorkflowDefinitionCard from '@/components/admin/WorkflowDefinitionCard';
import WorkflowExecutionCard from '@/components/admin/WorkflowExecutionCard';
import { ADMIN_LINKS } from '@/lib/navLinks';

const STUCK_AFTER_MS = 15 * 60 * 1000;

const TABS = [
  { id: 'all', label: 'Tout' },
  { id: 'RUNNING', label: 'En cours' },
  { id: 'WAITING', label: 'En attente' },
  { id: 'COMPLETED', label: 'Terminés' },
  { id: 'FAILED', label: 'En échec' },
  { id: 'RETRYING', label: 'Nouvelle tentative' },
  { id: 'CANCELLED', label: 'Annulés' },
];

export default function AdminWorkflows() {
  const [definitions, setDefinitions] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [stepsByExecution, setStepsByExecution] = useState({});
  const [expanded, setExpanded] = useState('');
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const loadExecutions = useCallback(async () => {
    const rows = await base44.entities.WorkflowExecution.list('-created_date', 60).catch(() => []);
    setExecutions(rows);
    return rows;
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      base44.functions.invoke('runWorkflow', { action: 'list' }).then((res) => res?.data?.definitions || []).catch(() => []),
      loadExecutions(),
    ])
      .then(([defs]) => {
        if (!alive) return;
        setDefinitions(defs);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    const unsubscribe = base44.entities.WorkflowExecution.subscribe((event) => {
      if (event.type === 'create') setExecutions((prev) => [event.data, ...prev]);
      if (event.type === 'update') setExecutions((prev) => prev.map((e) => (e.id === event.data.id ? event.data : e)));
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [loadExecutions]);

  const toggle = async (execution) => {
    const next = expanded === execution.id ? '' : execution.id;
    setExpanded(next);
    if (!next || stepsByExecution[execution.id]) return;
    const rows = await base44.entities.WorkflowStep
      .filter({ execution_id: execution.id }, 'step_index', 50)
      .catch(() => []);
    setStepsByExecution((prev) => ({ ...prev, [execution.id]: rows }));
  };

  const operate = async (execution, action, inputPatch) => {
    setBusy(true);
    setNotice('');
    try {
      const res = await base44.functions.invoke('runWorkflow', {
        action,
        execution_id: execution.id,
        input_patch: inputPatch || {},
      });
      const data = res?.data || {};
      setNotice(
        data.error
          ? data.error
          : `${execution.execution_number} — ${data.status || action}${data.error ? ` : ${data.error}` : ''}`,
      );
      const rows = await loadExecutions();
      const refreshed = rows.find((r) => r.id === execution.id);
      if (refreshed) {
        const steps = await base44.entities.WorkflowStep
          .filter({ execution_id: execution.id }, 'step_index', 50)
          .catch(() => []);
        setStepsByExecution((prev) => ({ ...prev, [execution.id]: steps }));
      }
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => {
    const now = Date.now();
    return {
      total: executions.length,
      running: executions.filter((e) => e.status === 'RUNNING').length,
      waiting: executions.filter((e) => e.status === 'WAITING').length,
      completed: executions.filter((e) => e.status === 'COMPLETED').length,
      failed: executions.filter((e) => e.status === 'FAILED').length,
      retrying: executions.filter((e) => e.status === 'RETRYING').length,
      cancelled: executions.filter((e) => e.status === 'CANCELLED').length,
      stuck: executions.filter(
        (e) => e.status === 'RUNNING' && now - new Date(e.started_at || 0).getTime() > STUCK_AFTER_MS,
      ).length,
    };
  }, [executions]);

  const visible = tab === 'all' ? executions : executions.filter((e) => e.status === tab);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Workflows" links={ADMIN_LINKS} />

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" /> Exécutions suivies
          </p>
          <p className="mt-1 text-2xl font-black">{counts.total}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Loader2 className="h-4 w-4 text-sky-600" /> En cours
          </p>
          <p className="mt-1 text-2xl font-black">{counts.running + counts.retrying}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <PauseCircle className="h-4 w-4 text-amber-600" /> En attente d’une décision
          </p>
          <p className="mt-1 text-2xl font-black">{counts.waiting}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" /> En échec
          </p>
          <p className="mt-1 text-2xl font-black">{counts.failed}</p>
        </div>
      </section>

      <p className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {counts.completed} terminés
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {counts.stuck} bloqués (plus de 15 min)
        </span>
        <span>{counts.cancelled} annulés</span>
      </p>

      {notice && <p className="rounded-xl border border-border bg-card p-3 text-xs">{notice}</p>}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {visible.map((execution) => (
          <WorkflowExecutionCard
            key={execution.id}
            execution={execution}
            steps={stepsByExecution[execution.id]}
            expanded={expanded === execution.id}
            onToggle={() => toggle(execution)}
            onRetry={(patch) => operate(execution, 'retry', patch)}
            onCancel={() => operate(execution, 'cancel')}
            busy={busy}
          />
        ))}
        {!visible.length && (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            Aucune exécution dans cet état.
          </p>
        )}
      </div>

      <section className="space-y-2.5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Workflow className="h-4 w-4 text-primary" /> Workflows disponibles ({definitions.length})
        </h2>
        {definitions.map((definition) => (
          <WorkflowDefinitionCard key={definition.code} definition={definition} />
        ))}
      </section>
    </div>
  );
}