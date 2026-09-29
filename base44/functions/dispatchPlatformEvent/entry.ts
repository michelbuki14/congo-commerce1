import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { buildNotifications, planForEvent } from '../../shared/events.ts';
import { startWorkflow } from '../../shared/workflow.ts';
import { workflowForEvent } from '../../shared/workflowDefinitions.ts';

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
 * Called from the app (an authenticated user), from the platform's own
 * workflows (which authenticate as an administrator) and, for guest flows, from
 * anonymous shoppers. An anonymous caller may only report one of the guest
 * commerce events below, and only for a record that already exists. A signed-in
 * non-admin caller may only report an event about a record that is really
 * theirs, or an assertion about their own action.
 */

const MAX_DESCRIPTION = 1000;
const SEVERITIES = ['info', 'warning', 'critical'];

/** Events an anonymous (guest) shopper may legitimately report, and the record that must exist. */
const GUEST_EVENTS = {
  order_placed: { entity: 'Order', field: 'order_number' },
  order_paid: { entity: 'Order', field: 'order_number' },
  payment_failed: { entity: 'Order', field: 'order_number' },
  order_delivered: { entity: 'Order', field: 'order_number' },
  fulfillment_status_changed: { entity: 'Order', field: 'order_number' },
  dispute_opened: { entity: 'Dispute', field: 'order_number' },
  return_requested: { entity: 'Return', field: 'order_number' },
};

const GUEST_DESCRIPTION_MAX = 300;

/**
 * Events that assert something happened to one specific order. A signed-in
 * non-admin caller may only report these for an order that is actually theirs —
 * otherwise the event, its notification, its audit entry and the support ticket
 * it opens would be written against a stranger's order from caller-supplied
 * text (a spam / phishing vector).
 */
const ORDER_EVENTS = new Set([
  'order_placed',
  'order_paid',
  'payment_failed',
  'order_delivered',
  'fulfillment_status_changed',
  'dispute_opened',
  'return_requested',
  'risk_flagged',
]);

/** True when the caller is the buyer, the selling partner or the tenant of this order. */
async function callerOwnsOrder(base44, order, user) {
  const email = String(user?.email || '').trim().toLowerCase();
  if (!email) return false;
  if (String(order.created_by_id || '') === String(user.id || '')) return true;
  if (String(order.customer_email || '').trim().toLowerCase() === email) return true;
  if (String(order.tenant_owner_email || '').trim().toLowerCase() === email) return true;
  const sellers = await base44.asServiceRole.entities.Seller
    .filter({ email: user.email }, 'name', 5)
    .catch(() => []);
  const names = (sellers || []).map((s) => s.name).filter(Boolean);
  return names.length > 0 && (order.items || []).some((i) => names.includes(i.seller_name));
}

/** Catalogue events: a non-admin may only report them for a product they own. */
const PRODUCT_EVENTS = new Set(['product_published', 'product_archived', 'product_low_stock']);

/**
 * Events that assert the caller's own action and carry no other party's record.
 * A signed-in non-admin may report these; who they are attributed to still comes
 * from the session, never from the request body.
 */
const SELF_EVENTS = new Set([
  'seller_applied',
  'products_bulk_imported',
  'loyalty_redeemed',
  'account_created',
]);

/** True when the caller is the product's seller or its tenant. */
async function callerOwnsProduct(base44, product, user) {
  const email = String(user?.email || '').trim().toLowerCase();
  if (!email) return false;
  if (String(product.created_by_id || '') === String(user.id || '')) return true;
  if (String(product.tenant_owner_email || '').trim().toLowerCase() === email) return true;
  if (String(product.seller_email || '').trim().toLowerCase() === email) return true;
  if (product.seller_id) {
    const seller = await base44.asServiceRole.entities.Seller.get(product.seller_id).catch(() => null);
    if (seller && String(seller.email || '').trim().toLowerCase() === email) return true;
  }
  const sellers = await base44.asServiceRole.entities.Seller.filter({ email: user.email }, 'name', 5).catch(() => []);
  const names = (sellers || []).map((s) => s.name).filter(Boolean);
  return names.length > 0 && names.includes(product.seller_name);
}

/** Plain text only — a notification never carries markup or control characters. */
function plainText(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * The record an anonymous caller's event must reference. A guest may report
 * that something happened — never what it says: every value a notification
 * displays is read from that record, and the caller's own are discarded.
 */
async function findGuestRecord(base44, guest, reference) {
  const rows = await base44.asServiceRole.entities[guest.entity]
    .filter({ [guest.field]: reference }, '-created_date', 1)
    .catch(() => []);
  return rows[0] || null;
}

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
    const isAdmin = String(user?.role || '') === 'admin';
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
    const reference = String(body.reference || '').trim();
    // A released payout is a privileged financial assertion, not a client event.
    if (name === 'payout_released' && !isAdmin) {
      return Response.json({ error: 'Versement réservé aux administrateurs' }, { status: user ? 403 : 401 });
    }

    // A signed-in, non-admin caller may only report an event that is really
    // theirs: an order event on their own order, a catalogue event on their own
    // product, or an assertion about their own action. Everything else would
    // record an event, notify an administrator and — for some rules — open a
    // high-priority support ticket out of caller-supplied text, under a tenant
    // the caller does not belong to.
    let ownedOrder: any = null;
    let ownedProduct: any = null;
    if (user && !isAdmin) {
      if (ORDER_EVENTS.has(name)) {
        const rows = await base44.asServiceRole.entities.Order
          .filter({ order_number: reference }, '-created_date', 1)
          .catch(() => []);
        ownedOrder = rows?.[0] || null;
        if (!ownedOrder || !(await callerOwnsOrder(base44, ownedOrder, user))) {
          return Response.json({ error: 'Événement non autorisé' }, { status: 403 });
        }
      } else if (PRODUCT_EVENTS.has(name)) {
        const productId = String(body.source_id || '').trim();
        ownedProduct = productId
          ? await base44.asServiceRole.entities.Product.get(productId).catch(() => null)
          : null;
        if (!ownedProduct || !(await callerOwnsProduct(base44, ownedProduct, user))) {
          return Response.json({ error: 'Événement non autorisé' }, { status: 403 });
        }
      } else if (!SELF_EVENTS.has(name)) {
        return Response.json({ error: 'Événement non autorisé' }, { status: 403 });
      }
    }

    // ---- 0. Trust boundary --------------------------------------------------
    // Anyone can reach this endpoint. An anonymous caller may only report the
    // guest-facing commerce events, and only for a record that really exists —
    // so a fabricated event can neither be recorded, notified, audited, nor
    // used to start a business workflow. A guest's event is then rebuilt from
    // that record: it may say that something happened, never what a
    // notification shows. A signed-in caller's identity always comes from the
    // session; only an administrator (which is what the platform's own
    // workflows are) may state one.
    let guestRecord = null;
    let guestEntity = '';
    if (!user) {
      const guest = GUEST_EVENTS[name];
      guestRecord = guest && reference ? await findGuestRecord(base44, guest, reference) : null;
      if (!guestRecord) return Response.json({ error: 'Événement non autorisé' }, { status: 401 });
      guestEntity = guest.entity;
    }

    // The record the caller proved they own, if any. What a notification, a
    // support ticket or a usage row shows about the tenant is read from it — a
    // non-admin never names one, only an administrator may.
    const ownedRecord = guestRecord || ownedOrder || ownedProduct;
    const untrusted = Boolean(guestRecord) || (Boolean(user) && !isAdmin);

    const ctx = {
      name,
      // A guest's event carries no caller-chosen field at all: only the event
      // name and the reference were accepted above, and the reference was
      // checked against a real record. Everything else — which surface it came
      // from, its severity, its category and the values it displays — is read
      // from that record, never from the request body.
      source: guestRecord ? guestEntity : String(body.source || '').trim(),
      sourceId: guestRecord ? String(guestRecord.id || '') : String(body.source_id || '').trim(),
      reference,
      actorEmail: isAdmin && body.actor_email ? String(body.actor_email) : user?.email || '',
      actorName: isAdmin && body.actor_name ? String(body.actor_name) : user?.full_name || '',
      tenantId: String((ownedRecord ? ownedRecord.tenant_id : isAdmin ? body.tenant_id : '') || ''),
      tenantOwnerEmail: String((ownedRecord ? ownedRecord.tenant_owner_email : isAdmin ? body.tenant_owner_email : '') || ''),
      description: untrusted
        ? plainText(body.description, guestRecord ? GUEST_DESCRIPTION_MAX : MAX_DESCRIPTION)
        : String(body.description || '').slice(0, MAX_DESCRIPTION),
      payload: guestRecord
        ? {
            order_number: reference,
            total_usd: Number(guestRecord.total_usd) || 0,
            fulfillments: Number(guestRecord.fulfillment_count) || 0,
            city: guestRecord.city || '',
            status: guestRecord.status || '',
          }
        : payload,
    };

    const severity = !guestRecord && SEVERITIES.includes(body.severity) ? body.severity : '';
    const rule = planForEvent(name, severity);
    const category = guestRecord ? rule.category : String(body.category || '').trim() || rule.category;

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
      payload: ctx.payload,
      status: 'received',
      actions: [{ type: 'record', label: 'Événement enregistré', status: 'done', at: new Date().toISOString() }],
    });

    const actions = [...(record.actions || [])];

    // ---- 2. Hand over to the workflow engine when one owns this event -------
    // The workflow then performs the whole business process (and its own
    // automated steps); the dispatcher keeps recording, notifying and auditing.
    // An event payload may never answer a step that is waiting for a human
    // decision — those only ever come from the administrator API.
    // A client-reported event may never answer a human-decision step, nor name
    // the attribution a workflow pays out: the order's own stored attribution
    // stays the only source of truth for a commission.
    const {
      decision: _decision,
      creator_id: _creatorId,
      affiliate_code: _affiliateCode,
      ...safePayload
    } = payload;

    const owned = workflowForEvent(name);
    let workflowRun = null;
    // Starting an event-owned workflow is a privileged act — the engine runs
    // its steps as the platform itself. A workflow reserved for administrators
    // therefore starts only for an administrator, whatever the event claims.
    const mayStartWorkflow = Boolean(owned) && isAdmin && !body.workflow_code;
    if (mayStartWorkflow) {
      workflowRun = await startWorkflow(base44, {
        code: owned.code,
        input: {
          ...safePayload,
          reference: ctx.reference,
          order_number: payload.order_number || ctx.reference,
          tenant_id: ctx.tenantId,
          tenant_owner_email: ctx.tenantOwnerEmail,
          actor_email: ctx.actorEmail,
          actor_name: ctx.actorName,
        },
        tenantId: ctx.tenantId,
        tenantOwnerEmail: ctx.tenantOwnerEmail,
        trigger: 'event',
        actorEmail: ctx.actorEmail,
      });
      actions.push({
        type: 'workflow',
        label: `${owned.name} — ${workflowRun.status || (workflowRun.duplicate ? 'déjà traité' : 'lancé')}`,
        status: workflowRun.status === 'FAILED' ? 'failed' : 'done',
        at: new Date().toISOString(),
        detail: owned.code,
      });
    } else if (owned && !isAdmin) {
      actions.push({
        type: 'workflow',
        label: `${owned.name} — réservé aux administrateurs`,
        status: 'skipped',
        at: new Date().toISOString(),
        detail: owned.code,
      });
    }

    // ---- 3. Notify the right person -----------------------------------------
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

    // ---- 4. Automated steps (the workflow engine owns them when it runs) ----
    for (const key of workflowRun ? [] : rule.automate || []) {
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
    return Response.json({ error: String(error?.message || error) }, { status: error?.status || 500 });
  }
}