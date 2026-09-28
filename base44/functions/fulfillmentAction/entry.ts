import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sellerMayAct, courierMayAct, validAdvance, validCourierAdvance, TERMINAL } from '../../shared/fulfillmentAccess.js';

const money = (value) => Math.round(Number(value || 0) * 100) / 100;
const fail = (error, status = 400) => Response.json({ error }, { status });

async function releasePayout(db, fulfillment, order) {
  if (fulfillment.payout_released || order.payment_status !== 'PAID' || order.payment_verified !== true) return fulfillment;
  const pending = await db.entities.WalletTransaction.filter({ reference: fulfillment.fulfillment_number, status: 'pending' });
  for (const tx of pending) {
    const wallet = await db.entities.Wallet.get(tx.wallet_id).catch(() => null);
    if (!wallet || tx.direction !== 'credit' || tx.order_id !== order.id) continue;
    await db.entities.WalletTransaction.update(tx.id, { status: 'posted' });
    await db.entities.Wallet.update(wallet.id, { pending_usd: Math.max(0, money(Number(wallet.pending_usd || 0) - Number(tx.amount_usd || 0))) });
  }
  return db.entities.FulfillmentOrder.update(fulfillment.id, { payout_released: true });
}

async function creditCourier(db, fulfillment, order, courier) {
  if (order.payment_status !== 'PAID' || order.payment_verified !== true) return;
  const amount = money(fulfillment.shipping_usd);
  if (!(amount > 0)) return;
  const key = `courier:${fulfillment.fulfillment_number}`;
  if ((await db.entities.WalletTransaction.filter({ idempotency_key: key })).length) return;
  let wallet = (await db.entities.Wallet.filter({ owner_type: 'courier', owner_name: fulfillment.courier_name }))[0];
  if (!wallet) wallet = await db.entities.Wallet.create({ owner_type: 'courier', owner_id: courier.id, owner_name: courier.name, owner_email: courier.email || '', balance_usd: 0 });
  const balance = money(wallet.balance_usd + amount);
  await db.entities.Wallet.update(wallet.id, { balance_usd: balance, lifetime_credit_usd: money(Number(wallet.lifetime_credit_usd || 0) + amount) });
  await db.entities.WalletTransaction.create({ wallet_id: wallet.id, owner_type: 'courier', owner_name: courier.name, owner_email: wallet.owner_email || courier.email || '', type: 'PAYOUT', direction: 'credit', amount_usd: amount, balance_after_usd: balance, currency: 'USD', status: 'posted', order_id: order.id, order_number: order.order_number, reference: fulfillment.fulfillment_number, idempotency_key: key, description: `Course livrée — ${fulfillment.fulfillment_number}` });
}

export default async function(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return fail('Méthode non autorisée', 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.email) return fail('Authentification requise', 401);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    if (!['advance', 'respond', 'courierAdvance'].includes(action)) return fail('Action invalide');
    const db = base44.asServiceRole;
    const shipment = action === 'advance' ? null : await db.entities.Shipment.get(String(body.shipment_id || '')).catch(() => null);
    if (action !== 'advance' && !shipment) return fail('Expédition introuvable', 404);
    const fulfillmentId = action === 'advance' ? String(body.fulfillment_id || '') : shipment.fulfillment_order_id;
    const fulfillment = await db.entities.FulfillmentOrder.get(fulfillmentId).catch(() => null);
    if (!fulfillment || (shipment && (shipment.order_number !== fulfillment.order_number || shipment.courier_name !== fulfillment.courier_name || shipment.courier_id !== fulfillment.courier_id))) return fail('Commande introuvable', 404);
    const order = await db.entities.Order.get(fulfillment.order_id).catch(() => null);
    if (!order || order.order_number !== fulfillment.order_number) return fail('Commande introuvable', 404);
    const admin = user.role === 'admin';
    let courier = null;
    if (action === 'advance') {
      if (!admin) {
        const seller = fulfillment.seller_id ? await db.entities.Seller.get(fulfillment.seller_id).catch(() => null) : null;
        if (!sellerMayAct(seller, user)) return fail('Accès interdit', 403);
      }
    } else {
      const matches = await db.entities.Courier.filter({ name: shipment.courier_name });
      courier = matches.find((c) => courierMayAct(c, user));
      if (!admin && !courier) return fail('Accès interdit', 403);
      if (!courier && admin) courier = matches.find((c) => c.active !== false) || { id: shipment.courier_id, name: shipment.courier_name, email: '' };
    }
    if (action === 'respond') {
      if (TERMINAL.includes(shipment.status) || shipment.courier_response !== 'pending') return fail('Offre déjà traitée', 409);
      if (typeof body.accepted !== 'boolean') return fail('Réponse invalide');
      const updated = await db.entities.Shipment.update(shipment.id, { courier_response: body.accepted ? 'accepted' : 'declined', events: [...(shipment.events || []), { status: shipment.status, label: body.accepted ? 'Course acceptée par le transporteur' : 'Course refusée par le transporteur', at: new Date().toISOString() }] });
      await db.entities.AuditLog.create({ action: 'shipment.response', actor: user.email, entity: 'Shipment', entity_id: updated.id, reference: order.order_number, details: { accepted: body.accepted } });
      return Response.json({ shipment: updated });
    }
    const status = String(body.status || '');
    if (action === 'advance') {
      const cancel = status === 'CANCELLED' && ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP'].includes(fulfillment.status);
      if (!validAdvance(fulfillment.status, status, admin)) return fail('Transition invalide', 409);
      if (cancel && order.payment_verified) return fail('Une commande payée doit suivre la procédure de remboursement', 409);
      if (!cancel && order.payment_status !== 'PAID' && order.payment_provider !== 'cod') return fail('Paiement non confirmé', 409);
    } else {
      if (!validCourierAdvance(shipment, fulfillment, status)) return fail('Transition invalide', 409);
      if (order.payment_status !== 'PAID' && order.payment_provider !== 'cod') return fail('Paiement non confirmé', 409);
      if (status === 'DELIVERED' && order.pickup_code && String(body.pickup_code || '').trim() !== String(order.pickup_code)) return fail('Code de retrait incorrect', 403);
    }
    const now = new Date().toISOString();
    const updated = await db.entities.FulfillmentOrder.update(fulfillment.id, { status });
    const ship = action === 'advance' ? (await db.entities.Shipment.filter({ fulfillment_order_id: fulfillment.id }))[0] : shipment;
    if (ship) {
      const extras = action === 'courierAdvance' && status === 'DELIVERED' ? { delivered_to: String(body.delivered_to || '').slice(0, 100), delivered_at: now, proof_of_delivery: String(body.proof_of_delivery || '').slice(0, 500) } : {};
      await db.entities.Shipment.update(ship.id, { status, events: [...(ship.events || []), { status, label: action === 'courierAdvance' ? String(body.label || status).slice(0, 100) : status, at: now }], ...extras });
    }
    const final = status === 'DELIVERED' ? await releasePayout(db, updated, order) : updated;
    if (status === 'DELIVERED' && action === 'courierAdvance') await creditCourier(db, final, order, courier);
    await db.entities.AuditLog.create({ action: 'fulfillment.status_changed', actor: user.email, entity: 'FulfillmentOrder', entity_id: final.id, reference: order.order_number, details: { action, from: fulfillment.status, to: status, payment_verified: order.payment_verified === true } });
    return Response.json({ fulfillment: final });
  } catch(e) {
    console.error('fulfillmentAction failed', e);
    return fail('Action impossible pour le moment', 500);
  }
}