import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { cancelExecution, listDefinitions, registeredDefinitions, resumeExecution, startWorkflow } from '../../shared/workflow.ts';
import { workflowByCode } from '../../shared/workflowDefinitions.ts';

/**
 * WORKFLOW API — the single entry point for workflow operations.
 *
 *   { action: 'list' }                            → definitions (admin)
 *   { action: 'start', workflow_code, input }     → run a workflow
 *   { action: 'retry', execution_id, input_patch }→ resume a failed/waiting run (admin)
 *   { action: 'cancel', execution_id }            → stop a run (admin)
 *
 * Every action is administrator-only because workflow steps use service-role
 * access. Tenant IDs and record IDs from the request never authorize a caller.
 */

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'start');
    const isAdmin = String(user?.role || '') === 'admin';

    if (!user) return Response.json({ error: 'Authentification requise' }, { status: 401 });
    // Until tenant-scoped input and payment assertions are verified server-side,
    // no end user may start a service-role workflow by naming a tenant or record.
    if (!isAdmin) return Response.json({ error: 'Réservé aux administrateurs' }, { status: 403 });

    if (action === 'list') {
      return Response.json({ definitions: await listDefinitions(base44), registered: registeredDefinitions().length });
    }

    if (action === 'retry' || action === 'cancel') {
      const executionId = String(body.execution_id || '');
      if (!executionId) return Response.json({ error: 'execution_id requis' }, { status: 400 });

      if (action === 'cancel') {
        return Response.json(await cancelExecution(base44, executionId, { actorEmail: user.email, reason: body.reason }));
      }
      return Response.json(
        await resumeExecution(base44, executionId, {
          inputPatch: body.input_patch && typeof body.input_patch === 'object' ? body.input_patch : {},
          actorEmail: user.email,
        }),
      );
    }

    const code = String(body.workflow_code || body.code || '');
    const def = workflowByCode(code);
    if (!def) return Response.json({ error: `Workflow inconnu : ${code}` }, { status: 404 });

    const input = body.input && typeof body.input === 'object' ? body.input : {};
    const tenantId = String(body.tenant_id || input.tenant_id || '');
    const tenantOwnerEmail = String(body.tenant_owner_email || input.tenant_owner_email || '');

    const result = await startWorkflow(base44, {
      code,
      input,
      tenantId,
      tenantOwnerEmail,
      trigger: String(body.trigger || 'manual'),
      actorEmail: user.email,
      idempotencyKey: body.idempotency_key || '',
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: error?.status || 500 });
  }
}