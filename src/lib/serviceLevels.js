/**
 * Service levels measured from real records: how long deliveries actually take,
 * how long fulfilment sits before shipping, and how fast support answers.
 */

const HOUR = 3600000;
const DAY = 86400000;

const round1 = (n) => Math.round(n * 10) / 10;

function summarize(values, unit) {
  if (!values.length) return { count: 0, avg: null, median: null, p90: null, unit };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: values.length,
    avg: round1(values.reduce((sum, v) => sum + v, 0) / values.length),
    median: round1(sorted[Math.floor(sorted.length / 2)]),
    p90: round1(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))]),
    unit,
  };
}

/** Door-to-door delivery time, from shipment creation to proof of delivery. */
export function deliveryStats(shipments) {
  const days = shipments
    .filter((s) => s.delivered_at && s.created_date)
    .map((s) => (new Date(s.delivered_at) - new Date(s.created_date)) / DAY)
    .filter((d) => d >= 0);
  return summarize(days, 'jours');
}

/** Fulfilment latency: how long a fulfilment takes to reach the customer. */
export function fulfillmentStats(fulfillments) {
  const days = fulfillments
    .filter((f) => String(f.status || '') === 'DELIVERED' && f.updated_date)
    .map((f) => (new Date(f.updated_date) - new Date(f.created_date)) / DAY)
    .filter((d) => d >= 0);
  return summarize(days, 'jours');
}

/** Share of fulfilments closed on or before their promised date. */
export function onTimeRate(fulfillments) {
  const rows = fulfillments.filter((f) => String(f.status || '') === 'DELIVERED' && f.estimated_delivery && f.updated_date);
  if (!rows.length) return null;
  const ok = rows.filter((f) => new Date(f.updated_date) <= new Date(f.estimated_delivery)).length;
  return { rate: ok / rows.length, ok, count: rows.length };
}

/** First staff reply time and the age of the tickets still open. */
export function supportStats(tickets, slaHours = 48) {
  const replies = [];
  tickets.forEach((t) => {
    const staff = (t.messages || []).filter((m) => m.at && m.author && m.author !== 'customer')[0];
    if (staff) replies.push((new Date(staff.at) - new Date(t.created_date)) / HOUR);
  });
  const open = tickets
    .filter((t) => ['open', 'in_progress', 'waiting_customer'].includes(String(t.status || 'open')))
    .map((t) => ({ id: t.id, subject: t.subject, ticket_number: t.ticket_number, priority: t.priority, ageHours: (Date.now() - new Date(t.created_date)) / HOUR }))
    .sort((a, b) => b.ageHours - a.ageHours);
  return { response: summarize(replies, 'h'), open, overdue: open.filter((t) => t.ageHours > slaHours).length, slaHours };
}

/** Per-courier delivery performance against the delay each partner promises. */
export function courierLevels(shipments, couriers) {
  const targets = {};
  couriers.forEach((c) => { targets[c.name] = c.avg_days ?? null; });
  const map = {};

  shipments.forEach((s) => {
    const name = s.courier_name || 'Non assigné';
    const row = map[name] || (map[name] = { name, delivered: 0, total: 0, days: [], open: 0 });
    row.total += 1;
    const status = String(s.status || '').toUpperCase();
    if (status === 'DELIVERED' && s.delivered_at && s.created_date) {
      const d = (new Date(s.delivered_at) - new Date(s.created_date)) / DAY;
      if (d >= 0) { row.delivered += 1; row.days.push(d); }
    } else if (!['FAILED', 'RETURNED', 'CANCELLED'].includes(status)) {
      row.open += 1;
    }
  });

  Object.keys(targets).forEach((name) => {
    if (!map[name]) map[name] = { name, delivered: 0, total: 0, days: [], open: 0 };
  });

  return Object.values(map)
    .map((row) => {
      const avgDays = row.days.length ? round1(row.days.reduce((s, v) => s + v, 0) / row.days.length) : null;
      const target = targets[row.name] ?? null;
      return {
        ...row,
        avgDays,
        target,
        delta: avgDays != null && target != null ? round1(avgDays - target) : null,
        onTime: avgDays != null && target != null ? avgDays <= target : null,
      };
    })
    .sort((a, b) => (b.delivered || 0) - (a.delivered || 0));
}