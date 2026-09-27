import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import {
  buildCsv,
  dedupeById,
  escapeHtml,
  frenchDate,
  toBase64,
  typeLabel,
} from '../../shared/dataRequests.ts';

/**
 * Step 3: the compliance team moved the request to "ready", so the data report
 * goes out to the requester — a readable summary in the e-mail plus a CSV
 * attachment for portability.
 *
 * Everything is matched on the identifiers the person gave us (e-mail, phone),
 * never on a name alone.
 */

const LIMIT = 200;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const requestId = String(body.request_id || '').trim();
    if (!requestId) return Response.json({ error: 'request_id is required' }, { status: 400 });

    const service = base44.asServiceRole;
    const request = await service.entities.DataRequest.get(requestId).catch(() => null);
    if (!request) return Response.json({ error: 'DataRequest not found' }, { status: 404 });
    if (request.report_sent_at) return Response.json({ skipped: true, reason: 'report already sent' });

    // This report carries a person's whole purchase history, so an
    // administrator must ask for it. The platform's own lifecycle runs without
    // a session: it may only proceed once compliance has verified the requester
    // and marked the request ready to send — a state an outsider cannot reach,
    // because DataRequest updates are administrator-only.
    const caller = await base44.auth.me().catch(() => null);
    if (caller && String(caller.role || '') !== 'admin') {
      return Response.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
    }
    if (!caller && !(String(request.status || '') === 'ready' && request.verified_at)) {
      return Response.json({ error: 'Authentification requise' }, { status: 401 });
    }

    const reference = request.request_number || requestId;
    const email = String(request.email || '').trim();
    const phone = String(request.phone || '').trim();

    if (!email) {
      await service.entities.DataRequest.update(requestId, {
        email_status: 'skipped',
        email_error: 'Aucune adresse e-mail fournie',
      });
      return Response.json({ skipped: true, reason: 'no email address on the request' });
    }

    const [byEmail, byPhone, returns, disputes, requests] = await Promise.all([
      email ? service.entities.Order.filter({ customer_email: email }, '-created_date', LIMIT).catch(() => []) : [],
      phone ? service.entities.Order.filter({ customer_phone: phone }, '-created_date', LIMIT).catch(() => []) : [],
      phone ? service.entities.Return.filter({ customer_phone: phone }, '-created_date', LIMIT).catch(() => []) : [],
      phone ? service.entities.Dispute.filter({ customer_phone: phone }, '-created_date', LIMIT).catch(() => []) : [],
      email ? service.entities.DataRequest.filter({ email }, '-created_date', 50).catch(() => []) : [],
    ]);
    const orders = dedupeById([...byEmail, ...byPhone]);

    const rows = [
      ...orders.map((o) => ['Commande', o.order_number || '', frenchDate(o.created_date), `${o.status || ''} · ${(o.items || []).length} article(s)`, o.total_usd ?? '']),
      ...returns.map((r) => ['Retour', r.return_number || r.order_number || '', frenchDate(r.created_date), `${r.product_title || ''} — ${r.reason || ''} (${r.status || ''})`, r.refund_amount_usd ?? '']),
      ...disputes.map((d) => ['Litige', d.order_number || '', frenchDate(d.created_date), `${d.type || ''} (${d.status || ''})`, d.amount_usd ?? '']),
      ...requests.map((r) => ['Demande', r.request_number || '', frenchDate(r.created_date), `${typeLabel(r.type)} (${r.status || ''})`, '']),
    ];
    const csv = buildCsv(['type', 'reference', 'date', 'details', 'montant_usd'], rows);

    const list = (items, render) =>
      items.length
        ? `<ul style="margin:6px 0 16px;padding-left:18px">${items.map((item) => `<li>${render(item)}</li>`).join('')}</ul>`
        : '<p style="margin:6px 0 16px;color:#666;font-size:13px">Aucune donnée.</p>';

    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;color:#111;line-height:1.6">
        <p>Bonjour ${escapeHtml(request.name || '')},</p>
        <p>Voici le rapport des données personnelles que nous détenons à votre sujet, en réponse à votre demande
          <strong>${escapeHtml(reference)}</strong> (${escapeHtml(typeLabel(request.type))}).</p>
        <h2 style="font-size:15px;margin-top:20px">Vos commandes (${orders.length})</h2>
        ${list(orders, (o) => `${escapeHtml(o.order_number || '')} — ${escapeHtml(frenchDate(o.created_date))} — ${escapeHtml(o.status || '')} — ${escapeHtml(o.total_usd ?? 0)} USD`)}
        <h2 style="font-size:15px">Vos demandes de retour (${returns.length})</h2>
        ${list(returns, (r) => `${escapeHtml(r.return_number || r.order_number || '')} — ${escapeHtml(r.product_title || '')} — ${escapeHtml(r.status || '')}`)}
        <h2 style="font-size:15px">Vos litiges (${disputes.length})</h2>
        ${list(disputes, (d) => `${escapeHtml(d.order_number || '')} — ${escapeHtml(d.type || '')} — ${escapeHtml(d.status || '')}`)}
        <h2 style="font-size:15px">Vos demandes relatives aux données (${requests.length})</h2>
        ${list(requests, (r) => `${escapeHtml(r.request_number || '')} — ${escapeHtml(typeLabel(r.type))} — ${escapeHtml(r.status || '')}`)}
        <p style="font-size:13px;color:#555">Le fichier CSV joint reprend ces lignes sous forme exploitable.</p>
        <p style="font-size:13px;color:#555">L'équipe conformité — Congo Commerce</p>
      </div>
    `;

    const text = [
      `Bonjour ${request.name || ''},`.trim(),
      '',
      `Voici le rapport des données personnelles que nous détenons à votre sujet (demande ${reference}).`,
      '',
      `Commandes : ${orders.length}`,
      `Demandes de retour : ${returns.length}`,
      `Litiges : ${disputes.length}`,
      `Demandes relatives aux données : ${requests.length}`,
      '',
      'Le fichier CSV joint reprend ces lignes sous forme exploitable.',
      '',
      "L'équipe conformité — Congo Commerce",
    ].join('\n');

    const filename = `rapport-donnees-${String(reference).replace(/[^A-Za-z0-9-]/g, '')}.csv`;

    try {
      await service.integrations.Core.SendEmail({
        to: email,
        subject: `Votre rapport de données — ${reference}`,
        html,
        text,
        from_name: 'Congo Commerce',
        attachments: [{ filename, content: toBase64(csv) }],
      });
      await service.entities.DataRequest.update(requestId, {
        status: 'completed',
        report_sent_at: new Date().toISOString(),
        email_status: 'sent',
        email_error: '',
      });
    } catch (error) {
      await service.entities.DataRequest.update(requestId, {
        email_status: 'failed',
        email_error: String(error?.message || error).slice(0, 500),
      });
      await service.entities.AuditLog.create({
        action: 'privacy.report_failed',
        actor: 'system',
        entity: 'DataRequest',
        entity_id: requestId,
        reference,
        severity: 'warning',
        details: { error: String(error?.message || error).slice(0, 300) },
      });
      return Response.json({ sent: false, reason: 'email refused', rows: rows.length });
    }

    await service.entities.AuditLog.create({
      action: 'privacy.report_sent',
      actor: 'system',
      entity: 'DataRequest',
      entity_id: requestId,
      reference,
      severity: 'info',
      details: { rows: rows.length, to: email },
    });

    return Response.json({ sent: true, reference, to: email, rows: rows.length });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}