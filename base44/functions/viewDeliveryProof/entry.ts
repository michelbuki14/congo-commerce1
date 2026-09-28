import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Authentification requise' }, { status: 401 });
    const { kind, id } = await req.json().catch(() => ({}));
    if (!['dispute', 'shipment'].includes(kind) || typeof id !== 'string' || !id || id.length > 100) {
      return Response.json({ error: 'Preuve invalide' }, { status: 400 });
    }
    const record = kind === 'dispute'
      ? await base44.asServiceRole.entities.Dispute.get(id).catch(() => null)
      : await base44.asServiceRole.entities.Shipment.get(id).catch(() => null);
    if (!record?.proof_of_delivery) return Response.json({ error: 'Preuve introuvable' }, { status: 404 });
    if (user.role !== 'admin') {
      if (kind === 'dispute') return Response.json({ error: 'Accès refusé' }, { status: 403 });
      const couriers = await base44.asServiceRole.entities.Courier.filter({ email: user.email });
      const allowed = couriers.some((c) => c.active !== false && (c.id === record.courier_id || c.name === record.courier_name));
      if (!allowed) return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: record.proof_of_delivery, expires_in: 300 });
    return Response.json({ signed_url });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}