/**
 * Trust boundary for machine-invoked endpoints.
 *
 * Several functions are called both from the app and from the platform's own
 * workflows (no end-user session). Anyone can reach a deployed function's URL,
 * so every one of them checks who is calling before doing privileged work:
 * the platform/administrator path is allowed, an anonymous HTTP caller is not.
 */

export async function requireAdmin(base44: any) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) {
    return { ok: false, status: 401, response: Response.json({ error: 'Authentification requise' }, { status: 401 }) };
  }
  if (String(user.role || '') !== 'admin') {
    return { ok: false, status: 403, response: Response.json({ error: 'Réservé aux administrateurs' }, { status: 403 }) };
  }
  return { ok: true, user };
}