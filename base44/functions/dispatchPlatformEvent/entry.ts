import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { buildNotifications, planForEvent } from '../../shared/events.ts';

/**
 * EVENT DISPATCHER — the single entry point of the event spine.
 *
 * Every business event lands here and is handled in four ordered steps:
 *   1. record  — the PlatformEvent row exists before anything reacts to it;
 *   2. notify  — an in-app notification reaches the right person (customer,
 *                seller or admin), as declared by the event's rule;
 *   3. automate — an automated step changes real data (support ticket, usage);
 *   4. audit   — sensitive events also land in the audit trail.
 *
 * Called from the app (an authenticated user) and from workflows (no session),
 * so it never requires a user — it never returns sensitive data either.
 */

const MAX_DESCRIPTION = 1000;
const SEVERITIES = ['info', 'warning', 'critical'];

/** Notification.type is a closed list — map the event category onto it. */
function notificationType(category) {
  if (category === 'order') return 'order';
  if (category === 'risk') return 'system';
  return 'system';
}

function ticketNumber() {
  return `EVT-${Date.now().toString().slice(-6)}`;
}

/**
 * An automated step: a real write the platform performs without a human.
 * Returns the action descriptor stored on the event row.
 */
async function runAutomation(base44, key, ctx) {
  const at = new Date().toISOString();
  try {
    if (key === 'open_support_ticket') {
      const ticket = await base44.asServiceRole.entities.SupportTicket.create({
        tenant_id: ctx.tenantId,
        tenant_owner_email: ctx.tenantOwnerEmail,
        ticket_number: ticketNumber(),
        subject: ctx.name === 'seller_applied'
          ? `Candidature vendeur — ${ctx.reference || ctx.actorName || 'boutique'}`
          : `Litige — ${ctx.reference || 'commande'}`,
        category: ctx.name === 'seller_applied' ? 'account' : 'return',
        priority: 'high',
        status: 'open',
        customer_name: ctx.actorName,
        customer_email: ctx.actorEmail,
        order_number: ctx.reference,
        description: ctx.description,
      });
      return { type: 'automate', label: `Dossier ${ticket.ticket_number} ouvert`, status: 'done', at, detail: key };
    }

    if (key === 'record_usage_event') {
      await base44.asServiceRole.entities.TenantUsageEvent.create({
        tenant_id: ctx.tenantId || 'platform',
        name: ctx.name,
        path: '',
        quantity: 1,
        value_usd: 0,
        description: ctx.description,
        metadata: { source: ctx.source, actor: ctx.actorEmail },
      });
      return { type: 'automate', label: 'Usage enregistré', status: 'done', at, detail: key };
    }

    return { type: 'automate', label: `Étape inconnue : ${key}`, status: 'skipped', at, detail: key };
  } catch (error) {
    return {
      type: 'automate',
      label: `Étape « ${key} » en échec`,
      status: 'failed',
      at,
      detail: String(error?.message || error).slice(0, 300),
    };
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const name = String(body.name || '').trim();
    if (!name) return Response.json({ error: 'name is required' }, { status: 400 });

    const user = await base44.auth.me().catch(() => null);
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};

    const ctx = {
      name,
      source: String(body.source || '').trim(),
      sourceId: String(body.source_id || '').trim(),
      reference: String(body.reference || '').trim(),
      actorEmail: user?.email || String(body.actor_email || 'system'),
      actorName: user?.full_name || String(body.actor_name || ''),
      tenantId: String(body.tenant_id || ''),
      tenantOwnerEmail: String(body.tenant_owner_email || ''),
      description: String(body.description || '').slice(0, MAX_DESCRIPTION),
      payload,
    };

    const severity = SEVERITIES.includes(body.severity) ? body.severity : '';
    const rule = planForEvent(name, severity);
    const category = String(body.category || '').trim() || rule.category;

    // ---- 1. Record ----------------------------------------------------------
    const record = await base44.asServiceRole.entities.PlatformEvent.create({
      name,
      category,
      severity: rule.severity,
      source: ctx.source,
      source_id: ctx.sourceId,
      reference: ctx.reference,
      actor_email: ctx.actorEmail,
      actor_name: ctx.actorName,
      tenant_id: ctx.tenantId,
      tenant_owner_email: ctx.tenantOwnerEmail,
      description: ctx.description,
      payload,
      status: 'received',
      actions: [{ type: 'record', label: 'Événement enregistré', status: 'done', at: new Date().toISOString() }],
    });

    const actions = [...(record.actions || [])];

    // ---- 2. Notify the right person -----------------------------------------
    for (const notification of buildNotifications(ctx, rule)) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          tenant_id: ctx.tenantId,
          tenant_owner_email: ctx.tenantOwnerEmail,
          title: notification.title,
          message: notification.message,
          type: notificationType(category),
          audience: notification.audience,
          order_number: ctx.reference,
        });
        actions.push({ type: 'notify', label: `Notification ${notification.audience}`, status: 'done', at: new Date().toISOString() });
      } catch (error) {
        actions.push({
          type: 'notify',
          label: `Notification ${notification.audience} en échec`,
          status: 'failed',
          at: new Date().toISOString(),
          detail: String(error?.message || error).slice(0, 300),
        });
      }
    }

    // ---- 3. Automated steps -------------------------------------------------
    for (const key of rule.automate || []) {
      actions.push(await runAutomation(base44, key, ctx));
    }

    // ---- 4. Audit trail -----------------------------------------------------
    if (rule.audit) {
      await base44.asServiceRole.entities.AuditLog.create({
        action: `event.${name}`,
        actor: user ? 'user' : 'system',
        entity: ctx.source || 'PlatformEvent',
        entity_id: ctx.sourceId,
        reference: ctx.reference,
        severity: rule.severity,
        details: { actor_email: ctx.actorEmail, category, actions: actions.length },
      });
      actions.push({ type: 'audit', label: 'Journalisé', status: 'done', at: new Date().toISOString() });
    }

    const failed = actions.some((a) => a.status === 'failed');
    await base44.asServiceRole.entities.PlatformEvent.update(record.id, {
      actions,
      status: failed ? 'failed' : 'handled',
      handled_at: new Date().toISOString(),
    });

    return Response.json({ ok: true, event_id: record.id, category, severity: rule.severity, actions });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}