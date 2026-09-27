import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { orderNumber, resolveFulfillment } from '../../shared/fulfillments.ts';

/**
 * The customer paid: the follow-up stops and the payment is recorded as an
 * analytics event, so the reminder funnel can be measured.
 *
 * `stage` says which check caught the payment — "1h" (before the reminder) or
 * "24h" (before the discount). The event path carries the order number, which
 * also keeps a repeated run from logging the same payment twice.
 */

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const fulfillmentId = String(body.fulfillment_id || '').trim();
    const stage = String(body.stage || '1h').toLowerCase() === '24h' ? '24h' : '1h';
    if (!fulfillmentId) return Response.json({ error: 'fulfillment_id is required' }, { status: 400 });

    const { fulfillment, order } = await resolveFulfillment(base44, fulfillmentId);
    if (!fulfillment) return Response.json({ error: 'FulfillmentOrder not found' }, { status: 404 });

    const reference = orderNumber(fulfillment, order);
    const name = `fulfillment_paid_${stage}`;
    const path = `/workflow/unpaid-followup/${reference}`;

    const existing = await base44.asServiceRole.entities.AnalyticsEvent.filter({ name, path }).catch(() => []);
    if (existing.length) {
      return Response.json({ skipped: true, reason: 'event already logged', name, event_id: existing[0].id });
    }

    const event = await base44.asServiceRole.entities.AnalyticsEvent.create({
      name,
      path,
      session_id: String(order?.session_id || ''),
      value_usd: Number(order?.total_usd) || 0,
    });

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'analytics.fulfillment_paid',
      actor: 'system',
      entity: 'FulfillmentOrder',
      entity_id: fulfillment.id,
      reference,
      severity: 'info',
      details: { stage, event: name, amount_usd: Number(order?.total_usd) || 0 },
    });

    return Response.json({ logged: true, name, stage, order_number: reference, event_id: event.id });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}