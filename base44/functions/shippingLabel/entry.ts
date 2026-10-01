import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const fail = (error, status = 400) => Response.json({ error }, { status });
const ESC = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

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
      case 'generate': return generateLabel(db, body, user);
      case 'list': return listLabels(db, body);
      case 'get': return getLabel(db, body);
      case 'print': return printLabels(db, body);
      case 'update-status': return updateStatus(db, body, user);
      default: return fail('Action invalide');
    }
  } catch(e) {
    console.error('shipping-label failed', e);
    return fail('Erreur serveur', 500);
  }
}

async function generateLabel(db, body, user) {
  const { order_number, fulfillment_number, carrier, recipient, package_info, shipping_cost_usd } = body;
  if (!order_number || !carrier) return fail('order_number et carrier requis');

  const label_id = `LBL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const tracking_number = generateTracking(carrier);

  const sender = body.sender || { name: 'Congo Commerce', address: 'Kinshasa, RDC', city: 'Kinshasa', country: 'CD', phone: '+243 000 000 000' };
  const label_data = buildLabelHTML(label_id, tracking_number, sender, recipient, package_info, carrier, order_number);
  const now = new Date().toISOString();

  const label = await db.entities.ShippingLabel.create({
    tenant_id: body.tenant_id || '',
    tenant_owner_email: user.email,
    label_id, order_number, fulfillment_number: fulfillment_number || '',
    carrier, tracking_number, status: 'generated',
    label_data, label_url: '',
    sender, recipient, package: package_info || {},
    shipping_cost_usd: Number(shipping_cost_usd) || 0,
    generated_at: now,
  });

  await db.entities.AuditLog.create({ action: 'shipping_label.generated', actor: user.email, entity: 'ShippingLabel', entity_id: label.id, reference: order_number, details: { carrier, tracking_number } });
  return Response.json({ label, tracking_number });
}

async function listLabels(db, body) {
  const { order_number, status } = body;
  const filters: Record<string, unknown> = {};
  if (order_number) filters.order_number = order_number;
  if (status) filters.status = status;
  const labels = await db.entities.ShippingLabel.filter(filters, '-generated_at', 100);
  return Response.json({ labels });
}

async function getLabel(db, body) {
  const { label_id } = body;
  if (!label_id) return fail('label_id requis');
  const label = await db.entities.ShippingLabel.get(label_id).catch(() => null);
  if (!label) return fail('Étiquette introuvable', 404);
  return Response.json({ label });
}

async function printLabels(db, body) {
  const { label_ids } = body;
  if (!label_ids?.length) return fail('label_ids requis');
  const now = new Date().toISOString();
  const results = [];
  for (const id of label_ids) {
    const label = await db.entities.ShippingLabel.get(id);
    if (label) {
      const updated = await db.entities.ShippingLabel.update(id, { status: 'printed', printed_at: now });
      results.push(updated);
    }
  }
  return Response.json({ labels: results, count: results.length });
}

async function updateStatus(db, body, user) {
  const { label_id, status } = body;
  if (!label_id || !status) return fail('label_id et status requis');
  const label = await db.entities.ShippingLabel.update(label_id, { status });
  await db.entities.AuditLog.create({ action: 'shipping_label.status_changed', actor: user.email, entity: 'ShippingLabel', entity_id: label_id, details: { status } });
  return Response.json({ label });
}

function generateTracking(carrier) {
  const prefixes = { dhl: 'DHL', fedex: 'FDX', ups: 'UPS', china_post: 'CP', ems: 'EMS', congo_courier: 'CC', custom: 'CUSTOM' };
  const prefix = prefixes[carrier] || 'CC';
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function buildLabelHTML(label_id, tracking_number, sender, recipient, pkg, carrier, order_number) {
  const w = 4, h = 3;
  return `<div style="width:${w}in;height:${h}in;border:2px solid #000;padding:10px;font-family:sans-serif;font-size:11px;box-sizing:border-box">
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px">
      <b>Congo Commerce</b><span style="font-size:10px">${ESC(order_number)}</span>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:8px">
      <div style="flex:1"><b>DE:</b><br/>${ESC(sender.name)}<br/>${ESC(sender.address)}<br/>${ESC(sender.city)}, ${ESC(sender.country)}<br/>${ESC(sender.phone)}</div>
      <div style="flex:1"><b>À:</b><br/>${ESC(recipient.name)}<br/>${ESC(recipient.address)}<br/>${ESC(recipient.city)}, ${ESC(recipient.country)}<br/>${ESC(recipient.phone)}</div>
    </div>
    <div style="border:1px solid #000;padding:6px;text-align:center;margin-bottom:6px">
      <div style="font-size:14px;font-weight:bold">${ESC(tracking_number)}</div>
      <div style="font-size:10px;color:#666">${ESC(carrier)}</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px">
      <span>Poids: ${pkg.weight_kg || 0}kg | ${pkg.length_cm || 0}×${pkg.width_cm || 0}×${pkg.height_cm || 0}cm</span>
      <span>Articles: ${pkg.items_count || 0}</span>
    </div>
    <div style="margin-top:4px;font-size:9px;color:#888">ID: ${ESC(label_id)}</div>
  </div>`;
}
