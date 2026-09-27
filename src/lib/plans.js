import { base44 } from '@/api/base44Client';
import { round2 } from './format';

/**
 * SaaS plan catalogue. The `Plan` entity is authoritative — these defaults are
 * only a fallback for a workspace whose catalogue has not been seeded yet.
 * No price, limit or commission is ever hardcoded in the application logic.
 */

export const PLAN_FEATURES = [
  { key: 'storefront', label: 'Vitrine en ligne' },
  { key: 'multi_store', label: 'Plusieurs boutiques' },
  { key: 'custom_domain', label: 'Nom de domaine personnalisé' },
  { key: 'team_roles', label: 'Équipe & rôles' },
  { key: 'supplier_import', label: 'Import fournisseurs internationaux' },
  { key: 'creator_program', label: 'Programme créateurs & affiliation' },
  { key: 'advanced_analytics', label: 'Analytique avancée' },
  { key: 'api_access', label: 'API & webhooks' },
  { key: 'priority_support', label: 'Support prioritaire' },
];

export const FEATURE_LABELS = PLAN_FEATURES.reduce((acc, f) => ({ ...acc, [f.key]: f.label }), {});

export const DEFAULT_PLANS = [
  {
    code: 'STARTER',
    name: 'Starter',
    description: 'Pour lancer une première boutique et tester le marché.',
    price_monthly_usd: 0,
    price_yearly_usd: 0,
    trial_days: 14,
    product_limit: 50,
    store_limit: 1,
    seller_limit: 1,
    member_limit: 2,
    commission_rate: 12,
    features: ['storefront'],
    sort_order: 1,
  },
  {
    code: 'GROWTH',
    name: 'Growth',
    description: 'Pour les commerçants qui vendent chaque jour.',
    price_monthly_usd: 19,
    price_yearly_usd: 190,
    trial_days: 14,
    product_limit: 500,
    store_limit: 2,
    seller_limit: 5,
    member_limit: 5,
    commission_rate: 8,
    features: ['storefront', 'team_roles', 'supplier_import', 'creator_program', 'advanced_analytics'],
    sort_order: 2,
    highlighted: true,
  },
  {
    code: 'BUSINESS',
    name: 'Business',
    description: 'Pour les enseignes multi-boutiques et leurs équipes.',
    price_monthly_usd: 59,
    price_yearly_usd: 590,
    trial_days: 14,
    product_limit: 5000,
    store_limit: 10,
    seller_limit: 50,
    member_limit: 25,
    commission_rate: 5,
    features: ['storefront', 'multi_store', 'custom_domain', 'team_roles', 'supplier_import', 'creator_program', 'advanced_analytics'],
    sort_order: 3,
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Marque blanche, volumes élevés et accompagnement dédié.',
    price_monthly_usd: 0,
    price_yearly_usd: 0,
    trial_days: 30,
    product_limit: 100000,
    store_limit: 100,
    seller_limit: 1000,
    member_limit: 500,
    commission_rate: 3,
    features: ['storefront', 'multi_store', 'custom_domain', 'team_roles', 'supplier_import', 'creator_program', 'advanced_analytics', 'api_access', 'priority_support'],
    sort_order: 4,
  },
];

export async function loadPlans() {
  const rows = await base44.entities.Plan.filter({ active: true }, 'sort_order', 50).catch(() => []);
  return rows.length ? rows : DEFAULT_PLANS;
}

export function planByCode(plans, code) {
  return plans.find((p) => p.code === code) || plans[0] || DEFAULT_PLANS[0];
}

export function planLimit(plan, key) {
  const value = Number(plan?.[key]);
  return Number.isFinite(value) ? value : 0;
}

export function hasFeature(plan, featureKey) {
  return Array.isArray(plan?.features) && plan.features.includes(featureKey);
}

export function planAmount(plan, cycle) {
  return round2(cycle === 'yearly' ? plan?.price_yearly_usd : plan?.price_monthly_usd);
}

export function planAmountLabel(plan, cycle) {
  const amount = planAmount(plan, cycle);
  if (plan?.code === 'ENTERPRISE') return 'Sur devis';
  return amount === 0 ? 'Gratuit' : `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export function usagePercent(used, limit) {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((Number(used) || 0) / limit * 100));
}