import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { pageUrl } from '../../shared/app.ts';
import { UPGRADE_OFFER, daysSince, loadPlanContext, sellerEmail, sellerPlan, sendSellerOutreach } from '../../shared/sellers.ts';

/**
 * Limited-time upgrade offer for inactive sellers on a free plan — the "free
 * tier" branch of the weekly "Inactive Seller Outreach" workflow.
 */

const ACTION = 'seller.outreach_upgrade';

function frenchDate(date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.seller_ids) ? body.seller_ids.filter(Boolean) : [];
    if (!ids.length) return Response.json({ sent: 0, failed: 0, skipped: 0, results: [] });

    const context = await loadPlanContext(base44);
    const pricing = pageUrl('/pricing');
    const expiresAt = new Date(Date.now() + UPGRADE_OFFER.valid_days * 86400000);
    const deadline = frenchDate(expiresAt);
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
      const subject = `${seller.name || 'Votre boutique'} — ${UPGRADE_OFFER.percent} % de réduction pour relancer vos ventes`;
      const lines = [
        `Bonjour ${seller.owner_name || seller.name || ''},`.trim(),
        '',
        `Votre boutique n'a pas enregistré de mouvement sur ses commandes depuis ${idle} jours. Pour vous aider à repartir, nous vous offrons ${UPGRADE_OFFER.percent} % de réduction sur les ${UPGRADE_OFFER.months} premiers mois d'un plan payant.`,
        '',
        `Votre code : ${UPGRADE_OFFER.code}`,
        `Offre valable ${UPGRADE_OFFER.valid_days} jours, jusqu'au ${deadline}.`,
        '',
        "Un plan payant débloque plus d'articles, plusieurs boutiques, l'import fournisseur et le programme créateurs.",
        '',
        `Choisir votre plan : ${pricing}`,
        `Indiquez le code ${UPGRADE_OFFER.code} lors de votre passage à un plan payant.`,
        '',
        "L'équipe Congo Commerce",
      ];
      const message = lines.join('\n');
      const html = `
        <div style="font-family:system-ui,-apple-system,sans-serif;color:#111;line-height:1.6">
          <p>Bonjour ${seller.owner_name || seller.name || ''},</p>
          <p>Votre boutique n'a pas enregistré de mouvement sur ses commandes depuis <strong>${idle} jours</strong>. Pour vous aider à repartir, nous vous offrons <strong>${UPGRADE_OFFER.percent} % de réduction</strong> sur les ${UPGRADE_OFFER.months} premiers mois d'un plan payant.</p>
          <p>Votre code : <strong style="font-size:18px">${UPGRADE_OFFER.code}</strong><br/>
          Offre valable ${UPGRADE_OFFER.valid_days} jours, jusqu'au ${deadline}.</p>
          <p>Un plan payant débloque plus d'articles, plusieurs boutiques, l'import fournisseur et le programme créateurs.</p>
          <p><a href="${pricing}">Choisir votre plan</a> — indiquez le code ${UPGRADE_OFFER.code} lors de votre passage à un plan payant.</p>
          <p style="font-size:13px;color:#555">L'équipe Congo Commerce</p>
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
          type: 'promo',
          details: {
            days_inactive: idle,
            plan_code: plan.plan_code,
            offer_code: UPGRADE_OFFER.code,
            offer_percent: UPGRADE_OFFER.percent,
            offer_expires_at: expiresAt.toISOString(),
          },
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