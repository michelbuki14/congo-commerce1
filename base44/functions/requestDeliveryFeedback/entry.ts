import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { pageUrl } from '../../shared/app.ts';
import { orderNumber, resolveFulfillment, tenantOf } from '../../shared/fulfillments.ts';

/**
 * Three days after a fulfillment order is delivered (see the "Delivered
 * Feedback Request" workflow): asks the customer for a review — but only when
 * they have not reviewed this order yet.
 *
 * A low rating is handled by the "Review Followup" workflow, which opens a
 * support ticket for the shopping assistant to reach out.
 */

const DELIVERED = ['DELIVERED'];
const EVENT = 'delivery_feedback_request';
const MAX_ITEMS = 3;

/** One link per article, straight to the page carrying the review form. */
async function itemLinks(base44, fulfillment, order) {
  const items = (fulfillment.items?.length ? fulfillment.items : order?.items) || [];
  const links = [];
  for (const item of items.slice(0, MAX_ITEMS)) {
    const product = item?.product_id
      ? await base44.asServiceRole.entities.Product.get(item.product_id).catch(() => null)
      : null;
    links.push({
      title: item?.title || product?.title || 'votre article',
      url: product?.slug ? pageUrl(`/product/${product.slug}`) : pageUrl('/order-history'),
    });
  }
  return links;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const fulfillmentId = String(body.fulfillment_id || '').trim();
    if (!fulfillmentId) return Response.json({ error: 'fulfillment_id is required' }, { status: 400 });

    const { fulfillment, order } = await resolveFulfillment(base44, fulfillmentId);
    if (!fulfillment) return Response.json({ error: 'FulfillmentOrder not found' }, { status: 404 });

    const status = String(fulfillment.status || '').toUpperCase();
    if (!DELIVERED.includes(status)) {
      return Response.json({ skipped: true, reason: `fulfillment is ${status || 'unknown'}` });
    }
    if (String(order?.status || '').toUpperCase() === 'CANCELLED') {
      return Response.json({ skipped: true, reason: 'order was cancelled' });
    }

    const reference = orderNumber(fulfillment, order);

    const reviews = reference
      ? await base44.asServiceRole.entities.Review.filter({ order_number: reference }).catch(() => [])
      : [];
    if (reviews.length) {
      return Response.json({
        skipped: true,
        reason: 'review already submitted',
        order_number: reference,
        review_id: reviews[0].id,
      });
    }

    const alreadySent = await base44.asServiceRole.entities.OrderNotification
      .filter({ order_number: reference, event: EVENT, status: 'sent' })
      .catch(() => []);
    if (alreadySent.length) {
      return Response.json({ skipped: true, reason: 'feedback request already sent', order_number: reference });
    }

    const links = await itemLinks(base44, fulfillment, order);
    const email = String(order?.customer_email || '').trim();
    const subject = `Votre avis nous intéresse — commande ${reference}`;
    const message = [
      `Bonjour ${order?.customer_name || ''},`.trim(),
      '',
      `Votre commande ${reference} vous a été livrée il y a quelques jours. Qu'avez-vous pensé de votre achat ?`,
      ...links.map((link) => `• ${link.title} : ${link.url}`),
      '',
      'Votre note aide les autres clients à choisir en confiance.',
      "Si quelque chose ne s'est pas bien passé, répondez à cet e-mail : notre équipe vous aidera.",
      '',
      "L'équipe Congo Commerce",
    ].join('\n');

    const ledger = await base44.asServiceRole.entities.OrderNotification.create({
      ...tenantOf(fulfillment, order),
      order_id: order?.id || '',
      order_number: reference,
      fulfillment_number: fulfillment.fulfillment_number || '',
      event: EVENT,
      label: "Demande d'avis après livraison",
      customer_name: order?.customer_name || '',
      customer_email: email,
      customer_phone: order?.customer_phone || '',
      subject,
      message,
      channel: 'email',
      provider: 'email',
      status: 'queued',
      attempts: 0,
    });

    if (!email) {
      await base44.asServiceRole.entities.OrderNotification.update(ledger.id, {
        status: 'skipped',
        error: 'Aucun e-mail client',
      });
      return Response.json({ sent: false, skipped: true, reason: 'no customer email', order_number: reference });
    }

    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;color:#111;line-height:1.6">
        <p>Bonjour ${String(order?.customer_name || '').replace(/[<>&]/g, '')},</p>
        <p>Votre commande <strong>${reference}</strong> vous a été livrée il y a quelques jours. Qu'avez-vous pensé de votre achat ?</p>
        <ul style="padding-left:18px">
          ${links.map((link) => `<li><a href="${link.url}">${String(link.title).replace(/[<>&]/g, '')}</a></li>`).join('')}
        </ul>
        <p>Votre note aide les autres clients à choisir en confiance.</p>
        <p style="font-size:13px;color:#555">Si quelque chose ne s'est pas bien passé, répondez à cet e-mail : notre équipe vous aidera.</p>
        <p style="font-size:13px;color:#555">L'équipe Congo Commerce</p>
      </div>
    `;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject,
        html,
        text: message,
        from_name: 'Congo Commerce',
      });
      await base44.asServiceRole.entities.OrderNotification.update(ledger.id, {
        status: 'sent',
        channel: 'email',
        provider: 'email',
        sent_at: new Date().toISOString(),
        attempts: 1,
        error: '',
      });
    } catch (error) {
      await base44.asServiceRole.entities.OrderNotification.update(ledger.id, {
        status: 'failed',
        attempts: 1,
        error: String(error?.message || error).slice(0, 500),
      });
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'support.feedback_request_failed',
        actor: 'system',
        entity: 'FulfillmentOrder',
        entity_id: fulfillment.id,
        reference,
        severity: 'warning',
        details: { error: String(error?.message || error).slice(0, 300) },
      });
      return Response.json({ sent: false, reason: 'email refused', order_number: reference });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'support.feedback_requested',
      actor: 'system',
      entity: 'FulfillmentOrder',
      entity_id: fulfillment.id,
      reference,
      severity: 'info',
      details: { items: links.length, to: email },
    });

    return Response.json({ sent: true, order_number: reference, items: links.length, to: email });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}