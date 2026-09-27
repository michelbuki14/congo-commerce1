import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { daysSince, loadPlanContext, sellerEmail, sellerPlan } from '../../shared/sellers.ts';
import { requireAdmin } from '../../shared/security.ts';

/**
 * Weekly scan behind the "Inactive Seller Outreach" workflow: sellers whose
 * fulfillment orders have not been touched for 30 days, split by the plan their
 * tenant is on so the workflow can branch. Sellers already contacted in the
 * last 30 days are left out, so the weekly run never repeats itself.
 */

const INACTIVE_DAYS = 30;
const RECONTACT_DAYS = 30;
const SCAN_LIMIT = 500;
const ACTIONS = { active_plan: 'seller.outreach_checkin', free: 'seller.outreach_upgrade' };

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Returns sellers' names and e-mail addresses, so it answers only the
    // weekly outreach workflow (or an administrator).
    const auth = await requireAdmin(base44);
    if (!auth.ok) return auth.response;

    const requested = Number(body.inactive_days);
    const days = Number.isFinite(requested) && requested >= 0 ? requested : INACTIVE_DAYS;
    const cutoffTime = Date.now() - days * 86400000;
    const cutoff = new Date(cutoffTime).toISOString();

    // Every seller with a fulfillment order left untouched since the cutoff.
    const stale = await base44.asServiceRole.entities.FulfillmentOrder
      .filter({ updated_date: { $lt: cutoff } }, '-updated_date', SCAN_LIMIT)
      .catch(() => []);
    const candidates = [...new Set(stale.map((f) => f.seller_id).filter(Boolean))];

    const [context, checkins, offers] = await Promise.all([
      loadPlanContext(base44),
      base44.asServiceRole.entities.AuditLog.filter({ action: ACTIONS.active_plan }, '-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.AuditLog.filter({ action: ACTIONS.free }, '-created_date', 200).catch(() => []),
    ]);
    const recentlyContacted = new Set(
      [...checkins, ...offers].filter((log) => daysSince(log.created_date) < RECONTACT_DAYS).map((log) => log.entity_id),
    );

    const paid = [];
    const free = [];
    for (const sellerId of candidates) {
      const latest = (await base44.asServiceRole.entities.FulfillmentOrder
        .filter({ seller_id: sellerId }, '-updated_date', 1)
        .catch(() => []))[0];
      if (!latest) continue;
      if (new Date(latest.updated_date || 0).getTime() >= cutoffTime) continue; // active again
      if (recentlyContacted.has(sellerId)) continue;

      const seller = await base44.asServiceRole.entities.Seller.get(sellerId).catch(() => null);
      if (!seller || seller.status === 'suspended') continue;
      const email = sellerEmail(seller);
      if (!email) continue;

      const plan = sellerPlan(context, seller);
      (plan.paid ? paid : free).push({
        seller_id: seller.id,
        seller_name: seller.name || '',
        email,
        days_inactive: daysSince(latest.updated_date),
        plan_code: plan.plan_code,
      });
    }

    return Response.json({
      checked_at: new Date().toISOString(),
      inactive_days: days,
      paid,
      free,
      paid_ids: paid.map((s) => s.seller_id),
      free_ids: free.map((s) => s.seller_id),
    });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}