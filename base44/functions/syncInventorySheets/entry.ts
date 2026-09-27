import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { requireAdmin } from '../../shared/security.ts';
import { syncSource } from '../../shared/inventorySheets.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await requireAdmin(base44);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const Source = base44.asServiceRole.entities.InventorySheetSource;
    const sources = body.source_id
      ? [await Source.get(body.source_id)]
      : await Source.filter({ active: true }, 'name', 100);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const results = [];
    const Log = base44.asServiceRole.entities.InventorySyncLog;
    const trigger = body.trigger === 'manual' ? 'manual' : 'scheduled';
    for (const source of sources) {
      const now = new Date().toISOString();
      const t0 = Date.now();
      try {
        const r = await syncSource(base44, source, accessToken);
        await Source.update(source.id, {
          last_synced_at: now, last_status: 'success', last_error: '',
          last_rows: r.rows, last_updated: r.updated, last_unmatched: r.unmatched,
        });
        await Log.create({ source_id: source.id, source_name: source.name, trigger, status: 'success', rows: r.rows, updated: r.updated, unmatched_count: r.unmatched.length, duration_ms: Date.now() - t0 });
        results.push({ id: source.id, name: source.name, ok: true, ...r });
      } catch (e) {
        await Source.update(source.id, { last_synced_at: now, last_status: 'failed', last_error: e.message });
        await Log.create({ source_id: source.id, source_name: source.name, trigger, status: 'failed', error: e.message, duration_ms: Date.now() - t0 });
        results.push({ id: source.id, name: source.name, ok: false, error: e.message });
      }
    }
    return Response.json({ synced: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}