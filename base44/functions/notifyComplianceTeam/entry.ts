import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { typeLabel } from '../../shared/dataRequests.ts';

/**
 * Step 2: once the requester confirmed their address, the compliance team is
 * told to process the request. The team then moves the request to "ready" —
 * which is what releases the automatic data report.
 */

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const requestId = String(body.request_id || '').trim();
    if (!requestId) return Response.json({ error: 'request_id is required' }, { status: 400 });

    const request = await base44.asServiceRole.entities.DataRequest.get(requestId).catch(() => null);
    if (!request) return Response.json({ error: 'DataRequest not found' }, { status: 404 });

    if (request.notified_compliance_at) {
      return Response.json({ skipped: true, reason: 'compliance team already notified' });
    }

    const reference = request.request_number || requestId;
    await base44.asServiceRole.entities.DataRequest.update(requestId, {
      notified_compliance_at: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.Notification.create({
      title: `Demande vérifiée à traiter — ${reference}`,
      message: `${request.name || 'Un demandeur'} (${request.email || request.phone || '—'}) a confirmé son adresse. Demande : ${typeLabel(request.type)}. Traitez-la puis passez le statut à « Prête à envoyer » pour déclencher l'envoi automatique du rapport de données.`,
      type: 'system',
      audience: 'admin',
    });

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'privacy.compliance_notified',
      actor: 'system',
      entity: 'DataRequest',
      entity_id: requestId,
      reference,
      severity: 'info',
      details: { type: request.type, email: request.email || '' },
    });

    return Response.json({ notified: true, reference });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}