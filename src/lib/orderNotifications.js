import { base44 } from '@/api/base44Client';
import { buildOrderUpdate } from './orderMessages';

/** Marks a parked message as delivered by hand (phone channel).
 *  Accepts an optional Base44 client so server functions can pass the
 *  asServiceRole / db client instead of the browser client. */
export async function markNotificationSent(client, record, channel = 'whatsapp') {
  const db = client || base44;
  return db.entities.OrderNotification.update(record.id, {
    status: 'sent',
    channel,
    provider: channel,
    sent_at: new Date().toISOString(),
    attempts: (Number(record.attempts) || 0) + 1,
    error: '',
  });
}

/** Sends (or retries) the stored message by email.
 *  Accepts an optional Base44 client.
 *  The send itself happens on the server, which reads the recipient and the
 *  text from the record the app already stored — the browser never chooses who
 *  is written to. */
export async function deliverEmail(client, record) {
  const db = client || base44;
  const response = await db.functions.invoke('sendOrderNotificationEmail', { notification_id: record.id });
  const result = response?.data || {};
  if (result.notification) return result.notification;
  return db.entities.OrderNotification.get(record.id).catch(() => record);
}

/** Records and delivers the update for one milestone.
 *  Pass `event` for the purchase confirmation, or `status` for a delivery step.
 *  Accepts an optional Base44 client. */
export async function notifyOrderStatus(client, { order, fulfillment = null, status = '', event = '' }) {
  const db = client || base44;
  const update = buildOrderUpdate({ order, fulfillment, status, event });
  if (!update) return null;

  const email = String(order.customer_email || '').trim();
  const phone = String(order.customer_phone || '').trim();

  try {
    // The customer's in-app feed stays in step with every channel.
    await db.entities.Notification.create({
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
      return await db.entities.OrderNotification.create({
        ...base,
        channel: 'email',
        status: 'skipped',
        error: 'Aucun contact client',
      });
    }

    if (email) {
      const queued = await db.entities.OrderNotification.create({
        ...base,
        channel: 'email',
        provider: 'email',
        status: 'queued',
      });
      return await deliverEmail(db, queued);
    }

    return await db.entities.OrderNotification.create({
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

/** Same, but resolves the order from a fulfillment record.
 *  Accepts an optional Base44 client. */
export async function notifyFulfillmentStatus(client, fulfillment, status) {
  const db = client || base44;
  if (!fulfillment?.order_id) return null;
  const order = await db.entities.Order.get(fulfillment.order_id).catch(() => null);
  if (!order) return null;
  return notifyOrderStatus(db, { order, fulfillment, status });
}

// ── Read-only helpers kept at module level (no client needed) ──

/** WhatsApp link for a parked message. */
export function whatsAppHref(record) {
  const phone = waPhone(record?.customer_phone);
  if (!phone) return '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(record.message || '')}`;
}

/** SMS link for a parked message. */
export function smsHref(record) {
  const phone = String(record?.customer_phone || '').trim();
  if (!phone) return '';
  return `sms:${phone}?body=${encodeURIComponent(record.message || '')}`;
}

function waPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('243')) return digits;
  if (digits.startsWith('0')) return `243${digits.slice(1)}`;
  if (digits.length <= 9) return `243${digits}`;
  return digits;
}
