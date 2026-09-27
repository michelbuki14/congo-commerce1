import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { escapeHtml, typeLabel, verificationUrl } from '../../shared/dataRequests.ts';
import { requireAdmin } from '../../shared/security.ts';

/**
 * Step 1 of the data-request lifecycle: sends the confirmation email that
 * proves the requester owns the address on the request.
 *
 * The verification link is never returned in the response — only the person
 * reading that inbox receives it.
 */

const RESEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_ADDRESS_PER_HOUR = 3;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const requestId = String(body.request_id || '').trim();
    if (!requestId) return Response.json({ error: 'request_id is required' }, { status: 400 });

    const request = await base44.asServiceRole.entities.DataRequest.get(requestId).catch(() => null);
    if (!request) return Response.json({ error: 'DataRequest not found' }, { status: 404 });

    // Only the request lifecycle itself (a platform workflow) and an
    // administrator may trigger an outgoing verification e-mail.
    const auth = await requireAdmin(base44);
    if (!auth.ok) {
      await base44.asServiceRole.entities.DataRequest.update(requestId, {
        email_status: 'skipped',
        email_error: `Envoi refusé — appel non autorisé (${auth.status})`,
      }).catch(() => null);
      return auth.response;
    }

    const email = String(request.email || '').trim();
    if (!email) {
      await base44.asServiceRole.entities.DataRequest.update(requestId, {
        email_status: 'skipped',
        email_error: 'Aucune adresse e-mail fournie',
      });
      return Response.json({ skipped: true, reason: 'no email address on the request' });
    }

    if (request.verified_at) return Response.json({ skipped: true, reason: 'already verified' });

    const lastSent = request.verification_sent_at ? new Date(request.verification_sent_at).getTime() : 0;
    if (lastSent && Date.now() - lastSent < RESEND_WINDOW_MS) {
      return Response.json({ skipped: true, reason: 'verification email already sent recently' });
    }

    // The window above is per request; a recipient must also be protected
    // across requests, so a new request cannot be used to flood one inbox.
    const sameAddress = await base44.asServiceRole.entities.DataRequest
      .filter({ email }, '-created_date', 20)
      .catch(() => []);
    const hourAgo = Date.now() - 3600000;
    const sentThisHour = sameAddress.filter(
      (row) => row.verification_sent_at && new Date(row.verification_sent_at).getTime() > hourAgo,
    ).length;
    if (sentThisHour >= MAX_PER_ADDRESS_PER_HOUR) {
      return Response.json({ skipped: true, reason: 'too many verification emails to this address' });
    }

    const token = request.verification_token || crypto.randomUUID();
    const link = verificationUrl(token);
    const label = typeLabel(request.type);
    const reference = request.request_number || requestId;

    await base44.asServiceRole.entities.DataRequest.update(requestId, {
      verification_token: token,
      verification_sent_at: new Date().toISOString(),
      status: 'verification_sent',
    });

    const text = [
      `Bonjour ${request.name || ''},`.trim(),
      '',
      `Nous avons bien reçu votre demande ${reference} — ${label}.`,
      '',
      'Pour confirmer que cette adresse e-mail est bien la vôtre, ouvrez ce lien :',
      link,
      '',
      'Sans cette confirmation, nous ne pouvons pas traiter votre demande.',
      'Nous répondons dans un délai maximum de trente (30) jours après vérification.',
      '',
      "L'équipe conformité — Congo Commerce",
    ].join('\n');

    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;color:#111;line-height:1.6">
        <p>Bonjour ${escapeHtml(request.name || '')},</p>
        <p>Nous avons bien reçu votre demande <strong>${escapeHtml(reference)}</strong> — ${escapeHtml(label)}.</p>
        <p>Pour confirmer que cette adresse e-mail est bien la vôtre, cliquez sur le bouton ci-dessous :</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#111;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">
            Vérifier mon adresse
          </a>
        </p>
        <p style="font-size:13px;color:#555">Sans cette confirmation, nous ne pouvons pas traiter votre demande. Nous répondons dans un délai maximum de trente (30) jours après vérification.</p>
        <p style="font-size:13px;color:#555">L'équipe conformité — Congo Commerce</p>
      </div>
    `;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `Vérifiez votre demande relative aux données — ${reference}`,
        html,
        text,
        from_name: 'Congo Commerce',
      });
      await base44.asServiceRole.entities.DataRequest.update(requestId, { email_status: 'sent', email_error: '' });
    } catch (error) {
      // A refused send must not lose the request — the team can still reach the person by phone.
      await base44.asServiceRole.entities.DataRequest.update(requestId, {
        email_status: 'failed',
        email_error: String(error?.message || error).slice(0, 500),
      });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'privacy.verification_sent',
      actor: 'system',
      entity: 'DataRequest',
      entity_id: requestId,
      reference,
      severity: 'info',
      details: { email },
    });

    return Response.json({ sent: true, reference, to: email });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}