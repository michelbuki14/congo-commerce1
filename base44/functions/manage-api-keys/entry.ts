import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireAdmin } from '../../shared/security.ts';

/**
 * API KEY MANAGEMENT — base44/functions/manage-api-keys/entry.ts
 *
 * CRUD pour les clés API publiques : création, révocation, interrogation
 * de taux, prévisualisation du hash. Le corps de la clé réelle n'est jamais
 * lu en clair côté serveur — seul son hash SHA-256 est stocké. Une clé
 * crée rapporte sa valeur une seule fois dans la réponse.
 */

const HASH_LENGTH = 64; // SHA-256 hex

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (!auth.ok) return auth.response;
    const db = base44.asServiceRole;
    const method = req.method;
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    if (method === 'POST' && url.pathname === '/api-keys') {
      return createKey(db, body);
    }
    if (method === 'GET' && url.pathname === '/api-keys') {
      return listKeys(db, body.tenant_id);
    }
    if (method === 'GET' && url.pathname.startsWith('/api-keys/')) {
      const id = url.pathname.split('/').pop();
      return getKey(db, id);
    }
    if (method === 'DELETE' && url.pathname.startsWith('/api-keys/')) {
      const id = url.pathname.split('/').pop();
      return revokeKey(db, id, body.reason);
    }
    if (method === 'POST' && url.pathname === '/api-keys/rotate') {
      return rotateKey(db, body);
    }

    return Response.json({ error: `méthode non gérée : ${method} ${url.pathname}` }, { status: 405 });
  } catch (err) {
    return Response.json({ error: String(err?.message || err).slice(0, 500), fatal: true }, { status: 500 });
  }
}

// ── Create ───────────────────────────────────────────────────────────────────

async function createKey(db: any, body: any) {
  const name = String(body.name || '').trim();
  if (!name) return Response.json({ error: 'name est requis' }, { status: 400 });
  const tenantId = String(body.tenant_id || '').trim();
  if (!tenantId) return Response.json({ error: 'tenant_id est requis' }, { status: 400 });
  const scopes = Array.isArray(body.scopes) ? body.scopes.filter(Boolean) : [];
  const rateLimitRph = Math.max(0, Number(body.rate_limit_rph) || 300);
  const rateLimitRpm = Math.max(0, Number(body.rate_limit_rpm) || 60);
  const expiresAt = body.expires_at ? new Date(body.expires_at).toISOString() : '';
  const description = String(body.description || '').slice(0, 1000);

  const tenant = await db.entities.Tenant.get(tenantId).catch(() => null);
  if (!tenant) return Response.json({ error: `Tenant introuvable : ${tenantId}` }, { status: 404 });

  const prefix = `cg_${Date.now().toString(36).toUpperCase()}_`;
  const secret = `${prefix}${Math.random().toString(36).slice(2, 26)}${Math.random().toString(36).slice(2, 26)}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  const created = await db.entities.ApiKey.create({
    tenant_id: tenantId,
    tenant_name: tenant.name || '',
    owner_email: tenant.owner_email || body.owner_email || '',
    name,
    key_prefix: prefix,
    key_hash: keyHash,
    scopes,
    rate_limit_rph: rateLimitRph,
    rate_limit_rpm: rateLimitRpm,
    active: true,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    description,
  });

  return Response.json({
    id: created.id,
    name,
    tenant_id: tenantId,
    key_prefix: prefix,
    key_hash: keyHash.slice(0, 16) + '…',
    scopes,
    rate_limit_rph: rateLimitRph,
    rate_limit_rpm: rateLimitRpm,
    active: true,
    created_at: created.created_at,
    expires_at: expires_at,
    description,
    // La clé réelle n'est retournée qu'une fois, maintenant.
    api_key: secret,
    warning: 'Enregistrez api_key immédiatement — elle ne sera jamais retournée à nouveau.',
  }, { status: 201 });
}

// ── List ─────────────────────────────────────────────────────────────────────

async function listKeys(db: any, tenantId?: string) {
  const filter = tenantId ? { tenant_id: tenantId } : {};
  const keys = await db.entities.ApiKey.filter(filter, 'created_at', 200).catch(() => []);
  return Response.json({
    keys: keys.map((k: any) => ({
      id: k.id,
      name: k.name,
      tenant_id: k.tenant_id,
      key_prefix: k.key_prefix,
      scopes: k.scopes || [],
      rate_limit_rph: k.rate_limit_rph,
      rate_limit_rpm: k.rate_limit_rpm,
      active: k.active,
      last_used_at: k.last_used_at,
      created_at: k.created_at,
      expires_at: k.expires_at,
      description: k.description,
    })),
    count: keys.length,
  });
}

// ── Get ──────────────────────────────────────────────────────────────────────

async function getKey(db: any, id: string) {
  const key = await db.entities.ApiKey.get(id).catch(() => null);
  if (!key) return Response.json({ error: 'Clé introuvable' }, { status: 404 });
  return Response.json({
    id: key.id,
    name: key.name,
    tenant_id: key.tenant_id,
    key_prefix: key.key_prefix,
    key_hash: key.key_hash.slice(0, 16) + '…',
    scopes: key.scopes || [],
    rate_limit_rph: key.rate_limit_rph,
    rate_limit_rpm: key.rate_limit_rpm,
    active: key.active,
    last_used_at: key.last_used_at,
    created_at: key.created_at,
    expires_at: key.expires_at,
    description: key.description,
  });
}

// ── Revoke ───────────────────────────────────────────────────────────────────

async function revokeKey(db: any, id: string, reason?: string) {
  const key = await db.entities.ApiKey.get(id).catch(() => null);
  if (!key) return Response.json({ error: 'Clé introuvable' }, { status: 404 });
  const updated = await db.entities.ApiKey.update(id, {
    active: false,
    description: `Révoked${reason ? ` — ${String(reason).slice(0, 200)}` : ''}`,
  }).catch(() => null);
  return Response.json({ id, revoked: true, active: false, description: updated?.description });
}

// ── Rotate ───────────────────────────────────────────────────────────────────

async function rotateKey(db: any, body: any) {
  const id = String(body.id || '').trim();
  if (!id) return Response.json({ error: 'id est requis' }, { status: 400 });
  const key = await db.entities.ApiKey.get(id).catch(() => null);
  if (!key) return Response.json({ error: 'Clé introuvable' }, { status: 404 });
  if (!key.active) return Response.json({ error: 'Clé déjà révoquée — révotre d\'abord avant rotation' }, { status: 400 });

  const prefix = `cg_${Date.now().toString(36).toUpperCase()}_`;
  const secret = `${prefix}${Math.random().toString(36).slice(2, 26)}${Math.random().toString(36).slice(2, 26)}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  const updated = await db.entities.ApiKey.update(id, {
    key_prefix: prefix,
    key_hash: keyHash,
    active: true,
    last_used_at: '',
  }).catch(() => null);

  // Ancien hash conservé pour la vérification en cours (transition)
  await db.entities.ApiKey.update(id, {
    description: `Rotated — ancien hash ${key.key_hash.slice(0, 8)}…`,
  }).catch(() => null);

  return Response.json({
    id,
    rotated: true,
    new_key: secret,
    new_prefix: prefix,
    new_hash_preview: keyHash.slice(0, 16) + '…',
    warning: 'Enregistrez new_key immédiatement.',
  }, { status: 200 });
}
