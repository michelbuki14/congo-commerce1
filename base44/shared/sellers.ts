/**
 * Shared helpers for seller outreach: which plan a seller's tenant is on, how
 * to reach the seller, and the limited-time upgrade offer.
 */

const FREE_PLAN_CODES = ['STARTER', 'FREE'];
const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'];
const LIVE_TENANT_STATUSES = ['active', 'trial'];

export const UPGRADE_OFFER = {
  code: 'COMEBACK20',
  percent: 20,
  months: 3,
  valid_days: 7,
};

/** A seller is on a paid plan when a live subscription (or an active tenant) holds a non-free plan code. */
export function sellerTier(subscription, tenant) {
  const planCode = String(subscription?.plan_code || tenant?.plan_code || 'STARTER').toUpperCase();
  const live = subscription
    ? LIVE_SUBSCRIPTION_STATUSES.includes(String(subscription.status || '').toLowerCase())
    : LIVE_TENANT_STATUSES.includes(String(tenant?.status || '').toLowerCase());
  const free = !live || FREE_PLAN_CODES.includes(planCode);
  return { plan_code: planCode, paid: !free, tier: free ? 'free' : 'active_plan' };
}

export function sellerEmail(seller) {
  return String(seller?.email || seller?.tenant_owner_email || '').trim();
}

export function daysSince(date) {
  const time = new Date(date || 0).getTime();
  return time ? Math.floor((Date.now() - time) / 86400000) : 0;
}

/** Loads tenants and subscriptions once, so each seller's plan resolves without its own queries. */
export async function loadPlanContext(base44) {
  const [tenants, subscriptions] = await Promise.all([
    base44.asServiceRole.entities.Tenant.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Subscription.list('-created_date', 500).catch(() => []),
  ]);
  const byId = (rows, key) => new Map(rows.map((r) => [key(r), r]).filter(([k]) => k));
  return {
    tenantById: byId(tenants, (t) => t.id),
    tenantByOwner: byId(tenants, (t) => String(t.owner_email || '').toLowerCase()),
    subscriptionByTenant: byId(subscriptions, (s) => s.tenant_id),
    subscriptionByOwner: byId(subscriptions, (s) => String(s.owner_email || '').toLowerCase()),
  };
}

export function sellerPlan(context, seller) {
  const owner = String(seller?.tenant_owner_email || seller?.email || '').toLowerCase();
  const tenant = (seller?.tenant_id && context.tenantById.get(seller.tenant_id)) || context.tenantByOwner.get(owner) || null;
  const subscription = (tenant && context.subscriptionByTenant.get(tenant.id)) || context.subscriptionByOwner.get(owner) || null;
  return { tenant, subscription, ...sellerTier(subscription, tenant) };
}

/**
 * Sends one outreach e-mail, mirrors it into the seller's in-app feed and
 * records the contact so the weekly run never repeats itself.
 */
export async function sendSellerOutreach(base44, { seller, email, subject, message, html, action, type = 'system', details = {} }) {
  const notification = await base44.asServiceRole.entities.Notification.create({
    tenant_id: seller.tenant_id || '',
    tenant_owner_email: seller.tenant_owner_email || '',
    title: subject,
    message,
    type,
    audience: 'seller',
  }).catch(() => null);

  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject,
      html,
      text: message,
      from_name: 'Congo Commerce',
    });
    await base44.asServiceRole.entities.AuditLog.create({
      action,
      actor: 'system',
      entity: 'Seller',
      entity_id: seller.id,
      reference: seller.name || '',
      severity: 'info',
      details: { to: email, notification_id: notification?.id || '', ...details },
    });
    return { status: 'sent', to: email };
  } catch (error) {
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'seller.outreach_failed',
      actor: 'system',
      entity: 'Seller',
      entity_id: seller.id,
      reference: seller.name || '',
      severity: 'warning',
      details: { to: email, action, error: String(error?.message || error).slice(0, 300) },
    });
    return { status: 'failed', reason: String(error?.message || error).slice(0, 200) };
  }
}