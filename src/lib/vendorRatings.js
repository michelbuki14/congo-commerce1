import { round2 } from './format';

/**
 * VENDOR RATINGS
 * Public trust metrics are derived from real records only: published reviews,
 * disputes, delivered order volume and live catalogue size. Nothing is invented.
 */
export function trustScoreFor({ avgRating = 0, disputeRate = 0, orders = 0, reviewsCount = 0 }) {
  const ratingPart = (Math.min(5, Math.max(0, avgRating)) / 5) * 55;
  const disputePart = (1 - Math.min(1, Math.max(0, disputeRate))) * 30;
  const volumePart = Math.min(1, orders / 50) * 15;
  const score = ratingPart + disputePart + volumePart;
  return reviewsCount ? Math.round(score) : Math.round(Math.min(score, 70));
}

export function trustLevel(score) {
  if (score >= 80) return { code: 'excellent', label: 'Excellent', tone: 'good' };
  if (score >= 65) return { code: 'fiable', label: 'Fiable', tone: 'good' };
  if (score >= 45) return { code: 'correct', label: 'Correct', tone: 'warn' };
  return { code: 'nouveau', label: 'Nouveau', tone: 'default' };
}

export function buildSellerMetrics({ sellers = [], reviews = [], disputes = [], products = [] } = {}) {
  return sellers.map((seller) => {
    const sellerReviews = reviews.filter((r) => r.seller_id === seller.id && r.status !== 'hidden');
    const ratings = sellerReviews.map((r) => Number(r.rating) || 0).filter((n) => n > 0);
    const avgRating = ratings.length
      ? round2(ratings.reduce((a, b) => a + b, 0) / ratings.length)
      : Number(seller.rating) || 0;
    const name = String(seller.name || '').trim().toLowerCase();
    // The dispute index carries per-shop counts, never the individual cases.
    const disputeCounts = disputes.find((d) => String(d.seller_name || '').trim().toLowerCase() === name) || {};
    const disputeCount = Number(disputeCounts.disputes) || 0;
    const openDisputeCount = Number(disputeCounts.open_disputes) || 0;
    const orders = Number(Number(seller.orders_count) || 0);
    const catalogue = products.filter((p) => p.seller_id === seller.id && p.status !== 'archived').length;
    const productsCount = catalogue || Number(seller.products_count) || 0;
    const disputeRate = orders ? Math.min(1, disputeCount / orders) : disputeCount ? 1 : 0;
    const trustScore = trustScoreFor({ avgRating, disputeRate, orders, reviewsCount: ratings.length });
    const fiveStars = ratings.filter((r) => r >= 5).length;
    return {
      seller,
      reviews: sellerReviews,
      avgRating,
      reviewsCount: ratings.length,
      verifiedReviews: sellerReviews.filter((r) => r.verified_purchase).length,
      fiveStars,
      orders,
      productsCount,
      disputes: disputeCount,
      openDisputes: openDisputeCount,
      disputeRate,
      trustScore,
      level: trustLevel(trustScore),
      verified: Boolean(seller.verified),
      followers: Number(seller.followers_count) || 0,
      deliveryInfo: seller.delivery_info || '',
      city: seller.city || '',
      status: seller.status || 'active',
    };
  });
}

export function marketplaceStats(metrics = []) {
  const rated = metrics.filter((m) => m.reviewsCount > 0);
  const avgRating = rated.length
    ? round2(rated.reduce((sum, m) => sum + m.avgRating, 0) / rated.length)
    : 0;
  return {
    sellers: metrics.length,
    verified: metrics.filter((m) => m.verified).length,
    avgRating,
    reviews: metrics.reduce((sum, m) => sum + m.reviewsCount, 0),
    openDisputes: metrics.reduce((sum, m) => sum + m.openDisputes, 0),
    orders: metrics.reduce((sum, m) => sum + m.orders, 0),
  };
}

export const RATING_SORTS = [
  { id: 'trust', labelKey: 'ratingSort.trust' },
  { id: 'rating', labelKey: 'ratingSort.rating' },
  { id: 'orders', labelKey: 'ratingSort.orders' },
  { id: 'disputes', labelKey: 'ratingSort.disputes' },
];

export function sortMetrics(metrics = [], sortBy = 'trust') {
  const rows = [...metrics];
  if (sortBy === 'rating') return rows.sort((a, b) => b.avgRating - a.avgRating || b.reviewsCount - a.reviewsCount);
  if (sortBy === 'orders') return rows.sort((a, b) => b.orders - a.orders);
  if (sortBy === 'disputes') return rows.sort((a, b) => b.disputeRate - a.disputeRate);
  return rows.sort((a, b) => b.trustScore - a.trustScore || b.orders - a.orders);
}