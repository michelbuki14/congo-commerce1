import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { escapeHtml, pageUrl } from '../../shared/app.ts';
import { daysSince, loadPlanContext, sellerEmail, sellerPlan, sendSellerOutreach } from '../../shared/sellers.ts';
import { requireAdmin } from '../../shared/security.ts';

/**
 * Check-in e-mail for inactive sellers whose tenant is on a paid plan — the
 * "active plan" branch of the weekly "Inactive Seller Outreach" workflow.
 */

const ACTION = 'seller.outreach_checkin';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.seller_ids) ? body.seller_ids.filter(Boolean) : [];
    if (!ids.length) return Response.json({ sent: 0, failed: 0, skipped: 0, results: [] });

    // Scheduled outreach, never a user-facing action: only the platform's own
    // workflow (or an administrator) may send marketing mail to sellers.
    const auth = await requireAdmin(base44);
    if (!auth.ok) return auth.response;

    const context = await loadPlanContext(base44);
    const dashboard = pageUrl('/seller');
    const help = pageUrl('/support');
    const results = [];

    for (const sellerId of ids) {
      const seller = await base44.asServiceRole.entities.Seller.get(sellerId).catch(() => null);
      const email = sellerEmail(seller);
      if (!seller || !email) {
        results.push({ seller_id: sellerId, status: 'skipped', reason: 'aucun e-mail de contact' });
        continue;
      }

      const latest = (await base44.asServiceRole.entities.FulfillmentOrder
        .filter({ seller_id: sellerId }, '-updated_date', 1)
        .catch(() => []))[0];
      const idle = daysSince(latest?.updated_date);
      const plan = sellerPlan(context, seller);
      const subject = `Comment se passe votre boutique, ${seller.name || 'vendeur'} ?`;
      const lines = [
        `Bonjour ${seller.owner_name || seller.name || ''},`.trim(),
        '',
        `Nous avons remarqué que votre boutique n'a pas enregistré de mouvement sur ses commandes depuis ${idle} jours. Tout va bien ?`,
        '',
        'Ce qui aide le plus nos vendeurs à repartir :',
        '• remettre en stock vos meilleures ventes ;',
        '• importer des articles de nos fournisseurs pour élargir le catalogue ;',
        '• lancer une promotion pour relancer les commandes.',
        '',
        `Reprendre sur votre boutique : ${dashboard}`,
        `Besoin d'un coup de main ? Écrivez-nous : ${help}`,
        '',
        "Nous sommes là pour vous aider à vendre.",
        "L'équipe Congo Commerce",
      ];
      const message = lines.join('\n');
      const html = `
        <div style="font-family:system-ui,-apple-system,sans-serif;color:#111;line-height:1.6">
          <p>Bonjour ${escapeHtml(seller.owner_name || seller.name || '')},</p>
          <p>Nous avons remarqué que votre boutique n'a pas enregistré de mouvement sur ses commandes depuis <strong>${idle} jours</strong>. Tout va bien ?</p>
          <p>Ce qui aide le plus nos vendeurs à repartir :</p>
          <ul style="padding-left:18px">
            <li>remettre en stock vos meilleures ventes ;</li>
            <li>importer des articles de nos fournisseurs pour élargir le catalogue ;</li>
            <li>lancer une promotion pour relancer les commandes.</li>
          </ul>
          <p><a href="${dashboard}">Reprendre sur votre boutique</a> — <a href="${help}">besoin d'un coup de main ?</a></p>
          <p style="font-size:13px;color:#555">Nous sommes là pour vous aider à vendre.<br/>L'équipe Congo Commerce</p>
        </div>
      `;

      results.push({
        seller_id: sellerId,
        ...(await sendSellerOutreach(base44, {
          seller,
          email,
          subject,
          message,
          html,
          action: ACTION,
          type: 'system',
          details: { days_inactive: idle, plan_code: plan.plan_code },
        })),
      });
    }

    return Response.json({
      sent: results.filter((r) => r.status === 'sent').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      results,
    });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}