import React from 'react';
import { Repeat, Timer, Workflow } from 'lucide-react';

const CATEGORY_STYLES = {
  onboarding: 'bg-sky-100 text-sky-900',
  billing: 'bg-violet-100 text-violet-900',
  commerce: 'bg-emerald-100 text-emerald-900',
  risk: 'bg-red-100 text-red-900',
  ops: 'bg-secondary text-foreground',
};

const TRIGGER_LABELS = { manual: 'Manuel', event: 'Événement', schedule: 'Planifié' };

export default function WorkflowDefinitionCard({ definition }) {
  const steps = definition.steps || [];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Workflow className="h-4 w-4 text-primary" /> {definition.name}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">{definition.code} · v{definition.version}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORY_STYLES[definition.category] || CATEGORY_STYLES.ops}`}>
            {definition.category}
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
            {TRIGGER_LABELS[definition.trigger] || definition.trigger}
          </span>
          {definition.idempotent && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">Idempotent</span>
          )}
        </div>
      </div>

      {definition.description && <p className="mt-2 text-xs text-muted-foreground">{definition.description}</p>}

      {!!(definition.event_names || []).length && (
        <p className="mt-1 text-[11px] text-muted-foreground">Déclenché par : {definition.event_names.join(', ')}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {steps.map((step) => (
          <span
            key={step.name}
            className={`rounded-full border px-2 py-0.5 text-[10px] ${
              step.critical ? 'border-border' : 'border-dashed border-border text-muted-foreground'
            }`}
            title={`${step.critical ? 'Critique' : 'Non critique'} · ${step.retries} tentative(s)`}
          >
            {step.index + 1}. {step.label}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Repeat className="h-3.5 w-3.5" /> {definition.run_count || 0} exécution(s)
        </span>
        {definition.avg_duration_ms > 0 && (
          <span className="flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" /> {(definition.avg_duration_ms / 1000).toFixed(1)} s en moyenne
          </span>
        )}
        {definition.last_status && <span>Dernier statut : {definition.last_status}</span>}
      </div>
    </div>
  );
}