import { base44 } from '@/api/base44Client';
import { emitEvent } from './events';

/**
 * FRAUD & RISK ENGINE
 *
 * Signals are collected from real order history, then scored against the
 * database-driven `FraudRule` catalogue. No business threshold is hardcoded
 * here: an inactive or missing rule simply stops scoring its signal, so the
 * risk desk tunes detection from the admin console without a deploy.
 */

export const DEFAULT_RULES = [
  { code: 'HIGH_VALUE', label: 'Montant inhabituel', signal: 'high_value', threshold: 300, score: 25, action: 'review', sort_order: 1, description: 'Commande dont le montant dépasse le seuil configuré.' },
  { code: 'PHONE_VELOCITY', label: 'Commandes répétées du même numéro', signal: 'phone_velocity', threshold: 3, score: 30, action: 'review', sort_order: 2, description: 'Plusieurs commandes passées avec le même numéro de téléphone.' },
  { code: 'SESSION_VELOCITY', label: 'Commandes répétées dans la même session', signal: 'session_velocity', threshold: 3, score: 20, action: 'review', sort_order: 3, description: 'Plusieurs commandes depuis la même session de navigation.' },
  { code: 'FAILED_PAYMENTS', label: 'Paiements échoués répétés', signal: 'failed_payments', threshold: 2, score: 20, action: 'review', sort_order: 4, description: 'Plusieurs tentatives de paiement échouées sur ce numéro.' },
  { code: 'REFUND_ABUSE', label: 'Remboursements répétés', signal: 'refund_abuse', threshold: 2, score: 30, action: 'review', sort_order: 5, description: 'Commandes déjà remboursées sur ce numéro.' },
  { code: 'SHARED_PHONE', label: 'Numéro partagé par plusieurs clients', signal: 'shared_phone', threshold: 2, score: 20, action: 'review', sort_order: 6, description: 'Le même numéro est utilisé avec plusieurs adresses e-mail.' },
  { code: 'COUPON_ABUSE', label: 'Usage répété du même code promo', signal: 'coupon_abuse', threshold: 3, score: 15, action: 'review', sort_order: 7, description: 'Le même code promo est réutilisé au-delà du seuil.' },
  { code: 'SELF_REFERRAL', label: 'Auto-parrainage', signal: 'self_referral', threshold: 1, score: 25, action: 'block', sort_order: 8, description: 'Le code d’affiliation a été cliqué depuis la session qui commande.' },
];

export const RISK_BANDS = [
  { level: 'critical', min: 85 },
  { level: 'high', min: 60 },
  { level: 'medium', min: 30 },
  { level: 'low', min: 0 },
];

export const LEVEL_LABELS = { low: 'Faible', medium: 'Moyen', high: 'Élevé', critical: 'Critique' };

export function riskLevel(score) {
  return RISK_BANDS.find((b) => (Number(score) || 0) >= b.min)?.level || 'low';
}

export async function loadFraudRules() {
  const rows = await base44.entities.FraudRule.list('sort_order', 100).catch(() => []);
  return rows.length ? rows : DEFAULT_RULES;
}

/** Scores the collected signals against the active rules. Pure — no writes. */
export function scoreSignals(signals, rules) {
  const matched = [];
  let score = 0;
  let action = 'review';

  (signals || []).forEach((s) => {
    const rule = (rules || []).find((r) => r.active !== false && r.signal === s.signal);
    if (!rule) return;
    const threshold = Number(rule.threshold) || 0;
    const value = Number(s.value) || 0;
    if (value < threshold) return;
    const points = Number(rule.score) || 0;
    score += points;
    matched.push({ code: rule.code, label: rule.label, signal: s.signal, value, threshold, points });
    if (rule.action === 'block') action = 'block';
  });

  return { score, level: riskLevel(score), action, signals: matched };
}

/** Reads the customer's real history and returns one entry per signal. */
export async function collectSignals({ amountUsd = 0, sessionId = '', phone = '', couponCode = '', affiliateCode = '', orderNumber = '' }) {
  const signals = [];
  const byPhone = phone ? await base44.entities.Order.filter({ customer_phone: phone }, '-created_date', 50).catch(() => []) : [];
  const bySession = sessionId ? await base44.entities.Order.filter({ session_id: sessionId }, '-created_date', 50).catch(() => []) : [];
  const prior = byPhone.filter((o) => o.order_number !== orderNumber);
  const priorSession = bySession.filter((o) => o.order_number !== orderNumber);

  if (amountUsd > 0) signals.push({ signal: 'high_value', value: amountUsd });
  if (phone) {
    signals.push({ signal: 'phone_velocity', value: prior.length + 1 });
    signals.push({ signal: 'shared_phone', value: new Set(prior.map((o) => o.customer_email).filter(Boolean)).size });
    signals.push({ signal: 'failed_payments', value: prior.filter((o) => o.payment_status === 'FAILED').length });
    signals.push({ signal: 'refund_abuse', value: prior.filter((o) => ['REFUNDED', 'PARTIALLY_REFUNDED'].includes(o.payment_status)).length });
  }
  if (sessionId) signals.push({ signal: 'session_velocity', value: priorSession.length + 1 });

  if (couponCode && phone) {
    signals.push({ signal: 'coupon_abuse', value: prior.filter((o) => o.coupon_code === couponCode).length + 1 });
  }
  if (affiliateCode && sessionId) {
    const clicks = await base44.entities.AffiliateClick.filter({ session_id: sessionId, referral_code: affiliateCode }).catch(() => []);
    signals.push({ signal: 'self_referral', value: clicks.length ? 1 : 0 });
  }

  return signals;
}

/** Dry run used by the admin rule tester — never writes anything. */
export async function evaluateRisk(input) {
  const rules = await loadFraudRules();
  const signals = await collectSignals(input);
  return scoreSignals(signals, rules);
}

/**
 * Checkout hook. Records a review case when the score is above zero. It never
 * blocks a paid order — the risk desk decides, from the admin console.
 */
export async function assessCheckoutRisk({ order, amountUsd, sessionId, profile, couponCode, affiliateCode }) {
  const assessment = await evaluateRisk({
    amountUsd,
    sessionId,
    phone: order?.customer_phone || profile?.phone || '',
    couponCode,
    affiliateCode,
    orderNumber: order?.order_number || '',
  });

  if (assessment.score > 0) {
    await base44.entities.FraudEvent.create({
      tenant_id: order?.tenant_id || '',
      tenant_owner_email: order?.tenant_owner_email || '',
      order_id: order?.id || '',
      order_number: order?.order_number || '',
      session_id: sessionId || '',
      customer_name: order?.customer_name || profile?.name || '',
      customer_email: order?.customer_email || profile?.email || '',
      customer_phone: order?.customer_phone || profile?.phone || '',
      amount_usd: amountUsd || 0,
      risk_score: assessment.score,
      risk_level: assessment.level,
      recommended_action: assessment.action,
      signals: assessment.signals,
      status: 'open',
    });

    emitEvent('risk_flagged', {
      category: 'risk',
      source: 'FraudEvent',
      sourceId: order?.id || '',
      reference: order?.order_number || '',
      severity: assessment.level === 'critical' ? 'critical' : 'warning',
      tenantId: order?.tenant_id || '',
      tenantOwnerEmail: order?.tenant_owner_email || '',
      description: `Score de risque ${assessment.score} (${assessment.level}) sur ${order?.order_number || 'une commande'}`,
      payload: {
        score: assessment.score,
        level: assessment.level,
        action: assessment.action,
        signals: assessment.signals.map((s) => s.code),
      },
    });
  }

  return assessment;
}

export async function reviewFraudEvent(event, status, { reviewer = '', notes = '' } = {}) {
  return base44.entities.FraudEvent.update(event.id, {
    status,
    reviewed_by: reviewer,
    reviewed_at: new Date().toISOString(),
    notes: notes || event.notes || '',
  });
}

export async function saveFraudRule(rule) {
  const payload = {
    code: rule.code,
    label: rule.label,
    description: rule.description || '',
    signal: rule.signal,
    threshold: Number(rule.threshold) || 0,
    score: Number(rule.score) || 0,
    action: rule.action || 'review',
    active: rule.active !== false,
    sort_order: rule.sort_order || 0,
  };
  if (rule.id) return base44.entities.FraudRule.update(rule.id, payload);
  return base44.entities.FraudRule.create(payload);
}