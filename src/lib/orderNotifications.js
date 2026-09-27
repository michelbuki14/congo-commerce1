import { base44 } from '@/api/base44Client';
import { buildOrderUpdate } from './orderMessages';

/**
 * Order updates to the customer.
 *
 * Email goes out through the platform's own mail service as soon as a status
 * changes. When the customer left no address (or the send was refused) the
 * message is parked in the outbox with a one-tap WhatsApp / SMS link, so the
 * team can still reach them from a phone — the usual channel in the DRC.
 *
 * A customer update must never block an order, so every failure is recorded on
 * the message itself instead of thrown at the caller.
 */

function waPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('243')) return digits;
  if (digits.startsWith('0')) return `243${digits.slice(1)}`;
  if (digits.length <= 9) return `243${digits}`;
  return digits;
}

export function whatsAppHref(record) {
  const phone = waPhone(record?.customer_phone);
  if (!phone) return '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(record.message || '')}`;
}

export function smsHref(record) {
  const phone = String(record?.customer_phone || '').trim();
  if (!phone) return '';
  return `sms:${phone}?body=${encodeURIComponent(record.message || '')}`;
}

/** Marks a parked message as delivered by hand (phone channel). */
export async function markNotificationSent(record, channel = 'whatsapp') {
  return base44.entities.OrderNotification.update(record.id, {
    status: 'sent',
    channel,
    provider: channel,
    sent_at: new Date().toISOString(),
    attempts: (Number(record.attempts) || 0) + 1,
    error: '',
  });
}

/** Sends (or retries) the stored message by email. */
export async function deliverEmail(record) {
  const attempts = (Number(record.attempts) || 0) + 1;
  try {
    await base44.integrations.Core.SendEmail({
      to: record.customer_email,
      subject: record.subject,
      body: record.message,
      from_name: 'Congo Commerce',
    });
    return base44.entities.OrderNotification.update(record.id, {
      status: 'sent',
      channel: 'email',
      provider: 'email',
      sent_at: new Date().toISOString(),
      attempts,
      error: '',
    });
  } catch (error) {
    return base44.entities.OrderNotification.update(record.id, {
      status: 'failed',
      channel: 'email',
      attempts,
      error: String(error?.message || error).slice(0, 500),
    });
  }
}

/**
 * Records and delivers the update for one milestone.
 * Pass `event` for the purchase confirmation, or `status` for a delivery step.
 */
export async function notifyOrderStatus({ order, fulfillment = null, status = '', event = '' }) {
  const update = buildOrderUpdate({ order, fulfillment, status, event });
  if (!update) return null;

  const email = String(order.customer_email || '').trim();
  const phone = String(order.customer_phone || '').trim();

  try {
    // The customer's in-app feed stays in step with every channel.
    await base44.entities.Notification.create({
      tenant_id: String(order.tenant_id || ''),
      tenant_owner_email: String(order.tenant_owner_email || ''),
      title: update.subject,
      message: update.message,
      type: 'order',
      audience: 'customer',
      order_number: order.order_number,
    }).catch(() => null);

    const base = {
      tenant_id: String(order.tenant_id || ''),
      tenant_owner_email: String(order.tenant_owner_email || ''),
      order_id: order.id,
      order_number: order.order_number,
      fulfillment_number: fulfillment?.fulfillment_number || '',
      event: update.event,
      label: update.label,
      customer_name: order.customer_name || '',
      customer_email: email,
      customer_phone: phone,
      subject: update.subject,
      message: update.message,
      attempts: 0,
    };

    if (!email && !phone) {
      return await base44.entities.OrderNotification.create({
        ...base,
        channel: 'email',
        status: 'skipped',
        error: 'Aucun contact client',
      });
    }

    if (email) {
      const queued = await base44.entities.OrderNotification.create({
        ...base,
        channel: 'email',
        provider: 'email',
        status: 'queued',
      });
      return await deliverEmail(queued);
    }

    return await base44.entities.OrderNotification.create({
      ...base,
      channel: 'whatsapp',
      provider: 'whatsapp',
      status: 'queued',
      error: 'Aucun e-mail client — à envoyer depuis le téléphone',
    });
  } catch (error) {
    return null;
  }
}

/** Same, but resolves the order from a fulfillment record. */
export async function notifyFulfillmentStatus(fulfillment, status) {
  if (!fulfillment?.order_id) return null;
  const order = await base44.entities.Order.get(fulfillment.order_id).catch(() => null);
  if (!order) return null;
  return notifyOrderStatus({ order, fulfillment, status });
}