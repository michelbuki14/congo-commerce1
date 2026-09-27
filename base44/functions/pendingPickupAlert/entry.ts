import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * Runs 24 h after a fulfillment order is created (see the "Pending Pickup
 * Followup" workflow). The workflow cannot re-read the record after its wait,
 * so the status check lives here: if the fulfillment is still PENDING we raise
 * an operations alert on the pickup point and open a support ticket for the
 * operations manager.
 *
 * Keyed to the fulfillment number, so a repeated run never opens a second ticket.
 */

const PENDING = ['PENDING'];

function hoursSince(date) {
  const start = new Date(date || Date.now()).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.round((Date.now() - start) / 3600000));
}

async function resolvePickupPoint(base44, order) {
  if (!order) return null;
  if (order.pickup_point_id) {
    const found = await base44.asServiceRole.entities.PickupPoint.get(order.pickup_point_id).catch(() => null);
    if (found) return found;
  }
  if (order.pickup_point_name) {
    const rows = await base44.asServiceRole.entities.PickupPoint
      .filter({ name: order.pickup_point_name })
      .catch(() => []);
    if (rows[0]) return rows[0];
  }
  return null;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const fulfillmentId = String(body.fulfillment_id || '').trim();
    if (!fulfillmentId) return Response.json({ error: 'fulfillment_id is required' }, { status: 400 });

    const fulfillment = await base44.asServiceRole.entities.FulfillmentOrder
      .get(fulfillmentId)
      .catch(() => null);
    if (!fulfillment) return Response.json({ error: 'FulfillmentOrder not found' }, { status: 404 });

    const status = String(fulfillment.status || '').toUpperCase();
    if (!PENDING.includes(status)) {
      return Response.json({ skipped: true, reason: `status is ${status}`, fulfillment_id: fulfillmentId });
    }

    const order = fulfillment.order_id
      ? await base44.asServiceRole.entities.Order.get(fulfillment.order_id).catch(() => null)
      : null;
    const pickupPoint = await resolvePickupPoint(base44, order);
    const isPickup = order?.delivery_method === 'pickup_point' || !!pickupPoint;

    const tenant = {
      tenant_id: String(fulfillment.tenant_id || order?.tenant_id || ''),
      tenant_owner_email: String(fulfillment.tenant_owner_email || order?.tenant_owner_email || ''),
    };

    const label = fulfillment.fulfillment_number || fulfillment.order_number || fulfillmentId;
    const subject = `Colis en attente 24 h — ${label}`;
    const already = await base44.asServiceRole.entities.SupportTicket.filter({ subject }).catch(() => []);
    if (already.length) {
      return Response.json({ skipped: true, reason: 'alert already open', ticket_id: already[0].id, ticket_number: already[0].ticket_number });
    }

    const hours = hoursSince(fulfillment.created_date);
    const pickupLabel = pickupPoint
      ? `${pickupPoint.name}${pickupPoint.commune ? ` (${pickupPoint.commune})` : ''}`
      : order?.pickup_point_name || 'point de retrait non renseigné';
    const pickupDetails = pickupPoint
      ? `Adresse : ${pickupPoint.address || '—'}, ${pickupPoint.city || ''}. Horaires : ${pickupPoint.hours || '—'}. Téléphone : ${pickupPoint.phone || '—'}.`
      : 'Aucune fiche point de retrait trouvée pour cette commande.';
    const inactive = pickupPoint && pickupPoint.active === false
      ? " Le point de retrait est désactivé — cause probable du blocage."
      : '';

    const summary = isPickup
      ? `Le colis ${label} (commande ${fulfillment.order_number || '—'}) est toujours en attente ${hours} h après sa création. Point de retrait à vérifier : ${pickupLabel}. ${pickupDetails}${inactive} Code de retrait client : ${order?.pickup_code || '—'}.`
      : `Le colis ${label} (commande ${fulfillment.order_number || '—'}) est toujours en attente ${hours} h après sa création (livraison à domicile : ${order?.address || '—'}, ${order?.city || '—'}).`;

    const ticket = await base44.asServiceRole.entities.SupportTicket.create({
      ...tenant,
      ticket_number: `OPS-${Date.now().toString(36).toUpperCase()}`,
      subject,
      category: 'delivery',
      status: 'open',
      priority: 'high',
      customer_name: order?.customer_name || '',
      customer_phone: order?.customer_phone || '',
      customer_email: order?.customer_email || '',
      order_number: fulfillment.order_number || '',
      assigned_to: 'operations',
      messages: [{
        author: 'system',
        body: `${summary} Vendeur : ${fulfillment.seller_name || '—'}. Articles : ${(fulfillment.items || []).length}. À investiguer par le responsable des opérations.`,
        at: new Date().toISOString(),
      }],
    });

    await base44.asServiceRole.entities.Notification.create({
      ...tenant,
      title: 'Colis toujours en attente après 24 h',
      message: `${summary} Ticket ${ticket.ticket_number} ouvert pour le responsable des opérations.`,
      type: 'order',
      audience: 'admin',
      order_number: fulfillment.order_number || '',
    });

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'logistics.pickup_alert',
      actor: 'system',
      entity: 'FulfillmentOrder',
      entity_id: fulfillment.id,
      reference: label,
      severity: 'warning',
      details: {
        hours_pending: hours,
        pickup_point: pickupLabel,
        pickup_point_active: pickupPoint ? pickupPoint.active !== false : null,
        ticket_number: ticket.ticket_number,
      },
    });

    return Response.json({
      alerted: true,
      ticket_number: ticket.ticket_number,
      pickup_point: pickupLabel,
      hours_pending: hours,
      fulfillment_id: fulfillment.id,
    });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}