import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import {
  hoursSince,
  money,
  orderNumber,
  paymentState,
  resolveFulfillment,
  tenantOf,
} from '../../shared/fulfillments.ts';

/**
 * One hour after an unpaid fulfillment order is created: a reminder lands in
 * the customer's feed. Keyed to the order number, so a repeated run never
 * posts the reminder twice.
 */

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const fulfillmentId = String(body.fulfillment_id || '').trim();
    if (!fulfillmentId) return Response.json({ error: 'fulfillment_id is required' }, { status: 400 });

    const { fulfillment, order } = await resolveFulfillment(base44, fulfillmentId);
    if (!fulfillment) return Response.json({ error: 'FulfillmentOrder not found' }, { status: 404 });

    const state = paymentState(fulfillment, order);
    if (state.paid) return Response.json({ skipped: true, reason: 'already paid', payment_status: state.payment_status });
    if (state.closed) return Response.json({ skipped: true, reason: `order is ${state.payment_status || state.fulfillment_status}` });

    const reference = orderNumber(fulfillment, order);
    const title = `Rappel : votre commande ${reference} n'est pas encore réglée`;
    const existing = await base44.asServiceRole.entities.Notification
      .filter({ title, order_number: reference })
      .catch(() => []);
    if (existing.length) return Response.json({ skipped: true, reason: 'reminder already sent', notification_id: existing[0].id });

    const hours = hoursSince(fulfillment.created_date);
    const payment = order?.payment_method || order?.payment_provider || 'mobile money';
    const message =
      `Votre commande ${reference} (${money(order?.total_usd)}) est enregistrée mais son paiement ` +
      `n'a pas encore été confirmé — aucun montant n'a été prélevé. Finalisez le règlement par ${payment} ` +
      `depuis « Mes commandes » ou répondez à ce message : notre équipe vous accompagne.`;

    const notification = await base44.asServiceRole.entities.Notification.create({
      ...tenantOf(fulfillment, order),
      title,
      message,
      type: 'payment',
      audience: 'customer',
      order_number: reference,
    });

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'billing.unpaid_reminder',
      actor: 'system',
      entity: 'FulfillmentOrder',
      entity_id: fulfillment.id,
      reference,
      severity: 'info',
      details: { hours_since_creation: hours, payment_status: state.payment_status, amount_usd: order?.total_usd ?? 0 },
    });

    return Response.json({
      reminded: true,
      order_number: reference,
      notification_id: notification.id,
      hours_since_creation: hours,
    });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}