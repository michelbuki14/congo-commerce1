import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const fail = (error, status = 400) => Response.json({ error }, { status });

export default async function(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return fail('Méthode non autorisée', 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.email) return fail('Authentification requise', 401);
    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    switch (action) {
      case 'list': return listWarehouses(db, body);
      case 'create': return createWarehouse(db, body, user);
      case 'update': return updateWarehouse(db, body, user);
      case 'delete': return deleteWarehouse(db, body, user);
      case 'inventory': return listInventory(db, body);
      case 'add-stock': return addStock(db, body, user);
      case 'reserve': return reserveStock(db, body, user);
      default: return fail('Action invalide');
    }
  } catch(e) {
    console.error('china-warehouse failed', e);
    return fail('Erreur serveur', 500);
  }
}

async function listWarehouses(db, body) {
  const warehouses = await db.entities.ChinaWarehouse.list('-active', 200);
  const withCounts = await Promise.all(warehouses.map(async (w) => {
    const inv = await db.entities.ChinaWarehouseInventory.filter({ warehouse_id: w.id }, '', 500).catch(() => []);
    return { ...w, product_count: inv.length, total_qty: inv.reduce((s, i) => s + (Number(i.quantity_on_hand) || 0), 0) };
  }));
  return Response.json({ warehouses: withCounts });
}

async function createWarehouse(db, body, user) {
  const { name, city, province, address, contact_name, contact_phone, manager_email, operating_hours, capacity_sqm } = body;
  if (!name || !city) return fail('Nom et ville requis');
  const warehouse = await db.entities.ChinaWarehouse.create({
    tenant_id: body.tenant_id || '',
    tenant_owner_email: user.email,
    name, city, province: province || '', address: address || '',
    contact_name: contact_name || '', contact_phone: contact_phone || '',
    manager_email: manager_email || '', operating_hours: operating_hours || '',
    capacity_sqm: Number(capacity_sqm) || 0, active: true,
  });
  await db.entities.AuditLog.create({ action: 'china_warehouse.created', actor: user.email, entity: 'ChinaWarehouse', entity_id: warehouse.id, reference: name, details: { city, province } });
  return Response.json({ warehouse });
}

async function updateWarehouse(db, body, user) {
  const { id, ...updates } = body;
  if (!id) return fail('ID requis');
  const allowed = ['name', 'city', 'province', 'address', 'contact_name', 'contact_phone', 'manager_email', 'operating_hours', 'capacity_sqm', 'active'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  const warehouse = await db.entities.ChinaWarehouse.update(id, filtered);
  await db.entities.AuditLog.create({ action: 'china_warehouse.updated', actor: user.email, entity: 'ChinaWarehouse', entity_id: id, details: filtered });
  return Response.json({ warehouse });
}

async function deleteWarehouse(db, body, user) {
  const { id } = body;
  if (!id) return fail('ID requis');
  await db.entities.ChinaWarehouse.delete(id);
  await db.entities.AuditLog.create({ action: 'china_warehouse.deleted', actor: user.email, entity: 'ChinaWarehouse', entity_id: id });
  return Response.json({ deleted: true });
}

async function listInventory(db, body) {
  const { warehouse_id } = body;
  if (!warehouse_id) return fail('warehouse_id requis');
  const inventory = await db.entities.ChinaWarehouseInventory.filter({ warehouse_id }, '-quantity_on_hand', 500);
  return Response.json({ inventory });
}

async function addStock(db, body, user) {
  const { warehouse_id, product_id, product_title, sku, supplier_id, supplier_name, quantity, cost_usd, location, lead_time_days } = body;
  if (!warehouse_id || !product_id || !sku || !quantity) return fail('Champs requis manquants');

  const existing = await db.entities.ChinaWarehouseInventory.filter({ warehouse_id, product_id });
  if (existing.length > 0) {
    const inv = existing[0];
    const newQty = (Number(inv.quantity_on_hand) || 0) + Number(quantity);
    const updated = await db.entities.ChinaWarehouseInventory.update(inv.id, {
      quantity_on_hand: newQty,
      quantity_available: (Number(inv.quantity_available) || 0) + Number(quantity),
      last_receipt_at: new Date().toISOString(),
      cost_usd: cost_usd || inv.cost_usd,
    });
    await db.entities.AuditLog.create({ action: 'china_warehouse.stock_added', actor: user.email, entity: 'ChinaWarehouseInventory', entity_id: inv.id, details: { quantity, newQty } });
    return Response.json({ inventory: updated });
  }

  const inv = await db.entities.ChinaWarehouseInventory.create({
    tenant_id: body.tenant_id || '',
    tenant_owner_email: user.email,
    warehouse_id, warehouse_name: body.warehouse_name || '',
    product_id, product_title: product_title || '', sku,
    supplier_id: supplier_id || '', supplier_name: supplier_name || '',
    quantity_on_hand: Number(quantity),
    quantity_reserved: 0,
    quantity_in_transit: 0,
    quantity_available: Number(quantity),
    location: location || '',
    cost_usd: Number(cost_usd) || 0,
    moq: body.moq || 1,
    lead_time_days: Number(lead_time_days) || 14,
    last_receipt_at: new Date().toISOString(),
    active: true,
  });
  await db.entities.AuditLog.create({ action: 'china_warehouse.stock_created', actor: user.email, entity: 'ChinaWarehouseInventory', entity_id: inv.id, details: { quantity } });
  return Response.json({ inventory: inv });
}

async function reserveStock(db, body, user) {
  const { inventory_id, quantity, order_id, order_number } = body;
  if (!inventory_id || !quantity) return fail('inventory_id et quantity requis');
  const inv = await db.entities.ChinaWarehouseInventory.get(inventory_id);
  if (!inv) return fail('Inventaire introuvable', 404);
  const available = (Number(inv.quantity_available) || 0);
  const qty = Number(quantity);
  if (available < qty) return fail(`Stock insuffisant: ${available} disponible(s), ${qty} demandé(s)`, 409);
  const updated = await db.entities.ChinaWarehouseInventory.update(inventory_id, {
    quantity_reserved: (Number(inv.quantity_reserved) || 0) + qty,
    quantity_available: available - qty,
  });
  await db.entities.AuditLog.create({ action: 'china_warehouse.stock_reserved', actor: user.email, entity: 'ChinaWarehouseInventory', entity_id: inventory_id, reference: order_number, details: { quantity: qty, order_id } });
  return Response.json({ inventory: updated });
}
