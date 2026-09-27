import { base44 } from '@/api/base44Client';
import { round2 } from './format';
import { planAmount } from './plans';

/**
 * SaaS billing engine: subscription lifecycle, period arithmetic and invoice
 * issuance. Every amount comes from the plan record — never from a constant.
 */

export const BILLING_CYCLES = [
  { id: 'monthly', label: 'Mensuel', months: 1 },
  { id: 'yearly', label: 'Annuel', months: 12 },
];

export const SUBSCRIPTION_STATUS = {
  trialing: 'Essai',
  active: 'Actif',
  past_due: 'Impayé',
  cancelled: 'Annulé',
  expired: 'Expiré',
};

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

export function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Number(months || 0));
  return d;
}

export function cycleMonths(cycle) {
  return BILLING_CYCLES.find((c) => c.id === cycle)?.months || 1;
}

export function periodEnd(start, cycle) {
  return addMonths(start, cycleMonths(cycle)).toISOString();
}

export function isTrialActive(subscription) {
  return subscription?.status === 'trialing' && subscription?.trial_end && new Date(subscription.trial_end) > new Date();
}

export function subscriptionState(subscription) {
  if (!subscription) return 'none';
  if (isTrialActive(subscription)) return 'trialing';
  if (subscription.status === 'active' && subscription.current_period_end && new Date(subscription.current_period_end) < new Date()) {
    return 'past_due';
  }
  return subscription.status;
}

/** Create the tenant's first subscription, on trial when the plan offers one. */
export async function startSubscription({ tenant, plan, cycle = 'monthly', me }) {
  const now = new Date();
  const trialDays = Number(plan?.trial_days || 0);
  const trialEnd = trialDays > 0 ? addDays(now, trialDays) : null;
  return base44.entities.Subscription.create({
    tenant_id: tenant.id,
    tenant_name: tenant.name,
    owner_email: tenant.owner_email || me?.email || '',
    plan_id: plan?.id || '',
    plan_code: plan.code,
    billing_cycle: cycle,
    status: trialEnd ? 'trialing' : 'active',
    amount_usd: planAmount(plan, cycle),
    currency: tenant.currency || 'USD',
    started_at: now.toISOString(),
    trial_end: trialEnd ? trialEnd.toISOString() : '',
    current_period_start: now.toISOString(),
    current_period_end: periodEnd(trialEnd || now, cycle),
    cancel_at_period_end: false,
    notes: trialEnd ? `Essai de ${trialDays} jours` : '',
  });
}

export async function changePlan(subscription, plan, cycle) {
  const now = new Date();
  return base44.entities.Subscription.update(subscription.id, {
    plan_id: plan?.id || '',
    plan_code: plan.code,
    billing_cycle: cycle || subscription.billing_cycle,
    amount_usd: planAmount(plan, cycle || subscription.billing_cycle),
    status: subscription.status === 'cancelled' ? 'active' : subscription.status,
    cancel_at_period_end: false,
    cancelled_at: '',
    current_period_start: now.toISOString(),
    current_period_end: periodEnd(now, cycle || subscription.billing_cycle),
  });
}

/** Cancel now, or at the end of the paid period when `atPeriodEnd`. */
export async function cancelSubscription(subscription, atPeriodEnd = true) {
  const now = new Date().toISOString();
  return base44.entities.Subscription.update(subscription.id, atPeriodEnd
    ? { cancel_at_period_end: true, cancelled_at: now }
    : { status: 'cancelled', cancelled_at: now, cancel_at_period_end: false });
}

/** Renew a period: mark paid, roll the period forward. */
export async function renewSubscription(subscription, plan, cycle) {
  const now = new Date();
  const activeCycle = cycle || subscription.billing_cycle || 'monthly';
  const invoice = await issueInvoice({ subscription, plan, cycle: activeCycle });
  const updated = await base44.entities.Subscription.update(subscription.id, {
    status: 'active',
    amount_usd: planAmount(plan, activeCycle),
    plan_code: plan?.code || subscription.plan_code,
    billing_cycle: activeCycle,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd(now, activeCycle),
    last_payment_at: now.toISOString(),
    cancel_at_period_end: false,
    cancelled_at: '',
  });
  return { subscription: updated, invoice };
}

/** Retry a failed payment: same period, marked paid. */
export async function settleInvoice(invoice, reference) {
  const now = new Date().toISOString();
  return base44.entities.TenantInvoice.update(invoice.id, {
    status: 'paid',
    paid_at: now,
    payment_reference: reference || invoice.payment_reference || '',
  });
}

export async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const rows = await base44.entities.TenantInvoice.list('-created_date', 1).catch(() => []);
  const last = rows[0]?.invoice_number || '';
  const seq = Number(String(last).split('-').pop()) || 0;
  return `SA-${year}-${String(seq + 1).padStart(5, '0')}`;
}

export async function issueInvoice({ subscription, plan, cycle, vatRate = 0 }) {
  const subtotal = planAmount(plan, cycle || subscription.billing_cycle);
  const vat = round2(subtotal * (Number(vatRate) || 0) / 100);
  const now = new Date();
  return base44.entities.TenantInvoice.create({
    tenant_id: subscription.tenant_id,
    tenant_name: subscription.tenant_name,
    owner_email: subscription.owner_email,
    invoice_number: await nextInvoiceNumber(),
    plan_code: plan?.code || subscription.plan_code,
    billing_cycle: cycle || subscription.billing_cycle,
    period_start: now.toISOString(),
    period_end: periodEnd(now, cycle || subscription.billing_cycle),
    subtotal_usd: subtotal,
    vat_usd: vat,
    total_usd: round2(subtotal + vat),
    status: 'paid',
    issued_at: now.toISOString(),
    due_at: addDays(now, 7).toISOString(),
    paid_at: now.toISOString(),
    payment_reference: `MANUAL-${Date.now().toString(36).toUpperCase()}`,
  });
}

/** Monthly recurring revenue, normalised from both billing cycles. */
export function monthlyRecurring(rows) {
  return round2((rows || [])
    .filter((s) => ['active', 'trialing'].includes(s.status))
    .reduce((sum, s) => sum + (Number(s.amount_usd) || 0) / (s.billing_cycle === 'yearly' ? 12 : 1), 0));
}

export function annualRunRate(rows) {
  return round2(monthlyRecurring(rows) * 12);
}

export function subscriptionLabel(status) {
  return SUBSCRIPTION_STATUS[status] || status;
}