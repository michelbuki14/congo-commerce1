import { base44 } from '@/api/base44Client';
import { round2 } from './format';
import { fetchMyOrders } from '@/lib/customerAccount';

/**
 * LOYALTY ENGINE
 * Points are earned from delivered orders only, so the balance can never drift
 * from what the customer actually bought. Redemptions are stored server-side.
 */
export const POINTS_PER_USD = 10;

export const LOYALTY_TIERS = [
  {
    code: 'BRONZE',
    nameKey: 'loyalty.tierBronze',
    min_points: 0,
    multiplier: 1,
    badge: 'bg-amber-100 text-amber-900',
    perksKey: 'loyalty.tierBronzePerks',
  },
  {
    code: 'ARGENT',
    nameKey: 'loyalty.tierSilver',
    min_points: 1500,
    multiplier: 1.25,
    badge: 'bg-slate-200 text-slate-800',
    perksKey: 'loyalty.tierSilverPerks',
  },
  {
    code: 'OR',
    nameKey: 'loyalty.tierGold',
    min_points: 4000,
    multiplier: 1.5,
    badge: 'bg-yellow-100 text-yellow-900',
    perksKey: 'loyalty.tierGoldPerks',
  },
  {
    code: 'PLATINE',
    nameKey: 'loyalty.tierPlatinum',
    min_points: 10000,
    multiplier: 2,
    badge: 'bg-violet-100 text-violet-900',
    perksKey: 'loyalty.tierPlatinumPerks',
  },
];

export const LOYALTY_REWARDS = [
  { code: 'SHIP_OFFERED', labelKey: 'loyalty.rewardShip', points: 800, value_usd: 3.5, noteKey: 'loyalty.rewardShipNote' },
  { code: 'DISCOUNT_5', labelKey: 'loyalty.rewardDiscount5', points: 1200, value_usd: 5, noteKey: 'loyalty.rewardDiscount5Note' },
  { code: 'PRIORITY_PACK', labelKey: 'loyalty.rewardPriority', points: 1500, value_usd: 0, noteKey: 'loyalty.rewardPriorityNote' },
  { code: 'DISCOUNT_10PCT', labelKey: 'loyalty.rewardDiscount10', points: 1800, value_usd: 0, noteKey: 'loyalty.rewardDiscount10Note' },
  { code: 'GIFT_BOX', labelKey: 'loyalty.rewardGift', points: 3000, value_usd: 12, noteKey: 'loyalty.rewardGiftNote' },
];

export function tierFor(points) {
  const value = Number(points) || 0;
  return [...LOYALTY_TIERS].reverse().find((t) => value >= t.min_points) || LOYALTY_TIERS[0];
}

export function nextTierFor(points) {
  const value = Number(points) || 0;
  return LOYALTY_TIERS.find((t) => t.min_points > value) || null;
}

/** Delivered, non-refunded orders earn points; paid-but-in-transit ones are pending. */
export function pointsFromOrders(orders = []) {
  let earned = 0;
  let pending = 0;
  let lifetimeUsd = 0;
  orders.forEach((order) => {
    const refunded = order.payment_status === 'REFUNDED' || order.payment_status === 'CANCELLED';
    if (refunded || order.status === 'CANCELLED') return;
    const total = Number(order.total_usd) || 0;
    const points = Math.round(total * POINTS_PER_USD);
    if (order.status === 'DELIVERED') {
      earned += points;
      lifetimeUsd += total;
    } else if (order.payment_status === 'PAID' || order.payment_status === 'AUTHORIZED') {
      pending += points;
    }
  });
  return { earned, pending, lifetimeUsd: round2(lifetimeUsd) };
}

export function loyaltySummary({ orders = [], redemptions = [] } = {}) {
  const { earned, pending, lifetimeUsd } = pointsFromOrders(orders);
  const spent = redemptions.reduce((sum, r) => sum + (Number(r.points_spent) || 0), 0);
  const balance = Math.max(0, earned - spent);
  const tier = tierFor(balance);
  const next = nextTierFor(balance);
  const span = next ? next.min_points - tier.min_points : 1;
  const progress = next ? Math.min(1, Math.max(0, (balance - tier.min_points) / span)) : 1;
  return {
    earned,
    pending,
    spent,
    balance,
    lifetimeUsd,
    tier,
    next,
    progress,
    missingToNext: next ? Math.max(0, next.min_points - balance) : 0,
    affordable: LOYALTY_REWARDS.filter((r) => r.points <= balance).length,
  };
}

function dedupe(list) {
  const seen = new Set();
  return list.filter((row) => {
    if (!row?.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export async function loadLoyaltyData({ sessionId, phone } = {}) {
  const [orders, redemptions] = await Promise.all([
    fetchMyOrders({ sessionId, phone, limit: 100 }),
    base44.entities.LoyaltyRedemption.filter({ session_id: sessionId }, '-created_date', 100).catch(() => []),
  ]);
  return { orders: dedupe(orders), redemptions };
}

export function generateRewardCode(prefix = 'FID') {
  return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

export async function redeemReward({ reward, customer, sessionId }) {
  return base44.entities.LoyaltyRedemption.create({
    session_id: sessionId,
    customer_name: customer?.name || '',
    customer_phone: customer?.phone || '',
    reward_code: reward.code,
    reward_label: reward.label,
    points_spent: reward.points,
    value_usd: reward.value_usd || 0,
    coupon_code: generateRewardCode(reward.code.slice(0, 3)),
    status: 'active',
  });
}