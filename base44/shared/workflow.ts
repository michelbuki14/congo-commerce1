import { WORKFLOWS, definitionSummary, workflowByCode, workflowForEvent } from './workflowDefinitions.ts';
import { executionNumber, newEventId, notify, recordAudit } from './workflowSupport.ts';

/**
 * WORKFLOW ENGINE
 *
 * Runs a definition step by step and persists everything it does, so an
 * execution can be inspected, retried, cancelled or resumed after a crash:
 *
 *   validate → persist → retry with backoff → emit domain event → notify →
 *   audit → compensate on failure → dead-letter when attempts run out.
 *
 * Guarantees
 *   - idempotent: an execution is keyed (`{workflow}:{tenant}:{reference}`) and
 *     a repeated call returns the first result instead of running again;
 *   - resumable: state lives in the database (execution + step rows), never in
 *     memory, so a resume continues at the failed step;
 *   - observable: execution, steps, domain events, audit trail and metrics;
 *   - safe: a critical failure compensates what was already done, a
 *     non-critical failure is recorded as degraded and never blocks the result.
 */

const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 4000;
export const STUCK_AFTER_MS = 15 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nowIso = () => new Date().toISOString();
const backoffMs = (attempt) => Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempt - 1));
const toObject = (value) => (value && typeof value === 'object' ? value : value === undefined ? {} : { value });

async function publish(base44, meta, eventType, payload = {}) {
  return base44.asServiceRole.entities.WorkflowEvent.create({
    event_id: newEventId(),
    event_type: eventType,
    tenant_id: meta.tenantId || '',
    tenant_owner_email: meta.tenantOwnerEmail || '',
    aggregate_type: meta.aggregateType || '',
    aggregate_id: meta.aggregateId || '',
    workflow_code: meta.workflowCode || '',
    execution_id: meta.executionId || '',
    version: 1,
    source: 'workflow_engine',
    payload,
    published_at: nowIso(),
    description: String(payload.description || '').slice(0, 1000),
  }).catch(() => null);
}

/** Mirrors a definition into the database so the console can list it. */
export async function syncDefinition(base44, def) {
  const rows = await base44.asServiceRole.entities.WorkflowDefinition.filter({ code: def.code }).catch(() => []);
  const summary = definitionSummary(def);
  if (!rows.length) {
    return base44.asServiceRole.entities.WorkflowDefinition.create({
      ...summary,
      active: true,
      run_count: 0,
    }).catch(() => null);
  }
  const row = rows[0];
  if (row.version !== def.version || !row.steps?.length) {
    return base44.asServiceRole.entities.WorkflowDefinition.update(row.id, { ...summary, active: true }).catch(() => null);
  }
  return row;
}

/** Every registered definition, mirrored into the database on first listing. */
export async function listDefinitions(base44) {
  for (const def of WORKFLOWS) {
    await syncDefinition(base44, def);
  }
  const rows = await base44.asServiceRole.entities.WorkflowDefinition.list('code', 100).catch(() => []);
  return rows.length ? rows : WORKFLOWS.map((def) => definitionSummary(def));
}

export function registeredDefinitions() {
  return WORKFLOWS.map(definitionSummary);
}

export { workflowForEvent };

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------
async function reserveKey(base44, key, scope, workflowCode) {
  const existing = await base44.asServiceRole.entities.IdempotencyKey.filter({ key, scope }).catch(() => []);
  const finished = existing.find((row) => row.status === 'completed' || row.status === 'failed');
  if (finished) return { outcome: 'duplicate', row: finished };
  if (existing.length) return { outcome: 'in_flight', row: existing[0] };

  const mine = await base44.asServiceRole.entities.IdempotencyKey.create({
    key,
    scope,
    workflow_code: workflowCode,
    status: 'reserved',
    attempts: 1,
    description: `Verrou d’exécution ${workflowCode}`,
  });

  // Two simultaneous callers can both insert; the oldest reservation wins and
  // the other one backs off. (No unique index exists on the collection.)
  const rows = await base44.asServiceRole.entities.IdempotencyKey.filter({ key, scope }).catch(() => []);
  const oldest = rows.slice().sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || '')))[0];
  if (oldest && oldest.id !== mine.id) return { outcome: 'in_flight', row: oldest };
  return { outcome: 'reserved', row: mine };
}

async function closeKey(base44, key, status, executionId, result, error = '') {
  if (!key) return;
  const rows = await base44.asServiceRole.entities.IdempotencyKey.filter({ key, scope: key.split(':')[0] }).catch(() => []);
  const row = rows[0];
  if (!row) return;
  await base44.asServiceRole.entities.IdempotencyKey.update(row.id, {
    status,
    execution_id: executionId || row.execution_id || '',
    result: toObject(result),
    error: String(error || '').slice(0, 500),
    attempts: Number(row.attempts || 1) + 1,
  }).catch(() => null);
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------
async function finish(base44, params) {
  const { execution, def, meta, ctx, status, error = '', deadLetter = false } = params;
  const steps = await base44.asServiceRole.entities.WorkflowStep
    .filter({ execution_id: execution.id }, 'step_index', 100)
    .catch(() => []);
  const completed = steps.filter((s) => s.status === 'COMPLETED' || s.status === 'SKIPPED').length;
  const failed = steps.filter((s) => s.status === 'FAILED').length;
  const duration = Date.now() - new Date(execution.started_at || Date.now()).getTime();
  const attempts = Number(execution.attempts || 1);
  const maxAttempts = Number(execution.max_attempts || def.max_attempts || 3);

  const patch = {
    status,
    completed_steps: completed,
    failed_steps: failed,
    error: String(error || '').slice(0, 1000),
    completed_at: status === 'WAITING' ? '' : nowIso(),
    duration_ms: duration,
    output: { results: ctx?.results || {}, data: ctx?.data || {} },
    dead_letter: deadLetter,
    next_retry_at: status === 'FAILED' && !deadLetter ? new Date(Date.now() + backoffMs(attempts)).toISOString() : '',
    waiting_reason: status === 'WAITING' ? String(params.reason || '').slice(0, 300) : '',
  };
  const updated = await base44.asServiceRole.entities.WorkflowExecution.update(execution.id, patch).catch(() => null);

  await recordAudit(base44, {
    action: `workflow.${String(status).toLowerCase()}`,
    actor: execution.actor_email || 'system',
    entity: 'WorkflowExecution',
    entityId: execution.id,
    reference: execution.execution_number || def.code,
    severity: status === 'FAILED' ? 'warning' : 'info',
    details: { workflow: def.code, status, steps: steps.length, completed, failed, duration_ms: duration, error: patch.error },
  });

  await publish(base44, meta, status === 'COMPLETED' ? 'workflow.completed' : status === 'FAILED' ? 'workflow.failed' : 'workflow.cancelled', {
    status,
    error: patch.error,
    duration_ms: duration,
    steps: steps.length,
    description: `${def.name} — ${status}`,
  });

  const definitionRows = await base44.asServiceRole.entities.WorkflowDefinition.filter({ code: def.code }).catch(() => []);
  if (definitionRows[0]) {
    const previous = definitionRows[0];
    const runCount = Number(previous.run_count || 0);
    const avg = Number(previous.avg_duration_ms || 0);
    await base44.asServiceRole.entities.WorkflowDefinition.update(previous.id, {
      run_count: runCount + 1,
      last_run_at: nowIso(),
      last_status: status,
      avg_duration_ms: Math.round((avg * runCount + duration) / (runCount + 1)),
    }).catch(() => null);
  }

  if (status === 'COMPLETED') await closeKey(base44, execution.idempotency_key, 'completed', execution.id, patch.output);
  else if (status === 'FAILED') await closeKey(base44, execution.idempotency_key, 'failed', execution.id, patch.output, patch.error);

  return { ok: status === 'COMPLETED', execution_id: execution.id, status, error: patch.error, steps: steps.length, completed, failed, duration_ms: duration, execution: updated };
}

async function compensate(base44, params) {
  const { def, execution, meta, ctx, completed } = params;
  const compensated = [];
  for (const entry of [...completed].reverse()) {
    const step = entry.step;
    if (typeof step.compensate !== 'function') continue;
    try {
      const output = await step.compensate(ctx, ctx.results[step.name]);
      await base44.asServiceRole.entities.WorkflowStep.update(entry.row.id, {
        status: 'COMPENSATED',
        compensated: true,
        output: toObject(output),
      });
      compensated.push(step.name);
      await publish(base44, meta, 'workflow.step_compensated', { step: step.name, description: `Annulation de ${step.label || step.name}` });
    } catch (error) {
      await base44.asServiceRole.entities.WorkflowStep.update(entry.row.id, {
        compensated: false,
        compensation_error: String(error?.message || error).slice(0, 300),
      }).catch(() => null);
    }
  }
  return compensated;
}

async function runSteps(base44, params) {
  const { def, execution, startIndex = 0 } = params;
  const meta = {
    workflowCode: def.code,
    executionId: execution.id,
    tenantId: execution.tenant_id || '',
    tenantOwnerEmail: execution.tenant_owner_email || '',
    aggregateType: def.aggregateType || '',
    aggregateId: execution.trigger_reference || '',
  };

  const restored = execution.output && typeof execution.output === 'object' ? execution.output : {};
  const ctx = {
    base44,
    def,
    execution,
    input: params.input || execution.input || {},
    tenantId: execution.tenant_id || '',
    tenantOwnerEmail: execution.tenant_owner_email || '',
    actorEmail: params.actorEmail || execution.actor_email || '',
    data: restored.data || {},
    results: restored.results || {},
    logs: [],
    publish: (type, payload) => publish(base44, meta, type, payload),
    notify: (options) => notify(base44, options),
    audit: (options) => recordAudit(base44, options),
    log: (message) => ctx.logs.push(String(message).slice(0, 300)),
  };

  const stepRows = await base44.asServiceRole.entities.WorkflowStep
    .filter({ execution_id: execution.id }, 'step_index', 100)
    .catch(() => []);

  await publish(base44, meta, startIndex === 0 ? 'workflow.started' : 'workflow.resumed', {
    step_index: startIndex,
    description: `${def.name} ${startIndex === 0 ? 'démarré' : 'repris'}`,
  });

  const completed = [];
  const degraded = [];

  for (let index = startIndex; index < def.steps.length; index += 1) {
    const step = def.steps[index];
    const label = step.label || step.name;

    // Cancellation and compensation are decided between steps.
    const current = await base44.asServiceRole.entities.WorkflowExecution.get(execution.id).catch(() => null);
    if (current && current.status === 'CANCELLED') {
      const compensated = await compensate(base44, { def, execution, meta, ctx, completed });
      const result = await finish(base44, { execution, def, meta, ctx, status: 'CANCELLED', error: 'Annulé par un administrateur' });
      return { ...result, compensated };
    }

    let row = stepRows.find((r) => r.step_index === index);
    if (!row) {
      row = await base44.asServiceRole.entities.WorkflowStep.create({
        execution_id: execution.id,
        workflow_code: def.code,
        tenant_id: execution.tenant_id || '',
        step_index: index,
        name: step.name,
        label,
        status: 'RUNNING',
        attempts: 0,
        max_attempts: step.retries ?? def.max_attempts ?? 3,
        critical: step.critical !== false,
        started_at: nowIso(),
      });
      stepRows.push(row);
    } else {
      row = await base44.asServiceRole.entities.WorkflowStep.update(row.id, {
        status: 'RUNNING',
        attempts: 0,
        error: '',
        started_at: nowIso(),
      });
    }

    await base44.asServiceRole.entities.WorkflowExecution.update(execution.id, {
      current_step: label,
      current_step_index: index,
      status: 'RUNNING',
    }).catch(() => null);

    const maxAttempts = step.retries ?? def.max_attempts ?? 3;
    let attempt = 0;
    let lastError = '';
    let output = null;
    let succeeded = false;

    while (attempt < maxAttempts && !succeeded) {
      attempt += 1;
      const attemptStarted = Date.now();
      try {
        output = await step.run(ctx);
        succeeded = true;
        await base44.asServiceRole.entities.WorkflowStep.update(row.id, {
          status: 'COMPLETED',
          attempts: attempt,
          duration_ms: Date.now() - attemptStarted,
          completed_at: nowIso(),
          output: toObject(output),
          error: '',
        });
      } catch (error) {
        lastError = String(error?.message || error).slice(0, 500);
        await base44.asServiceRole.entities.WorkflowStep.update(row.id, {
          attempts: attempt,
          error: lastError,
          duration_ms: Date.now() - attemptStarted,
        }).catch(() => null);
        if (attempt < maxAttempts) {
          await base44.asServiceRole.entities.WorkflowExecution.update(execution.id, { status: 'RETRYING' }).catch(() => null);
          await publish(base44, meta, 'workflow.step_retrying', {
            step: step.name,
            attempt,
            error: lastError,
            description: `${label} — nouvelle tentative ${attempt + 1}/${maxAttempts}`,
          });
          await sleep(backoffMs(attempt));
        }
      }
    }

    if (succeeded) {
      const result = toObject(output);
      ctx.results[step.name] = result;

      if (result.waiting) {
        await base44.asServiceRole.entities.WorkflowStep.update(row.id, { status: 'COMPLETED', output: result }).catch(() => null);
        const finished = await finish(base44, { execution, def, meta, ctx, status: 'WAITING', reason: result.reason });
        return { ...finished, waiting: true, reason: result.reason };
      }

      if (result.skipped) {
        await base44.asServiceRole.entities.WorkflowStep.update(row.id, { status: 'SKIPPED', output: result }).catch(() => null);
      } else {
        completed.push({ step, row });
        await publish(base44, meta, 'workflow.step_completed', {
          step: step.name,
          description: `${label} terminé`,
        });
      }

      await base44.asServiceRole.entities.WorkflowExecution.update(execution.id, {
        completed_steps: completed.length,
        output: { results: ctx.results, data: ctx.data },
      }).catch(() => null);
      continue;
    }

    await base44.asServiceRole.entities.WorkflowStep.update(row.id, {
      status: 'FAILED',
      attempts: attempt,
      error: lastError,
      completed_at: nowIso(),
    }).catch(() => null);

    if (step.critical === false) {
      degraded.push({ step: step.name, error: lastError });
      await publish(base44, meta, 'workflow.step_degraded', {
        step: step.name,
        error: lastError,
        description: `${label} ignoré : ${lastError}`,
      });
      continue;
    }

    const compensated = await compensate(base44, { def, execution, meta, ctx, completed });
    const attemptsSoFar = Number(execution.attempts || 1);
    const maxExecutionAttempts = Number(execution.max_attempts || def.max_attempts || 3);
    const finished = await finish(base44, {
      execution,
      def,
      meta,
      ctx,
      status: 'FAILED',
      error: lastError,
      deadLetter: attemptsSoFar >= maxExecutionAttempts,
    });
    return { ...finished, compensated, degraded };
  }

  const finished = await finish(base44, { execution, def, meta, ctx, status: 'COMPLETED' });
  return { ...finished, degraded };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function startWorkflow(base44, options = {}) {
  const def = workflowByCode(options.code);
  if (!def) return { ok: false, error: `Workflow inconnu : ${options.code}` };

  const input = options.input && typeof options.input === 'object' ? { ...options.input } : {};
  const tenantId = String(options.tenantId || input.tenant_id || '');
  const tenantOwnerEmail = String(options.tenantOwnerEmail || input.tenant_owner_email || '');
  const reference = String(
    input.reference || input.order_number || input.id || input.seller_id || input.product_id || input.subscription_id || '',
  );
  const explicitKey = String(options.idempotencyKey || '');
  const key = explicitKey || (def.idempotent === false || !reference ? '' : `${def.code}:${tenantId || 'global'}:${reference}`);

  if (key) {
    const reservation = await reserveKey(base44, key, def.code, def.code);
    if (reservation.outcome === 'duplicate') {
      return {
        ok: true,
        duplicate: true,
        execution_id: reservation.row.execution_id || '',
        status: reservation.row.status === 'completed' ? 'COMPLETED' : 'FAILED',
        result: reservation.row.result || {},
      };
    }
    if (reservation.outcome === 'in_flight') {
      return { ok: true, duplicate: true, in_flight: true, execution_id: reservation.row.execution_id || '', status: 'RUNNING' };
    }
  }

  await syncDefinition(base44, def);

  const execution = await base44.asServiceRole.entities.WorkflowExecution.create({
    workflow_code: def.code,
    workflow_name: def.name,
    execution_number: executionNumber(def.code),
    tenant_id: tenantId,
    tenant_owner_email: tenantOwnerEmail,
    trigger: options.trigger || def.trigger || 'manual',
    trigger_reference: reference,
    status: 'RUNNING',
    current_step: '',
    current_step_index: 0,
    total_steps: def.steps.length,
    completed_steps: 0,
    failed_steps: 0,
    attempts: 1,
    max_attempts: Number(options.maxAttempts || def.max_attempts || 3),
    idempotency_key: key,
    input,
    output: {},
    error: '',
    dead_letter: false,
    started_at: nowIso(),
    actor_email: options.actorEmail || '',
    description: `${def.name} — ${reference || 'sans référence'}`,
  });

  if (key) {
    const rows = await base44.asServiceRole.entities.IdempotencyKey.filter({ key, scope: def.code }).catch(() => []);
    if (rows[0]) await base44.asServiceRole.entities.IdempotencyKey.update(rows[0].id, { execution_id: execution.id }).catch(() => null);
  }

  return runSteps(base44, { def, execution, startIndex: 0, input, actorEmail: options.actorEmail });
}

export async function resumeExecution(base44, executionId, options = {}) {
  const execution = await base44.asServiceRole.entities.WorkflowExecution.get(executionId).catch(() => null);
  if (!execution) return { ok: false, error: 'Exécution introuvable' };
  if (['COMPLETED', 'CANCELLED'].includes(String(execution.status))) {
    return { ok: false, error: `Exécution déjà ${String(execution.status).toLowerCase()}` };
  }
  const def = workflowByCode(execution.workflow_code);
  if (!def) return { ok: false, error: `Workflow inconnu : ${execution.workflow_code}` };

  const stepRows = await base44.asServiceRole.entities.WorkflowStep
    .filter({ execution_id: execution.id }, 'step_index', 100)
    .catch(() => []);
  const done = stepRows.filter((s) => s.status === 'COMPLETED' || s.status === 'SKIPPED').map((s) => s.step_index);
  let startIndex = 0;
  while (done.includes(startIndex) && startIndex < def.steps.length) startIndex += 1;

  const input = { ...(execution.input || {}), ...(options.inputPatch || {}) };
  const attempts = Number(execution.attempts || 1) + 1;

  const updated = await base44.asServiceRole.entities.WorkflowExecution.update(execution.id, {
    status: 'RUNNING',
    attempts,
    input,
    error: '',
    dead_letter: false,
    next_retry_at: '',
    waiting_reason: '',
    completed_at: '',
    actor_email: options.actorEmail || execution.actor_email || '',
  });

  return runSteps(base44, {
    def,
    execution: { ...updated, attempts },
    startIndex,
    input,
    actorEmail: options.actorEmail,
  });
}

export async function cancelExecution(base44, executionId, options = {}) {
  const execution = await base44.asServiceRole.entities.WorkflowExecution.get(executionId).catch(() => null);
  if (!execution) return { ok: false, error: 'Exécution introuvable' };
  if (String(execution.status) === 'COMPLETED') return { ok: false, error: 'Exécution déjà terminée' };
  if (String(execution.status) === 'CANCELLED') return { ok: true, execution_id: execution.id, status: 'CANCELLED', already: true };

  await base44.asServiceRole.entities.WorkflowExecution.update(execution.id, {
    status: 'CANCELLED',
    error: String(options.reason || 'Annulé par un administrateur').slice(0, 500),
    completed_at: nowIso(),
  });
  await recordAudit(base44, {
    action: 'workflow.cancelled',
    actor: options.actorEmail || 'system',
    entity: 'WorkflowExecution',
    entityId: execution.id,
    reference: execution.execution_number || execution.workflow_code,
    severity: 'warning',
    details: { reason: options.reason || '' },
  });
  await closeKey(base44, execution.idempotency_key, 'failed', execution.id, {}, 'cancelled');
  return { ok: true, execution_id: execution.id, status: 'CANCELLED' };
}

export async function listStuckExecutions(base44, olderThanMs = STUCK_AFTER_MS) {
  const rows = await base44.asServiceRole.entities.WorkflowExecution
    .filter({ status: 'RUNNING' }, '-started_at', 100)
    .catch(() => []);
  const cutoff = Date.now() - olderThanMs;
  return rows.filter((row) => new Date(row.started_at || 0).getTime() < cutoff);
}