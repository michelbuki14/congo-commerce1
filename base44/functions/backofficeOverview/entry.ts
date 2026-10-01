import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireAdmin } from '../../shared/security.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const access = await requireAdmin(base44);
    if (!access.ok) return access.response;
    const [orders, tickets, executions, logs] = await Promise.all([
      base44.entities.Order.list('-created_date', 8),
      base44.entities.SupportTicket.list('-created_date', 8),
      base44.entities.WorkflowExecution.list('-created_date', 8),
      base44.entities.AuditLog.list('-created_date', 8),
    ]);
    return Response.json({
      orders: orders.map(o => ({ id: o.id, number: o.order_number, status: o.status, amount: o.total_usd, at: o.created_date })),
      tickets: tickets.map(t => ({ id: t.id, number: t.ticket_number, subject: t.subject, status: t.status, at: t.created_date })),
      executions: executions.map(e => ({ id: e.id, name: e.workflow_name || e.workflow_code, status: e.status, at: e.created_date })),
      logs: logs.map(l => ({ id: l.id, action: l.action, reference: l.reference, at: l.created_date })),
    });
  } catch (error) {
    console.error('Back-office overview failed:', error);
    return Response.json({ error: 'Impossible de charger le back-office' }, { status: 500 });
  }
}