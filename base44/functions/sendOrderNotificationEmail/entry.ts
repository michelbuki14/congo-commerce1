import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * Sends (or retries) ONE order message that the app has already recorded in its
 * notification ledger.
 *
 * The caller can only name a message that exists: the recipient and the text
 * come from the stored record, never from the request — so this can never be
 * turned into an open relay that mails arbitrary addresses, and it is the same
 * call for the customer's purchase confirmation and for the team's manual
 * retry from the outbox.
 */

const MAX_ATTEMPTS = 5;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const id = String(body.notification_id || '').trim();
    if (!id) return Response.json({ error: 'notification_id is required' }, { status: 400 });

    const service = base44.asServiceRole;
    const record = await service.entities.OrderNotification.get(id).catch(() => null);
    if (!record) return Response.json({ error: 'Notification introuvable' }, { status: 404 });

    if (String(record.status || '') === 'sent') {
      return Response.json({ sent: true, skipped: true, reason: 'already sent', notification: record });
    }

    const to = String(record.customer_email || '').trim();
    const attempts = (Number(record.attempts) || 0) + 1;

    if (!to) {
      const skipped = await service.entities.OrderNotification.update(id, {
        status: 'skipped',
        error: 'Aucun e-mail client',
      });
      return Response.json({ sent: false, skipped: true, reason: 'no customer email', notification: skipped });
    }

    if (attempts > MAX_ATTEMPTS) {
      return Response.json({ sent: false, skipped: true, reason: 'attempt ceiling reached', notification: record });
    }

    try {
      await service.integrations.Core.SendEmail({
        to,
        subject: record.subject || 'Votre commande Congo Commerce',
        body: record.message || '',
        from_name: 'Congo Commerce',
      });
      const updated = await service.entities.OrderNotification.update(id, {
        status: 'sent',
        channel: 'email',
        provider: 'email',
        sent_at: new Date().toISOString(),
        attempts,
        error: '',
      });
      return Response.json({ sent: true, notification: updated });
    } catch (error) {
      const updated = await service.entities.OrderNotification.update(id, {
        status: 'failed',
        channel: 'email',
        attempts,
        error: String(error?.message || error).slice(0, 500),
      });
      return Response.json({ sent: false, reason: 'email refused', notification: updated });
    }
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}