import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const PAGE_SIZE = 500;
const MAX_PAGES = 20;

async function recent(entity, since) {
  const rows = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const batch = await entity.filter({ created_date: { $gte: since } }, '-created_date', PAGE_SIZE, page * PAGE_SIZE);
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
  throw new Error('Trop de données sur la période pour afficher un rapport complet.');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user?.role !== 'admin') return Response.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 });

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
    const since = start.toISOString();
    const db = base44.asServiceRole.entities;
    const [orders, clicks] = await Promise.all([recent(db.Order, since), recent(db.AffiliateClick, since)]);
    const paid = orders.filter(o => o.payment_status === 'PAID' && o.status !== 'CANCELLED' && o.is_demo !== true);
    const orderByNumber = new Map(paid.map(o => [o.order_number, o]));

    const daily = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
      return { date, day: date.slice(5), revenue: 0, orders: 0 };
    });
    const dayByDate = new Map(daily.map(day => [day.date, day]));
    paid.forEach(o => {
      const bucket = dayByDate.get(String(o.created_date || '').slice(0, 10));
      if (bucket) { bucket.revenue += Number(o.total_usd) || 0; bucket.orders += 1; }
    });
    daily.forEach(d => { d.revenue = Math.round(d.revenue * 100) / 100; });

    const productIds = [...new Set(paid.flatMap(o => (Array.isArray(o.items) ? o.items : []).map(i => i.product_id).filter(Boolean)))];
    if (productIds.length > 5000) throw new Error('Trop de produits pour afficher un classement complet.');
    const productNames = new Map();
    for (let i = 0; i < productIds.length; i += 25) {
      const batch = await Promise.all(productIds.slice(i, i + 25).map(id => db.Product.get(id).catch(() => null)));
      batch.forEach(p => { if (p) productNames.set(p.id, p.category_name || 'Non classé'); });
    }
    const byCategory = new Map();
    paid.forEach(o => (Array.isArray(o.items) ? o.items : []).forEach(item => {
      const name = item.category_name || productNames.get(item.product_id) || 'Non classé';
      const row = byCategory.get(name) || { name, units: 0, revenue: 0 };
      row.units += Number(item.quantity) || 0;
      row.revenue += Number(item.line_total_usd) || (Number(item.unit_price_usd) || 0) * (Number(item.quantity) || 0);
      byCategory.set(name, row);
    }));
    const categories = [...byCategory.values()].map(c => ({ ...c, revenue: Math.round(c.revenue * 100) / 100 }))
      .sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 8);

    const byCreator = new Map();
    clicks.forEach(click => {
      const id = click.creator_id || click.referral_code;
      if (!id) return;
      const row = byCreator.get(id) || { id, name: click.creator_name || click.referral_code, sessions: new Set(), conversions: new Set() };
      const session = click.session_id || click.id;
      row.sessions.add(session);
      const order = orderByNumber.get(click.order_number);
      if (order && (order.creator_id === click.creator_id || order.affiliate_code === click.referral_code)) row.conversions.add(session);
      byCreator.set(id, row);
    });
    const creators = [...byCreator.values()].map(c => ({ id: c.id, name: c.name, clicks: c.sessions.size,
      conversions: c.conversions.size, rate: c.sessions.size ? Math.round(1000 * c.conversions.size / c.sessions.size) / 10 : 0 }))
      .sort((a, b) => b.rate - a.rate || b.clicks - a.clicks).slice(0, 10);

    return Response.json({ daily, categories, creators, totalRevenue: Math.round(paid.reduce((s, o) => s + (Number(o.total_usd) || 0), 0) * 100) / 100, totalOrders: paid.length });
  } catch (error) {
    console.error('superAdminSales:', error);
    return Response.json({ error: 'Impossible de charger les ventes.' }, { status: 500 });
  }
}