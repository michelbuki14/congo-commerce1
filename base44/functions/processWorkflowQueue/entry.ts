import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { STUCK_AFTER_MS, listStuckExecutions, resumeExecution, startWorkflow } from '../../shared/workflow.ts';

/**
 * WORKFLOW QUEUE RUNNER — the background job behind every long-running
 * workflow (scheduled from the "Workflow Queue Runner" automation):
 *
 *   1. executions that never finished are timed out and dead-lettered;
 *   2. failed executions whose backoff has elapsed are retried, up to their
 *      attempt ceiling — the retry resumes at the failed step, never restarts
 *      the work already done;
 *   3. overdue subscriptions enter the dunning workflow (reminder → grace →
 *      past due → suspension, data always preserved).
 *
 * Each pass is bounded, so one slow workflow can never starve the others.
 */

const MAX_PER_RUN = 5;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    await req.json().catch(() => ({}));
    const now = Date.now();
    const summary = { timed_out: [], retried: [], dunning: [] };

    // 1. Timed out.
    const stuck = await listStuckExecutions(base44, STUCK_AFTER_MS);
    for (const execution of stuck.slice(0, MAX_PER_RUN)) {
      await base44.asServiceRole.entities.WorkflowExecution.update(execution.id, {
        status: 'FAILED',
        error: 'Délai dépassé — exécution interrompue',
        dead_letter: true,
        completed_at: new Date().toISOString(),
      }).catch(() => null);
      summary.timed_out.push(execution.execution_number || execution.id);
    }

    // 2. Retries whose backoff elapsed.
    const failed = await base44.asServiceRole.entities.WorkflowExecution
      .filter({ status: 'FAILED' }, '-completed_at', 50)
      .catch(() => []);
    for (const execution of failed) {
      if (summary.retried.length >= MAX_PER_RUN) break;
      if (execution.dead_letter) continue;
      if (Number(execution.attempts || 1) >= Number(execution.max_attempts || 3)) continue;
      const due = execution.next_retry_at ? new Date(execution.next_retry_at).getTime() : 0;
      if (due && due > now) continue;
      const result = await resumeExecution(base44, execution.id, { inputPatch: {} });
      summary.retried.push({ execution: execution.execution_number || execution.id, status: result.status || 'unknown' });
    }

    // 3. Dunning for overdue subscriptions.
    const subscriptions = await base44.asServiceRole.entities.Subscription
      .filter({ status: 'past_due' }, '-updated_date', 20)
      .catch(() => []);
    for (const subscription of subscriptions.slice(0, MAX_PER_RUN)) {
      const result = await startWorkflow(base44, {
        code: 'subscription_dunning',
        input: { subscription_id: subscription.id, tenant_id: subscription.tenant_id, reference: subscription.id },
        tenantId: subscription.tenant_id || '',
        tenantOwnerEmail: subscription.owner_email || '',
        trigger: 'schedule',
        actorEmail: 'scheduler',
      });
      summary.dunning.push({ subscription_id: subscription.id, status: result.status || (result.duplicate ? 'DUPLICATE' : 'unknown') });
    }

    return Response.json({
      ok: true,
      ...summary,
      counts: { timed_out: summary.timed_out.length, retried: summary.retried.length, dunning: summary.dunning.length },
    });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}