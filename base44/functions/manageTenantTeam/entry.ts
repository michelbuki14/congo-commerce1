import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const ROLES = ['TENANT_ADMIN', 'FINANCE_ADMIN', 'SUPPORT', 'SELLER', 'CREATOR', 'COURIER'];
const KEYS = ['PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE', 'ORDER_READ', 'ORDER_UPDATE', 'REFUND_CREATE', 'SELLER_APPROVE', 'SELLER_SUSPEND', 'FINANCE_READ', 'PAYOUT_APPROVE', 'SUPPLIER_MANAGE', 'ANALYTICS_READ', 'DOMAIN_MANAGE', 'TEAM_MANAGE'];
const DEFAULTS = {
  TENANT_ADMIN: KEYS,
  FINANCE_ADMIN: ['ORDER_READ', 'REFUND_CREATE', 'FINANCE_READ', 'PAYOUT_APPROVE', 'ANALYTICS_READ'],
  SUPPORT: ['ORDER_READ', 'ORDER_UPDATE', 'PRODUCT_UPDATE'],
  SELLER: ['PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE', 'ORDER_READ', 'ORDER_UPDATE'],
  CREATOR: ['ANALYTICS_READ'],
  COURIER: ['ORDER_READ'],
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Authentification requise' }, { status: 401 });
    const input = await req.json();
    const tenantId = String(input.tenantId || '');
    if (!tenantId) return Response.json({ error: 'Enseigne requise' }, { status: 400 });
    const tenant = await base44.asServiceRole.entities.Tenant.get(tenantId).catch(() => null);
    if (!tenant) return Response.json({ error: 'Enseigne introuvable' }, { status: 404 });
    const email = String(user.email || '').trim().toLowerCase();
    const owner = email && String(tenant.owner_email || '').trim().toLowerCase() === email;
    const admin = user.role === 'admin';
    const ownMember = (await base44.asServiceRole.entities.TenantMember.filter({ tenant_id: tenantId, email })).find(m => m.status !== 'suspended');
    const member = ownMember || null;
    const permissions = admin || owner ? KEYS : (member?.permissions || []).filter(p => KEYS.includes(p));
    const granted = admin || owner || !!member;
    if (input.action === 'access') return Response.json({ granted, owner: !!(admin || owner), permissions, role: admin || owner ? 'TENANT_ADMIN' : member?.role || '' });
    if (!granted || !permissions.includes('TEAM_MANAGE')) return Response.json({ error: 'Accès refusé' }, { status: 403 });
    if (input.action === 'list') {
      const members = await base44.asServiceRole.entities.TenantMember.filter({ tenant_id: tenantId }, '-created_date', 200);
      return Response.json({ members });
    }
    if (input.action === 'bootstrap') {
      if (!admin && (!owner || tenant.created_by_id !== user.id)) return Response.json({ error: 'Accès refusé' }, { status: 403 });
      if (ownMember) return Response.json({ member: ownMember });
      const created = await base44.asServiceRole.entities.TenantMember.create({ tenant_id: tenantId, tenant_name: tenant.name, owner_email: tenant.owner_email, email, full_name: user.full_name || '', role: 'TENANT_ADMIN', permissions: KEYS, status: 'active', invited_by: email });
      return Response.json({ member: created });
    }
    if (input.action === 'invite') {
      const target = String(input.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target) || !ROLES.includes(input.role)) return Response.json({ error: 'Adresse ou rôle invalide' }, { status: 400 });
      if (target === String(tenant.owner_email || '').trim().toLowerCase()) return Response.json({ error: 'Le propriétaire dispose déjà des droits' }, { status: 400 });
      if (!admin && !owner && (input.role === 'TENANT_ADMIN' || DEFAULTS[input.role].some(p => !permissions.includes(p)))) return Response.json({ error: 'Droits insuffisants' }, { status: 403 });
      const existing = await base44.asServiceRole.entities.TenantMember.filter({ tenant_id: tenantId, email: target });
      if (existing.length) return Response.json({ error: 'Membre déjà attribué' }, { status: 409 });
      const created = await base44.asServiceRole.entities.TenantMember.create({ tenant_id: tenantId, tenant_name: tenant.name, owner_email: tenant.owner_email, email: target, full_name: String(input.name || '').slice(0, 120), role: input.role, permissions: DEFAULTS[input.role], status: 'active', invited_by: email });
      return Response.json({ member: created });
    }
    const targetId = String(input.memberId || '');
    const target = targetId ? await base44.asServiceRole.entities.TenantMember.get(targetId).catch(() => null) : null;
    if (!target || target.tenant_id !== tenantId) return Response.json({ error: 'Membre introuvable' }, { status: 404 });
    if (String(target.email || '').toLowerCase() === String(tenant.owner_email || '').toLowerCase()) return Response.json({ error: 'Le propriétaire ne peut pas être modifié' }, { status: 403 });
    if (!admin && !owner && (target.role === 'TENANT_ADMIN' || input.role === 'TENANT_ADMIN' || input.action === 'permissions' && input.permissions?.includes('TEAM_MANAGE'))) return Response.json({ error: 'Droits insuffisants' }, { status: 403 });
    if (input.action === 'role') {
      if (!ROLES.includes(input.role)) return Response.json({ error: 'Rôle invalide' }, { status: 400 });
      if (!admin && !owner && DEFAULTS[input.role].some(p => !permissions.includes(p))) return Response.json({ error: 'Droits insuffisants' }, { status: 403 });
      const updated = await base44.asServiceRole.entities.TenantMember.update(target.id, { role: input.role, permissions: DEFAULTS[input.role] });
      return Response.json({ member: updated });
    }
    if (input.action === 'permissions') {
      if (!Array.isArray(input.permissions) || input.permissions.some(p => !KEYS.includes(p))) return Response.json({ error: 'Permissions invalides' }, { status: 400 });
      if (!admin && !owner && input.permissions.some(p => !permissions.includes(p))) return Response.json({ error: 'Droits insuffisants' }, { status: 403 });
      const updated = await base44.asServiceRole.entities.TenantMember.update(target.id, { permissions: [...new Set(input.permissions)] });
      return Response.json({ member: updated });
    }
    if (input.action === 'remove') {
      await base44.asServiceRole.entities.TenantMember.delete(target.id);
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('manageTenantTeam:', error);
    return Response.json({ error: 'Gestion de l’équipe indisponible' }, { status: 500 });
  }
}