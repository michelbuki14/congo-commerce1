import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { requireAdmin } from '../../shared/security.ts';
import { postWalletEntry } from '../../shared/walletLedger.ts';

/**
 * Runs on every new review (triggered by the "Review Followup" workflow).
 *
 * 5 stars  -> credits the seller's wallet with a review bonus and sends the
 *             seller a thank-you message in their notification feed.
 * 1-2 stars -> opens a high-priority support ticket and alerts the support team.
 *
 * Every write is keyed to the review id, so a repeated run never pays twice or
 * opens a duplicate ticket.
 */

const REVIEW_BONUS_USD = 0.5;

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

async function rewardSeller(base44, review, tenant) {
  const reference = `REVIEW-${review.id}`;
  const already = await base44.asServiceRole.entities.WalletTransaction.filter({ reference }).catch(() => []);
  if (already.length) return { skipped: true, reason: 'already rewarded', reference };

  const seller = review.seller_id
    ? await base44.asServiceRole.entities.Seller.get(review.seller_id).catch(() => null)
    : null;
  const ownerName = seller?.name || 'Vendeur Congo Commerce';

  const wallets = await base44.asServiceRole.entities.Wallet
    .filter({ owner_type: 'seller', owner_name: ownerName })
    .catch(() => []);
  const wallet = wallets[0] || await base44.asServiceRole.entities.Wallet.create({
      ...tenant,
      owner_type: 'seller',
      owner_id: review.seller_id || '',
      owner_name: ownerName,
      owner_email: seller?.email || '',
      created_by_id: review.seller_id || '',
      balance_usd: 0,
    pending_usd: 0,
    lifetime_credit_usd: 0,
    lifetime_debit_usd: 0,
    currency: 'USD',
    status: 'active',
  });

  await postWalletEntry(base44.asServiceRole, wallet, {
    ...tenant,
    type: 'CREDIT',
    direction: 'credit',
    amount: REVIEW_BONUS_USD,
    owner_type: 'seller',
    owner_name: ownerName,
    owner_email: wallet.owner_email || seller?.email || '',
    description: `Prime avis 5 étoiles — ${review.product_title || 'article'}`,
    reference,
    idempotencyKey: reference,
    order_number: review.order_number || '',
    status: 'posted',
  });

  await base44.asServiceRole.entities.Notification.create({
    ...tenant,
    title: 'Merci pour votre avis 5 étoiles',
    message: `${review.customer_name || 'Un client'} a noté « ${review.product_title || 'votre article'} » 5 étoiles. Un crédit de ${REVIEW_BONUS_USD.toFixed(2)} USD a été ajouté à votre portefeuille.`,
    type: 'social',
    audience: 'seller',
    order_number: review.order_number || '',
  });

  await base44.asServiceRole.entities.AuditLog.create({
    action: 'wallet.review_bonus',
    actor: 'system',
    entity: 'Wallet',
    entity_id: wallet.id,
    reference: ownerName,
    severity: 'info',
    details: { amount_usd: REVIEW_BONUS_USD, review_id: review.id, product_title: review.product_title || '' },
  });

  return { rewarded: true, amount_usd: REVIEW_BONUS_USD, seller: ownerName, wallet_id: wallet.id };
}

async function openSupportCase(base44, review, tenant) {
  const rating = Number(review.rating) || 0;
  const subject = `Avis ${rating}/5 — ${review.product_title || 'Article'}`;
  const existing = await base44.asServiceRole.entities.SupportTicket
    .filter({ subject, order_number: review.order_number || '' })
    .catch(() => []);
  if (existing.length) return { skipped: true, reason: 'ticket already open', ticket_id: existing[0].id };

  // The outreach needs contact details, which live on the order the review is attached to.
  const order = review.order_number
    ? (await base44.asServiceRole.entities.Order.filter({ order_number: review.order_number }).catch(() => []))[0] || null
    : null;

  const priority = rating === 1 ? 'high' : 'normal';
  const ticket = await base44.asServiceRole.entities.SupportTicket.create({
    ...tenant,
    ticket_number: `SUP-${Date.now().toString(36).toUpperCase()}`,
    subject,
    category: 'other',
    status: 'open',
    priority,
    assigned_to: 'shopping_assistant',
    customer_name: review.customer_name || order?.customer_name || '',
    customer_email: order?.customer_email || '',
    customer_phone: order?.customer_phone || '',
    order_number: review.order_number || '',
    session_id: review.session_id || '',
    messages: [{
      author: 'system',
      body: `Avis client ${rating}/5 sur « ${review.product_title || 'un article'} ».${review.comment ? ` Commentaire : ${review.comment}` : ''} À traiter par l'assistant d'achat, qui recontacte le client.`,
      at: new Date().toISOString(),
    }],
  });

  await base44.asServiceRole.entities.Notification.create({
    ...tenant,
    title: `Avis négatif à traiter (${rating}/5)`,
    message: `${review.customer_name || 'Un client'} a noté « ${review.product_title || 'un article'} » ${rating}/5. Ticket ${ticket.ticket_number} ouvert pour l'assistant d'achat, qui recontacte le client.`,
    type: 'system',
    audience: 'admin',
    order_number: review.order_number || '',
  });

  await base44.asServiceRole.entities.AuditLog.create({
    action: 'support.review_escalated',
    actor: 'system',
    entity: 'SupportTicket',
    entity_id: ticket.id,
    reference: ticket.ticket_number,
    severity: 'warning',
    details: { rating, review_id: review.id, product_title: review.product_title || '' },
  });

  return { ticket_number: ticket.ticket_number, priority, escalated: true };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const reviewId = String(body.review_id || '').trim();
    if (!reviewId) return Response.json({ error: 'review_id is required' }, { status: 400 });

    // This endpoint pays sellers, so it answers only the platform's own review
    // workflow and administrators — never an anonymous caller.
    const auth = await requireAdmin(base44);
    if (!auth.ok) return auth.response;

    const review = await base44.asServiceRole.entities.Review.get(reviewId).catch(() => null);
    if (!review) return Response.json({ error: 'Review not found' }, { status: 404 });

    // A bonus is owed only for a review of an article the customer actually
    // received: the review must sit on an order that was delivered and that
    // contains the reviewed product, exactly as the review form requires.
    const order = review.order_number
      ? (await base44.asServiceRole.entities.Order.filter({ order_number: review.order_number }).catch(() => []))[0] || null
      : null;
    const bought = order && (order.items || []).some((item) => item?.product_id && item.product_id === review.product_id);
    if (!order || String(order.status || '').toUpperCase() !== 'DELIVERED' || !bought) {
      return Response.json({
        review_id: reviewId,
        skipped: true,
        reason: 'avis non rattaché à une commande livrée',
      });
    }

    const tenant = {
      tenant_id: String(review.tenant_id || ''),
      tenant_owner_email: String(review.tenant_owner_email || ''),
    };
    const rating = Number(review.rating) || 0;

    if (rating === 5) return Response.json({ review_id: reviewId, ...(await rewardSeller(base44, review, tenant)) });
    if (rating <= 2) return Response.json({ review_id: reviewId, ...(await openSupportCase(base44, review, tenant)) });
    return Response.json({ review_id: reviewId, skipped: true, reason: `rating ${rating} needs no follow-up` });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}