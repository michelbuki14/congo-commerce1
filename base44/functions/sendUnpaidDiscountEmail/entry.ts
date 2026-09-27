import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import {
  addDays,
  discountCode,
  frenchDate,
  money,
  orderNumber,
  paymentState,
  resolveFulfillment,
  tenantOf,
} from '../../shared/fulfillments.ts';

/**
 * Still unpaid after 24 hours: the customer gets a 10 % code by e-mail.
 *
 * The code is derived from the fulfillment id, so a repeated run reuses the
 * same coupon instead of minting a second one, and the send is recorded in the
 * app's order-notification ledger (sent / failed / skipped) like every other
 * customer message.
 */

const DISCOUNT_PERCENT = 10;
const VALID_DAYS = 7;
const EVENT = 'payment_discount';

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
    const tenant = tenantOf(fulfillment, order);
    const email = String(order?.customer_email || '').trim();
    const code = discountCode(fulfillment.id);

    const alreadySent = await base44.asServiceRole.entities.OrderNotification
      .filter({ order_number: reference, event: EVENT, status: 'sent' })
      .catch(() => []);
    if (alreadySent.length) return Response.json({ skipped: true, reason: 'discount already sent', code });

    const expiresAt = addDays(VALID_DAYS);
    const subject = `Votre commande ${reference} vous attend — ${DISCOUNT_PERCENT} % de remise`;
    const message =
      `Votre commande ${reference} (${money(order?.total_usd)}) n'est toujours pas réglée. ` +
      `Pour vous remercier de votre patience, utilisez le code ${code} : ${DISCOUNT_PERCENT} % de remise, ` +
      `valable jusqu'au ${frenchDate(expiresAt)}. Saisissez-le au moment du paiement.`;

    const ledger = await base44.asServiceRole.entities.OrderNotification.create({
      ...tenant,
      order_id: order?.id || '',
      order_number: reference,
      fulfillment_number: fulfillment.fulfillment_number || '',
      event: EVENT,
      label: `Relance impayé — ${DISCOUNT_PERCENT} %`,
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
      return Response.json({ sent: false, skipped: true, reason: 'no customer email', code, order_number: reference });
    }

    const coupons = await base44.asServiceRole.entities.Coupon.filter({ code }).catch(() => []);
    const coupon = coupons[0] || await base44.asServiceRole.entities.Coupon.create({
      ...tenant,
      code,
      description: `${DISCOUNT_PERCENT} % — commande ${reference} non réglée`,
      type: 'percent',
      value: DISCOUNT_PERCENT,
      min_order_usd: 0,
      usage_limit: 1,
      usage_count: 0,
      expires_at: expiresAt,
      active: true,
    });

    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;color:#111;line-height:1.6">
        <p>Bonjour ${order?.customer_name ? String(order.customer_name).replace(/[<>&]/g, '') : ''},</p>
        <p>Votre commande <strong>${reference}</strong> (${money(order?.total_usd)}) n'est toujours pas réglée.</p>
        <p>Pour vous remercier de votre patience, voici <strong>${DISCOUNT_PERCENT} % de remise</strong> :</p>
        <p style="margin:20px 0">
          <span style="display:inline-block;border:2px dashed #111;border-radius:12px;padding:12px 22px;font-size:20px;font-weight:800;letter-spacing:.08em">${code}</span>
        </p>
        <p>Ce code est valable jusqu'au <strong>${frenchDate(expiresAt)}</strong> et s'applique une seule fois. Saisissez-le au moment du paiement.</p>
        <p style="font-size:13px;color:#555">Aucun montant n'a été prélevé. L'équipe Congo Commerce</p>
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
        action: 'billing.unpaid_discount_failed',
        actor: 'system',
        entity: 'FulfillmentOrder',
        entity_id: fulfillment.id,
        reference,
        severity: 'warning',
        details: { code, error: String(error?.message || error).slice(0, 300) },
      });
      return Response.json({ sent: false, reason: 'email refused', code, order_number: reference });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'billing.unpaid_discount_sent',
      actor: 'system',
      entity: 'FulfillmentOrder',
      entity_id: fulfillment.id,
      reference,
      severity: 'info',
      details: { code, coupon_id: coupon.id, discount_percent: DISCOUNT_PERCENT, expires_at: expiresAt },
    });

    return Response.json({
      sent: true,
      code,
      coupon_id: coupon.id,
      expires_at: expiresAt,
      order_number: reference,
    });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}