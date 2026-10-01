import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sameIdentity } from '../../shared/fulfillmentAccess.js';

const error = (message, status = 400) => Response.json({ error: message }, { status });
const editable = { name: 120, city: 100, phone: 40, description: 2000, logo_url: 500, banner_url: 500, delivery_info: 1000 };

export default async function(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return error('Méthode non autorisée', 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id || !user?.email) return error('Authentification requise', 401);
    const body = await req.json().catch(() => ({}));
    if (!['profile', 'productCount', 'follow'].includes(body.action)) return error('Action invalide');
    const db = base44.asServiceRole;
    const seller = await db.entities.Seller.get(String(body.seller_id || '')).catch(() => null);
    if (!seller) return error('Boutique introuvable', 404);
    if (body.action === 'follow') {
      if (seller.status !== 'active') return error('Boutique indisponible', 403);
      const existing = (await db.entities.Follow.filter({ target_type: 'seller', target_id: seller.id, session_id: user.id }))[0];
      if (body.follow === true && !existing) await db.entities.Follow.create({ target_type: 'seller', target_id: seller.id, target_name: seller.name, session_id: user.id });
      else if (body.follow === false && existing) await db.entities.Follow.delete(existing.id);
      else if (typeof body.follow !== 'boolean') return error('Action invalide');
      const followers = await db.entities.Follow.filter({ target_type: 'seller', target_id: seller.id }, '-created_date', 500);
      const updated = await db.entities.Seller.update(seller.id, { followers_count: followers.length });
      return Response.json({ seller: updated });
    }
    if (user.role !== 'admin' && (!sameIdentity(seller.email, user.email) || seller.status === 'suspended')) return error('Accès interdit', 403);
    if (body.action === 'productCount') {
      const products = await db.entities.Product.filter({ seller_id: seller.id }, '-created_date', 500);
      const updated = await db.entities.Seller.update(seller.id, { products_count: products.length });
      return Response.json({ seller: updated });
    }
    const form = body.profile;
    if (!form || typeof form !== 'object' || Array.isArray(form) || Object.keys(form).some((key) => !(key in editable))) return error('Champs non autorisés');
    const patch = {};
    for (const [key, value] of Object.entries(form)) {
      if (typeof value !== 'string' || value.length > editable[key]) return error('Valeur invalide');
      patch[key] = value.trim();
    }
    if (Object.hasOwn(patch, 'name') && !patch.name) return error('Nom de la boutique requis');
    const updated = await db.entities.Seller.update(seller.id, patch);
    await db.entities.AuditLog.create({ action: 'seller.profile_updated', actor: user.email, entity: 'Seller', entity_id: seller.id, details: { fields: Object.keys(patch) } });
    return Response.json({ seller: updated });
  } catch (e) {
    console.error('sellerProfile failed', e);
    return error('Enregistrement impossible', 500);
  }
}