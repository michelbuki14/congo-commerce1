import { base44 } from '@/api/base44Client';

const E = base44.entities;
const today = () => new Date(new Date().toDateString());
const isToday = (d) => new Date(d) >= today();
const sum = (a, k) => a.reduce((s, x) => s + (x[k] || 0), 0);

/** Loads live operational signals across every domain. Real records only — no estimates. */
export async function loadCommandCenter() {
  const [orders, fraud, tickets, workflows, syncs, sellers, creators, suppliers, subs, shipments, returns] = await Promise.all([
    E.Order.list('-created_date', 500),
    E.FraudEvent.filter({ status: 'open' }, '-created_date', 200),
    E.SupportTicket.list('-created_date', 300),
    E.WorkflowExecution.list('-created_date', 200),
    E.InventorySyncLog.list('-created_date', 100),
    E.Seller.filter({ status: 'active' }, '-created_date', 500),
    E.Creator.list('-created_date', 500),
    E.Supplier.filter({ enabled: true }, 'name', 200),
    E.Subscription.list('-created_date', 500),
    E.Shipment.list('-updated_date', 500),
    E.Return.list('-created_date', 300),
  ]);
  const real = orders.filter((o) => !o.is_demo);
  const todays = real.filter((o) => isToday(o.created_date));
  const paidToday = todays.filter((o) => o.payment_status === 'PAID');
  const activeSubs = subs.filter((s) => ['active', 'trialing'].includes(s.status));
  return {
    commerce: {
      ordersToday: todays.length,
      gmvToday: sum(todays, 'total_usd'),
      revenueToday: sum(paidToday, 'total_usd'),
      activeCustomers: new Set(real.filter((o) => Date.now() - new Date(o.created_date) < 30 * 864e5).map((o) => o.customer_phone || o.session_id)).size,
    },
    finance: {
      paymentsToday: paidToday.length,
      failedPayments: real.filter((o) => o.payment_status === 'FAILED').length,
      refunds: real.filter((o) => ['REFUNDED', 'PARTIALLY_REFUNDED'].includes(o.payment_status)).length,
      mrr: sum(activeSubs.filter((s) => s.billing_cycle === 'monthly'), 'amount_usd') + sum(activeSubs.filter((s) => s.billing_cycle === 'yearly'), 'amount_usd') / 12,
    },
    logistics: {
      inTransit: shipments.filter((s) => ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status)).length,
      deliveredToday: shipments.filter((s) => s.status === 'DELIVERED' && isToday(s.delivered_at || s.updated_date)).length,
      failedDeliveries: shipments.filter((s) => ['FAILED', 'RETURNED'].includes(s.status)).length,
      openReturns: returns.filter((r) => !['REFUNDED', 'REJECTED', 'CLOSED'].includes(String(r.status).toUpperCase())).length,
    },
    network: { sellers: sellers.length, creators: creators.length, suppliers: suppliers.length, subscriptions: activeSubs.length },
    risk: {
      fraud: fraud.length,
      supportBacklog: tickets.filter((t) => ['open', 'in_progress', 'waiting_customer'].includes(t.status)).length,
      failedSyncs: syncs.filter((s) => s.status === 'failed' && Date.now() - new Date(s.created_date) < 864e5).length,
      failedJobs: workflows.filter((w) => w.status === 'FAILED').length,
    },
  };
}