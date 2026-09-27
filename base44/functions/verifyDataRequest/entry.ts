import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * Target of the verification link in the confirmation email.
 * The single-use token in the query string is the caller's credential.
 * Marking the request "verified" is what hands it to the compliance team.
 */

function page(status, title, message) {
  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} — Congo Commerce</title>
  </head>
  <body style="margin:0;background:#fafafa;font-family:system-ui,-apple-system,sans-serif;color:#111">
    <main style="max-width:520px;margin:0 auto;padding:48px 20px">
      <p style="font-weight:800;letter-spacing:.04em;text-transform:uppercase;font-size:13px;color:#111">Congo Commerce</p>
      <div style="background:#fff;border:1px solid #e5e5e5;border-radius:18px;padding:24px;margin-top:16px">
        <h1 style="margin:0 0 8px;font-size:19px">${title}</h1>
        <p style="margin:0;color:#555;font-size:14px;line-height:1.6">${message}</p>
      </div>
    </main>
  </body>
</html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const token = String(new URL(req.url).searchParams.get('token') || '').trim();
    if (!token) {
      return page(400, 'Lien incomplet', "Ce lien ne contient pas de jeton de vérification. Ouvrez le lien reçu par e-mail.");
    }

    const rows = await base44.asServiceRole.entities.DataRequest.filter({ verification_token: token }).catch(() => []);
    const request = rows[0];
    if (!request) {
      return page(404, 'Lien invalide', "Ce lien n'est rattaché à aucune demande. Il a peut-être été remplacé par un envoi plus récent.");
    }

    if (request.verified_at) {
      return page(200, 'Demande déjà vérifiée', 'Votre adresse est déjà confirmée. Notre équipe conformité traite votre demande.');
    }

    await base44.asServiceRole.entities.DataRequest.update(request.id, {
      status: 'verified',
      verified_at: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'privacy.request_verified',
      actor: 'requester',
      entity: 'DataRequest',
      entity_id: request.id,
      reference: request.request_number || request.id,
      severity: 'info',
      details: { email: request.email || '' },
    });

    return page(
      200,
      'Adresse vérifiée',
      `Merci. Votre demande ${request.request_number || ''} est confirmée et transmise à notre équipe conformité, qui la traite dans un délai maximum de trente (30) jours.`,
    );
  } catch (error) {
    return page(500, 'Erreur', `La vérification a échoué : ${String(error?.message || error)}`);
  }
}