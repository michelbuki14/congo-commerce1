import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireAdmin } from '../../shared/security.ts';

const fail = (error, status = 400) => Response.json({ error }, { status });

export default async function(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return fail('Méthode non autorisée', 405);
    const base44 = createClientFromRequest(req);
    // Sourcing runs as the service role and mutates purchase orders, receipts
    // and consolidations, so it is reserved to administrators.
    const gate = await requireAdmin(base44);
    if (!gate.ok) return gate.response;
    const user = gate.user;
    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    switch (action) {
      case 'list-po': return listPO(db, body);
      case 'create-po': return createPO(db, body, user);
      case 'update-po': return updatePO(db, body, user);
      case 'receive': return receivePO(db, body, user);
      case 'inspect': return inspectPO(db, body, user);
      case 'consolidate': return consolidate(db, body, user);
      case 'history': return history(db, body);
      default: return fail('Action invalide');
    }
  } catch(e) {
    console.error('china-sourcing failed', e);
    return fail('Erreur serveur', 500);
  }
}

async function listPO(db, body) {
  const { supplier_id, status, warehouse_id } = body;
  const filters = {};
  if (supplier_id) filters.supplier_id = supplier_id;
  if (status) filters.status = status;
  if (warehouse_id) filters.warehouse_id = warehouse_id;
  const pos = await db.entities.ChinaPurchaseOrder.filter(filters, '-created_date', 100);
  return Response.json({ purchase_orders: pos });
}

async function createPO(db, body, user) {
  const { supplier_id, supplier_name, warehouse_id, items, total_cost_usd, expected_date } = body;
  if (!supplier_id || !items?.length) return fail('Fournisseur et articles requis');
  const po = await db.entities.ChinaPurchaseOrder.create({
    tenant_id: body.tenant_id || '',
    tenant_owner_email: user.email,
    po_number: `PO-${Date.now().toString(36).toUpperCase()}`,
    supplier_id, supplier_name: supplier_name || '',
    warehouse_id: warehouse_id || '', warehouse_name: body.warehouse_name || '',
    items, total_cost_usd: Number(total_cost_usd) || 0,
    status: 'created',
    expected_date: expected_date || null,
    created_by: user.email,
  });
  await db.entities.AuditLog.create({ action: 'china_sourcing.po_created', actor: user.email, entity: 'ChinaPurchaseOrder', entity_id: po.id, reference: po.po_number, details: { supplier_id, total_cost_usd: po.total_cost_usd } });
  return Response.json({ purchase_order: po });
}

async function updatePO(db, body, user) {
  const { id, ...updates } = body;
  if (!id) return fail('ID requis');
  const allowed = ['status', 'expected_date', 'notes', 'items'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  const po = await db.entities.ChinaPurchaseOrder.update(id, filtered);
  await db.entities.AuditLog.create({ action: 'china_sourcing.po_updated', actor: user.email, entity: 'ChinaPurchaseOrder', entity_id: id, reference: po.po_number, details: filtered });
  return Response.json({ purchase_order: po });
}

async function receivePO(db, body, user) {
  const { id, warehouse_id, warehouse_name, items } = body;
  const po = await db.entities.ChinaPurchaseOrder.get(id);
  if (!po) return fail('PO introuvable', 404);
  if (po.status !== 'shipped') return fail('Seules les PO expédiées peuvent être réceptionnées', 409);
  const now = new Date().toISOString();
  const receipt = await db.entities.ChinaWarehouseReceipt.create({
    tenant_id: po.tenant_id,
    tenant_owner_email: user.email,
    receipt_id: `RCP-${Date.now().toString(36).toUpperCase()}`,
    warehouse_id, warehouse_name,
    supplier_id: po.supplier_id, supplier_name: po.supplier_name,
    purchase_order: po.po_number,
    status: 'received',
    items: items || po.items,
    total_cost_usd: po.total_cost_usd,
    received_by: user.email,
    received_at: now,
  });
  await db.entities.ChinaPurchaseOrder.update(id, { status: 'received' });
  await db.entities.AuditLog.create({ action: 'china_sourcing.received', actor: user.email, entity: 'ChinaPurchaseOrder', entity_id: id, reference: po.po_number });
  return Response.json({ receipt, purchase_order: await db.entities.ChinaPurchaseOrder.get(id) });
}

async function inspectPO(db, body, user) {
  const { receipt_id, status, notes, photo_urls } = body;
  if (!receipt_id || !status) return fail('receipt_id et status requis');
  if (!['approved', 'rejected', 'partial'].includes(status)) return fail('Status invalide', 400);
  const receipt = await db.entities.ChinaWarehouseReceipt.update(receipt_id, {
    status, inspection_notes: notes || '', inspected_by: user.email, inspected_at: new Date().toISOString(),
    photo_urls: photo_urls || receipt.photo_urls,
  });
  await db.entities.AuditLog.create({ action: 'china_sourcing.inspected', actor: user.email, entity: 'ChinaWarehouseReceipt', entity_id: receipt_id, details: { status, notes } });
  return Response.json({ receipt });
}

async function consolidate(db, body, user) {
  const { warehouse_id, receipt_ids } = body;
  if (!receipt_ids?.length) return fail('receipt_ids requis');
  const receipts = await Promise.all(receipt_ids.map((id) => db.entities.ChinaWarehouseReceipt.get(id)));
  const allItems = receipts.flatMap((r) => r.items || []);
  const totalCost = receipts.reduce((s, r) => s + (Number(r.total_cost_usd) || 0), 0);
  const consolidation = await db.entities.ChinaConsolidation.create({
    tenant_id: body.tenant_id || '',
    tenant_owner_email: user.email,
    consolidation_id: `CON-${Date.now().toString(36).toUpperCase()}`,
    warehouse_id, warehouse_name: body.warehouse_name || '',
    receipt_ids, items: allItems, total_cost_usd: totalCost,
    status: 'consolidated',
    created_by: user.email,
  });
  for (const rid of receipt_ids) {
    await db.entities.ChinaWarehouseReceipt.update(rid, { status: 'approved' });
  }
  await db.entities.AuditLog.create({ action: 'china_sourcing.consolidated', actor: user.email, entity: 'ChinaConsolidation', entity_id: consolidation.id, details: { receipt_count: receipt_ids.length, total_cost_usd: totalCost } });
  return Response.json({ consolidation });
}

async function history(db, body) {
  const { supplier_id, limit = 50 } = body;
  const filters = {};
  if (supplier_id) filters.supplier_id = supplier_id;
  const pos = await db.entities.ChinaPurchaseOrder.filter(filters, '-created_date', limit);
  return Response.json({ history: pos });
}