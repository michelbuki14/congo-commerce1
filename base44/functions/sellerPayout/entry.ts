import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const METHODS = ['mpesa', 'airtel', 'orange', 'bank'];
const fail = (error: string, status: number) => Response.json({ error }, { status });

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.email) return fail('Connexion requise.', 401);
    const body = await req.json().catch(() => ({}));
    const seller = await base44.asServiceRole.entities.Seller.get(String(body.seller_id || '')).catch(() => null);
    if (!seller) return fail('Boutique introuvable.', 404);
    const email = String(user.email).toLowerCase();
    if (user.role !== 'admin' && ![seller.email, seller.tenant_owner_email].some((x) => String(x || '').toLowerCase() === email)) {
      return fail('Accès refusé.', 403);
    }
    const db = base44.asServiceRole;
    const existing = (await db.entities.SellerPayout.filter({ seller_id: seller.id }))[0];
    if (body.action === 'get') {
      return Response.json({ details: existing || null });
    }
    if (body.action !== 'save') return fail('Action invalide.', 400);
    const method = String(body.payout_method || '');
    const holder = String(body.payout_holder || '').trim().slice(0, 120);
    const account = String(body.payout_account || '').trim().slice(0, 120);
    const bank = String(body.payout_bank_name || '').trim().slice(0, 120);
    if (!METHODS.includes(method) || !holder || !account || (method === 'bank' && !bank)) return fail('Coordonnées de versement invalides.', 400);
    const details = { seller_id: seller.id, owner_email: seller.email || seller.tenant_owner_email, payout_method: method, payout_holder: holder, payout_account: account, payout_bank_name: method === 'bank' ? bank : '', payout_updated_at: new Date().toISOString() };
    const saved = existing ? await db.entities.SellerPayout.update(existing.id, details) : await db.entities.SellerPayout.create(details);
    await db.entities.AuditLog.create({ action: 'seller.payout_details_updated', actor: user.email, entity: 'SellerPayout', entity_id: saved.id, reference: seller.id, severity: 'info', details: { method } });
    return Response.json({ details: saved });
  } catch (error) {
    console.error('sellerPayout:', error);
    return fail('Coordonnées indisponibles. Réessayez.', 500);
  }
}