import { base44 } from '@/api/base44Client';

/**
 * Operational health of the marketplace, derived from real records rather than a
 * hand-kept checklist: payment outcomes per gateway, how couriers actually behave
 * on their assignments, and platform-event / workflow failures.
 */

const HOUR = 3600000;
const DAY = 86400000;
const CLOSED_SHIPMENT = ['DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'];

export const HEALTH_LABELS = { ok: 'Opérationnel', degraded: 'Dégradé', down: 'Perturbé', unknown: 'Sans données' };
export const HEALTH_TONES = { ok: 'good', degraded: 'warn', down: 'bad', unknown: 'default' };

const daysSince = (iso) => (Date.now() - new Date(iso).getTime()) / DAY;

/** Payment gateway health from real order outcomes. */
export function gatewayHealth(orders, days = 7) {
  const since = Date.now() - days * DAY;
  const map = {};
  orders
    .filter((o) => new Date(o.created_date).getTime() >= since)
    .forEach((o) => {
      const name = o.payment_provider || o.payment_method || 'Passerelle non précisée';
      const row = map[name] || (map[name] = { name, attempts: 0, paid: 0, failed: 0, volume: 0, lastSuccess: null });
      row.attempts += 1;
      const status = String(o.payment_status || '');
      if (status === 'PAID') {
        row.paid += 1;
        row.volume += Number(o.total_usd) || 0;
        if (!row.lastSuccess || o.created_date > row.lastSuccess) row.lastSuccess = o.created_date;
      }
      if (status === 'FAILED' || status === 'CANCELLED') row.failed += 1;
    });

  return Object.values(map)
    .map((row) => {
      const rate = row.attempts ? row.paid / row.attempts : 0;
      const status = !row.attempts ? 'unknown' : rate >= 0.9 ? 'ok' : rate >= 0.6 ? 'degraded' : 'down';
      return {
        ...row,
        rate,
        status,
        detail: `${row.paid}/${row.attempts} paiement(s) confirmé(s) sur ${days} jours · ${row.failed} échec(s)`,
      };
    })
    .sort((a, b) => b.attempts - a.attempts);
}

/** Logistics partner health: acceptance, completion and how long work sits open. */
export function courierHealth(couriers, shipments, days = 7) {
  const since = Date.now() - days * DAY;
  const map = {};

  couriers.forEach((c) => {
    map[c.name] = {
      name: c.name,
      registered: true,
      active: c.active !== false,
      isMock: c.is_mock !== false,
      target: c.avg_days ?? null,
      areas: c.service_areas || [],
      total: 0,
      delivered: 0,
      declined: 0,
      openCount: 0,
      openAgeDays: 0,
      lastSeen: null,
    };
  });

  shipments
    .filter((s) => new Date(s.created_date).getTime() >= since)
    .forEach((s) => {
      const name = s.courier_name || 'Non assigné';
      const row = map[name] || (map[name] = { name, registered: false, active: true, total: 0, delivered: 0, declined: 0, openCount: 0, openAgeDays: 0, lastSeen: null });
      row.total += 1;
      const status = String(s.status || '').toUpperCase();
      if (status === 'DELIVERED') row.delivered += 1;
      if (s.courier_response === 'declined') row.declined += 1;
      if (!CLOSED_SHIPMENT.includes(status)) {
        row.openCount += 1;
        row.openAgeDays += daysSince(s.created_date);
      }
      if (!row.lastSeen || s.created_date > row.lastSeen) row.lastSeen = s.created_date;
    });

  return Object.values(map)
    .map((row) => {
      const stale = row.openCount ? row.openAgeDays / row.openCount : 0;
      const declineRate = row.total ? row.declined / row.total : 0;
      let status = 'ok';
      if (!row.registered || row.active === false) status = 'unknown';
      else if (stale > 4 || declineRate > 0.3) status = 'down';
      else if (stale > 2 || declineRate > 0.15) status = 'degraded';

      return {
        ...row,
        stale,
        declineRate,
        status,
        detail: row.total
          ? `${row.total} course(s) · ${row.delivered} livrée(s) · ${row.openCount} en cours`
          : 'Aucune course sur la période',
        meta: row.openCount ? `Course la plus ancienne : ${stale.toFixed(1)} j` : row.lastSeen ? `Dernière course : ${new Date(row.lastSeen).toLocaleDateString('fr-FR')}` : '',
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** Core marketplace services, read from events, workflow runs and live traffic. */
export function coreServiceHealth({ events, executions, orders, products, sellers }) {
  const failedEvents = events.filter((e) => String(e.status || '') === 'failed');
  const failedRuns = executions.filter((x) => String(x.status || '') === 'FAILED' || x.dead_letter);
  const stuckRuns = executions.filter(
    (x) => ['RUNNING', 'WAITING', 'RETRYING'].includes(String(x.status || '')) && daysSince(x.updated_date || x.created_date) > 0.25,
  );
  const orders24 = orders.filter((o) => new Date(o.created_date).getTime() >= Date.now() - DAY);
  const liveProducts = products.filter((p) => String(p.status || '') === 'published');
  const rank = (n, warn) => (n > warn ? 'down' : n > 0 ? 'degraded' : 'ok');

  return [
    {
      name: 'Commandes & checkout',
      detail: `${orders24.length} commande(s) sur 24 h · ${orders.length} sur la période analysée`,
      status: orders24.length ? 'ok' : 'unknown',
      meta: 'Parcours d’achat et paiement',
    },
    {
      name: 'Moteur de workflows',
      detail: `${failedRuns.length} exécution(s) en échec · ${stuckRuns.length} bloquée(s) depuis plus de 6 h`,
      status: rank(failedRuns.length + stuckRuns.length, 2),
      meta: 'Orchestration des commandes et onboarding',
    },
    {
      name: 'Bus d’événements',
      detail: `${failedEvents.length} événement(s) non traité(s) sur ${events.length} récents`,
      status: rank(failedEvents.length, 2),
      meta: 'Dispatch des événements métier',
    },
    {
      name: 'Catalogue & boutiques',
      detail: `${liveProducts.length} produit(s) en ligne · ${sellers.filter((s) => s.status !== 'suspended').length} boutique(s) active(s)`,
      status: sellers.length && liveProducts.length ? 'ok' : 'degraded',
      meta: 'Disponibilité de l’offre',
    },
  ];
}

/** Most recent failures worth acting on. */
export function recentIncidents(events, executions, limit = 8) {
  const rows = [
    ...events
      .filter((e) => String(e.status || '') === 'failed')
      .map((e) => ({
        id: `ev-${e.id}`,
        at: e.updated_date || e.created_date,
        kind: 'Événement',
        title: e.name,
        detail: e.description || e.source || 'Événement non traité',
        severity: e.severity || 'warning',
      })),
    ...executions
      .filter((x) => String(x.status || '') === 'FAILED' || x.dead_letter)
      .map((x) => ({
        id: `wf-${x.id}`,
        at: x.updated_date || x.created_date,
        kind: 'Workflow',
        title: x.workflow_name || x.workflow_code,
        detail: x.error || 'Exécution en échec',
        severity: x.dead_letter ? 'critical' : 'warning',
      })),
  ];
  return rows.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit);
}

export function overallStatus(rows) {
  if (rows.some((r) => r.status === 'down')) return 'down';
  if (rows.some((r) => r.status === 'degraded')) return 'degraded';
  if (!rows.some((r) => r.status === 'ok')) return 'unknown';
  return 'ok';
}

export async function loadPlatformHealth() {
  const [orders, shipments, couriers, events, executions, products, sellers] = await Promise.all([
    base44.entities.Order.list('-created_date', 500).catch(() => []),
    base44.entities.Shipment.list('-created_date', 500).catch(() => []),
    base44.entities.Courier.list('name', 50).catch(() => []),
    base44.entities.PlatformEvent.list('-created_date', 200).catch(() => []),
    base44.entities.WorkflowExecution.list('-created_date', 200).catch(() => []),
    base44.entities.Product.list('-created_date', 500).catch(() => []),
    base44.entities.Seller.list('name', 200).catch(() => []),
  ]);

  const gateways = gatewayHealth(orders);
  const partners = courierHealth(couriers, shipments);
  const services = coreServiceHealth({ events, executions, orders, products, sellers });

  return {
    gateways,
    partners,
    services,
    incidents: recentIncidents(events, executions),
    overall: overallStatus([...gateways, ...partners, ...services]),
    loadedAt: new Date().toISOString(),
  };
}