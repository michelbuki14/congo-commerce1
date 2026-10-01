/**
 * WORKFLOW SUPPORT — the primitives every workflow step is built from:
 * notifications, audit entries, domain events, analytics and the plan/role
 * catalogues. Shared by the engine and the workflow definitions so both write
 * through exactly the same channels as the rest of the platform.
 */

export const ROLE_PERMISSIONS = {
  TENANT_ADMIN: ['*'],
  FINANCE_ADMIN: ['billing.read', 'billing.write', 'wallet.read', 'payouts.read', 'payouts.write'],
  SUPPORT: ['orders.read', 'tickets.read', 'tickets.write', 'returns.read', 'disputes.read'],
  SELLER: ['products.read', 'products.write', 'orders.read', 'wallet.read'],
  CREATOR: ['content.read', 'content.write', 'commissions.read'],
  COURIER: ['shipments.read', 'shipments.write'],
};

/**
 * Fallback plan catalogue, mirroring src/lib/plans.js. The `Plan` entity is
 * authoritative — this is only used when a workspace has not seeded its plans.
 */
export const PLAN_FALLBACK = [
  { code: 'STARTER', name: 'Starter', price_monthly_usd: 0, price_yearly_usd: 0, trial_days: 14, product_limit: 50, store_limit: 1, seller_limit: 1, member_limit: 2, commission_rate: 12, features: ['storefront'] },
  { code: 'GROWTH', name: 'Growth', price_monthly_usd: 19, price_yearly_usd: 190, trial_days: 14, product_limit: 500, store_limit: 2, seller_limit: 5, member_limit: 5, commission_rate: 8, features: ['storefront', 'team_roles', 'supplier_import', 'creator_program', 'advanced_analytics'] },
  { code: 'BUSINESS', name: 'Business', price_monthly_usd: 59, price_yearly_usd: 590, trial_days: 14, product_limit: 5000, store_limit: 10, seller_limit: 50, member_limit: 25, commission_rate: 5, features: ['storefront', 'multi_store', 'custom_domain', 'team_roles', 'supplier_import', 'creator_program', 'advanced_analytics'] },
  { code: 'ENTERPRISE', name: 'Enterprise', price_monthly_usd: 0, price_yearly_usd: 0, trial_days: 30, product_limit: 100000, store_limit: 100, seller_limit: 1000, member_limit: 500, commission_rate: 3, features: ['storefront', 'multi_store', 'custom_domain', 'team_roles', 'supplier_import', 'creator_program', 'advanced_analytics', 'api_access', 'priority_support'] },
];

export const GRACE_DAYS = 7;
export const VAT_RATE = 16;

export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function planFallback(code) {
  const key = String(code || 'STARTER').toUpperCase();
  return PLAN_FALLBACK.find((p) => p.code === key) || PLAN_FALLBACK[0];
}

/** The plan row when the workspace seeded its catalogue, the fallback otherwise. */
export async function resolvePlan(base44, code) {
  const key = String(code || 'STARTER').toUpperCase();
  const rows = await base44.asServiceRole.entities.Plan.filter({ code: key }).catch(() => []);
  return rows[0] || planFallback(key);
}

export function planAmount(plan, cycle) {
  return round2(cycle === 'yearly' ? plan.price_yearly_usd : plan.price_monthly_usd);
}

export function executionNumber(code) {
  return `${String(code || 'WF').slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export function newEventId() {
  return `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function daysBetween(from, to = new Date()) {
  const start = new Date(from || 0).getTime();
  if (!start) return 0;
  return Math.floor((to.getTime() - start) / 86400000);
}

/**
 * The notification channel: an in-app notification for the right audience, and
 * an email when an address and a subject are supplied. Email is best-effort —
 * a refused send never fails the workflow that produced it.
 */
export async function notify(base44, options = {}) {
  const notification = await base44.asServiceRole.entities.Notification.create({
    tenant_id: options.tenantId || '',
    tenant_owner_email: options.tenantOwnerEmail || '',
    title: String(options.title || 'Notification').slice(0, 200),
    message: String(options.message || '').slice(0, 1000),
    type: options.type || 'system',
    audience: options.audience || 'admin',
    order_number: options.reference || '',
  }).catch(() => null);

  let email = 'skipped';
  if (options.email && options.email.to) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: options.email.to,
        subject: options.email.subject || options.title || 'Congo Commerce',
        text: options.email.text || options.message || '',
        html: options.email.html || undefined,
        from_name: options.email.fromName || 'Congo Commerce',
      });
      email = 'sent';
    } catch (error) {
      email = `failed:${String(error?.message || error).slice(0, 120)}`;
    }
  }

  return { notification_id: notification?.id || '', email };
}

export async function recordAudit(base44, options = {}) {
  return base44.asServiceRole.entities.AuditLog.create({
    action: options.action || 'workflow.step',
    actor: options.actor || 'system',
    entity: options.entity || 'WorkflowExecution',
    entity_id: options.entityId || '',
    reference: options.reference || '',
    severity: options.severity || 'info',
    details: options.details || {},
  }).catch(() => null);
}

export async function recordAnalytics(base44, options = {}) {
  return base44.asServiceRole.entities.AnalyticsEvent.create({
    name: options.name,
    session_id: options.sessionId || '',
    product_id: options.productId || '',
    path: options.path || '',
    value_usd: round2(options.valueUsd),
    description: options.description || '',
  }).catch(() => null);
}

export async function recordUsage(base44, options = {}) {
  return base44.asServiceRole.entities.TenantUsageEvent.create({
    tenant_id: options.tenantId || 'platform',
    name: options.name,
    path: '',
    quantity: options.quantity || 1,
    value_usd: round2(options.valueUsd),
    description: options.description || '',
    metadata: options.metadata || {},
  }).catch(() => null);
}

/** Ledger entry guarded by an idempotency key — the same credit can never post twice. */
export async function findLedgerEntry(base44, idempotencyKey) {
  if (!idempotencyKey) return null;
  const rows = await base44.asServiceRole.entities.WalletTransaction
    .filter({ idempotency_key: idempotencyKey })
    .catch(() => []);
  return rows[0] || null;
}

export async function postLedger(base44, options = {}) {
  const existing = await findLedgerEntry(base44, options.idempotencyKey);
  if (existing) return { posted: false, duplicate: true, transaction: existing };

  const wallet = options.wallet;
  const amount = round2(options.amountUsd);
  const direction = options.direction === 'debit' ? 'debit' : 'credit';
  const balance = round2((wallet.balance_usd || 0) + (direction === 'credit' ? amount : -amount));

  const updated = await base44.asServiceRole.entities.Wallet.update(wallet.id, {
    balance_usd: balance,
    lifetime_credit_usd: round2((wallet.lifetime_credit_usd || 0) + (direction === 'credit' ? amount : 0)),
    lifetime_debit_usd: round2((wallet.lifetime_debit_usd || 0) + (direction === 'debit' ? amount : 0)),
  });

  const transaction = await base44.asServiceRole.entities.WalletTransaction.create({
    tenant_id: wallet.tenant_id || '',
    tenant_owner_email: wallet.tenant_owner_email || '',
    wallet_id: wallet.id,
    owner_type: wallet.owner_type,
    owner_name: wallet.owner_name,
    owner_email: wallet.owner_email || '',
    type: options.type || 'CREDIT',
    direction,
    amount_usd: amount,
    balance_after_usd: balance,
    currency: 'USD',
    description: options.description || '',
    reference: options.reference || '',
    order_id: options.orderId || '',
    order_number: options.orderNumber || '',
    idempotency_key: options.idempotencyKey || '',
    status: 'posted',
  });

  return { posted: true, duplicate: false, wallet: updated, transaction };
}

/** The wallet of an owner, created on first need. */
export async function ensureWallet(base44, options = {}) {
  const ownerType = options.ownerType || 'customer';
  const ownerId = options.ownerId || '';
  const ownerEmail = String(options.ownerEmail || '').toLowerCase();
  const ownerName = options.ownerName || 'Client';

  const byId = ownerId
    ? await base44.asServiceRole.entities.Wallet.filter({ owner_type: ownerType, owner_id: ownerId }).catch(() => [])
    : [];
  if (byId[0]) return { wallet: byId[0], created: false };

  const byEmail = ownerEmail
    ? await base44.asServiceRole.entities.Wallet.filter({ owner_type: ownerType, owner_email: ownerEmail }).catch(() => [])
    : [];
  if (byEmail[0]) return { wallet: byEmail[0], created: false };

  const wallet = await base44.asServiceRole.entities.Wallet.create({
    tenant_id: options.tenantId || '',
    tenant_owner_email: options.tenantOwnerEmail || '',
    owner_type: ownerType,
    owner_id: ownerId,
    owner_name: ownerName,
    owner_email: ownerEmail,
    balance_usd: 0,
    balance_cdf: 0,
    pending_usd: 0,
    currency: 'USD',
    status: 'active',
  });
  return { wallet, created: true };
}

// ---------------------------------------------------------------------------
// Shared step helpers
// ---------------------------------------------------------------------------
export const iso = (date) => new Date(date).toISOString();

export const addDays = (date, days) => new Date(new Date(date).getTime() + days * 86400000);

/** Opens a support ticket for a case a human must handle. */
export async function openTicket(base44, options = {}) {
  return base44.asServiceRole.entities.SupportTicket.create({
    tenant_id: options.tenantId || '',
    tenant_owner_email: options.tenantOwnerEmail || '',
    ticket_number: `WF-${Date.now().toString(36).toUpperCase()}`,
    subject: String(options.subject || 'Dossier workflow').slice(0, 200),
    category: options.category || 'other',
    priority: options.priority || 'high',
    status: 'open',
    customer_name: options.customerName || '',
    customer_email: options.customerEmail || '',
    order_number: options.reference || '',
    description: String(options.description || '').slice(0, 1000),
  });
}

/** Is there an unresolved dispute or return on this order? */
export async function hasOpenCase(base44, orderNumber) {
  const [disputes, returns] = await Promise.all([
    base44.asServiceRole.entities.Dispute.filter({ order_number: orderNumber }).catch(() => []),
    base44.asServiceRole.entities.Return.filter({ order_number: orderNumber }).catch(() => []),
  ]);
  const openDispute = disputes.some((d) => ['open', 'investigating', 'escalated'].includes(String(d.status)));
  const openReturn = returns.some((r) =>
    ['requested', 'under_review', 'approved', 'return_in_transit'].includes(String(r.status)),
  );
  return { openDispute, openReturn, open: openDispute || openReturn };
}