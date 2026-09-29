import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { useTranslation } from 'react-i18next';

export const STATUS_STYLES = {
  PENDING: 'bg-secondary text-foreground',
  RUNNING: 'bg-sky-100 text-sky-900',
  WAITING: 'bg-amber-100 text-amber-900',
  COMPLETED: 'bg-emerald-100 text-emerald-900',
  FAILED: 'bg-red-100 text-red-900',
  CANCELLED: 'bg-slate-200 text-slate-700',
  RETRYING: 'bg-indigo-100 text-indigo-900',
};

const STEP_ICONS = {
  COMPLETED: { Icon: CheckCircle2, className: 'text-emerald-600' },
  SKIPPED: { Icon: Circle, className: 'text-muted-foreground' },
  FAILED: { Icon: XCircle, className: 'text-destructive' },
  RUNNING: { Icon: Loader2, className: 'text-sky-600 animate-spin' },
  COMPENSATED: { Icon: RotateCcw, className: 'text-amber-600' },
  PENDING: { Icon: Circle, className: 'text-muted-foreground' },
};

export default function WorkflowExecutionCard({ execution, steps, expanded, onToggle, onRetry, onCancel, busy }) {
  const { t } = useTranslation();
  const [decision, setDecision] = useState('');
  const status = String(execution.status || '');
  const canRetry = ['FAILED', 'WAITING', 'RETRYING', 'CANCELLED'].includes(status);
  const canCancel = ['RUNNING', 'PENDING', 'WAITING', 'RETRYING'].includes(status);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-2 text-left">
        <div className="min-w-0">
          <p className="text-sm font-bold">
            {execution.workflow_name || execution.workflow_code}
            {execution.dead_letter && <span className="ml-2 text-[10px] font-bold text-destructive">{t('workflowExecutionCard.deadLetter')}</span>}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {execution.execution_number} · {execution.trigger_reference || t('workflowExecutionCard.noReference')} · {formatDateTime(execution.created_date)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t('workflowExecutionCard.progress', { step: execution.current_step || '—', done: execution.completed_steps || 0, total: execution.total_steps || 0, attempts: execution.attempts || 1, seconds: ((execution.duration_ms || 0) / 1000).toFixed(1) })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[status] || 'bg-secondary'}`}>{status}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {execution.error && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {execution.error}
        </p>
      )}
      {status === 'WAITING' && execution.waiting_reason && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700">
          <PauseCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {execution.waiting_reason}
        </p>
      )}

      {expanded && (
        <div className="mt-3 space-y-2">
          <div className="grid gap-1.5 rounded-xl bg-secondary/60 p-3 text-[11px] text-muted-foreground md:grid-cols-2">
            <span>{t('workflowExecutionCard.tenant', { id: execution.tenant_id || '—' })}</span>
            <span>{t('workflowExecutionCard.trigger', { trigger: execution.trigger })}</span>
            <span>{t('workflowExecutionCard.idempotencyKey', { key: execution.idempotency_key || '—' })}</span>
            <span>{t('workflowExecutionCard.nextRetry', { when: execution.next_retry_at ? formatDateTime(execution.next_retry_at) : '—' })}</span>
          </div>

          <ul className="space-y-1.5">
            {(steps || []).map((step) => {
              const { Icon, className } = STEP_ICONS[step.status] || STEP_ICONS.PENDING;
              return (
                <li key={step.id} className="flex items-start gap-2 rounded-lg border border-border px-2.5 py-1.5">
                  <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${className}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold">
                      {step.label || step.name}
                      {!step.critical && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">{t('workflowExecutionCard.nonCritical')}</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('workflowExecutionCard.stepMeta', { status: step.status, attempts: step.attempts || 0, max: step.max_attempts || 0, duration: step.duration_ms || 0 })}
                    </p>
                    {step.error && <p className="text-[10px] text-destructive">{step.error}</p>}
                    {step.compensation_error && (
                      <p className="text-[10px] text-amber-700">{t('workflowExecutionCard.compensationError', { error: step.compensation_error })}</p>
                    )}
                  </div>
                </li>
              );
            })}
            {!(steps || []).length && <li className="text-[11px] text-muted-foreground">{t('workflowExecutionCard.noSteps')}</li>}
          </ul>
        </div>
      )}

      {(canRetry || canCancel) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canRetry && (
            <>
              {status === 'WAITING' && (
                <input
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  placeholder={t('workflowExecutionCard.decisionPlaceholder')}
                  className="h-9 w-52 rounded-lg border border-border bg-background px-2.5 text-xs"
                />
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => onRetry(decision ? { decision } : {})}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                <PlayCircle className="h-3.5 w-3.5" /> {status === 'WAITING' ? t('workflowExecutionCard.resume') : t('workflowExecutionCard.retry')}
              </button>
            </>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" /> {t('workflowExecutionCard.cancel')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}