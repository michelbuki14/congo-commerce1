import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireAdmin } from '../../shared/security.ts';

/**
 * BILLING CRON — base44/functions/billing-cron/entry.ts
 *
 * Tournique quotidienne de facturation SaaS. À déclencher une fois par jour
 * (idéalement 00:00 UTC). Deux passes indépendantes :
 *
 *   generate-invoices  — émet une facture pour chaque abonnement actif dont
 *                         la période courante est arrivée à terme et qui n'a
 *                         pas encore de facture pour cette période.
 *   run-dunning        — évalue les abonnements impayés et applique la
 *                         politique de relance (grâce → impayé → suspension).
 *
 * Chaque passe est idempotente : la génération de facture est cléée sur
 * (tenant, période), le dunning sur l'état existant de l'abonnement. Un
 * appel répétitif ne duplique rien et ne dégrade rien.
 */

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    await req.json().catch(() => ({}));
    const auth = await requireAdmin(base44);
    if (!auth.ok) return auth.response;
    const db = base44.asServiceRole;
    const action = (await req.json().catch(() => ({}))).action || 'generate-invoices';

    if (action === 'generate-invoices') {
      return generateInvoices(db);
    }
    if (action === 'run-dunning') {
      return runDunning(db);
    }
    return Response.json(
      { error: `action inconnue : ${action}. Utiliser generate-invoices ou run-dunning.` },
      { status: 400 }
    );
  } catch (error) {
    return Response.json(
      { error: String(error?.message || error).slice(0, 500), fatal: true },
      { status: 500 }
    );
  }
}

// ── Invoice generation ──────────────────────────────────────────────────────

async function generateInvoices(db: any) {
  const now = new Date();
  const subscriptions = await db.entities.Subscription.filter(
    { status: 'active' },
    'tenant_id',
    500
  ).catch(() => []);

  const results = {
    scanned: subscriptions.length,
    invoices_created: 0,
    invoices_skipped: 0,
    errors: 0,
    rows: [],
  };

  for (const sub of subscriptions) {
    try {
      const outcome = await maybeIssueInvoice(db, sub, now);
      results.rows.push(outcome);
      if (outcome.created) results.invoices_created += 1;
      else results.invoices_skipped += 1;
    } catch (err) {
      results.errors += 1;
      results.rows.push({ tenant_id: sub.tenant_id, error: String(err).slice(0, 200) });
    }
  }

  await db.entities.AnalyticsEvent.create({
    name: 'billing.cron_run',
    path: '/billing-cron',
    quantity: results.scanned,
    value_usd: results.invoices_created,
    description: `Génération des factures — ${results.invoices_created} créées, ${results.invoices_skipped} ignorées, ${results.errors} erreurs`,
  }).catch(() => null);

  return Response.json(results);
}

async function maybeIssueInvoice(db: any, sub: any, now: Date) {
  const periodEnd = new Date(sub.current_period_end || '');
  if (isNaN(periodEnd.getTime())) {
    return { tenant_id: sub.tenant_id, skipped: true, reason: 'période courante invalide' };
  }
  if (periodEnd > now) {
    return { tenant_id: sub.tenant_id, skipped: true, reason: 'période courante non terminée' };
  }

  const existing = await db.entities.TenantInvoice.filter(
    { tenant_id: sub.tenant_id, period_start: sub.current_period_start },
    'created_date',
    1
  ).catch(() => []);
  if (existing.length) {
    return {
      tenant_id: sub.tenant_id,
      skipped: true,
      reason: 'facture déjà émise pour cette période',
      invoice_id: existing[0].id,
    };
  }

  const plan = await db.entities.Plan.filter({ code: sub.plan_code }).catch(() => []);
  const planRow = plan[0];
  if (!planRow) {
    throw new Error(`Plan inconnu : ${sub.plan_code}`);
  }

  const cycle = sub.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
  const subtotal = cycle === 'yearly' ? planRow.price_yearly_usd : planRow.price_monthly_usd;
  const vatRate = 16;
  const vat = Math.round((subtotal * vatRate) / 100 * 100) / 100;
  const total = Math.round((subtotal + vat) * 100) / 100;

  const nextStart = new Date(periodEnd);
  const nextEnd = cycle === 'yearly' ? new Date(nextStart.getTime() + 365 * 86400000) : new Date(nextStart.getTime() + 30 * 86400000);

  const invoice = await db.entities.TenantInvoice.create({
    tenant_id: sub.tenant_id,
    tenant_name: sub.tenant_name || '',
    owner_email: sub.owner_email || '',
    invoice_number: `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    plan_code: sub.plan_code,
    billing_cycle: cycle,
    period_start: sub.current_period_start,
    period_end: sub.current_period_end,
    subtotal_usd: subtotal,
    vat_usd: vat,
    total_usd: total,
    status: 'open',
    issued_at: now.toISOString(),
    due_at: new Date(now.getTime() + 7 * 86400000).toISOString(),
    description: `${planRow.name} (${cycle === 'yearly' ? 'annuel' : 'mensuel'})`,
  });

  // Prépare le cycle suivant
  await db.entities.Subscription.update(sub.id, {
    current_period_start: nextStart.toISOString(),
    current_period_end: nextEnd.toISOString(),
  }).catch(() => null);

  return {
    tenant_id: sub.tenant_id,
    created: true,
    invoice_id: invoice.id,
    amount_usd: total,
    due_at: invoice.due_at,
  };
}

// ── Dunning run ─────────────────────────────────────────────────────────────

async function runDunning(db: any) {
  const now = new Date();
  const GRACE_DAYS = 7;
  const subscriptions = await db.entities.Subscription.filter(
    { $or: [{ status: 'past_due' }, { status: 'active' }] },
    'tenant_id',
    500
  ).catch(() => []);

  const results = {
    scanned: subscriptions.length,
    suspended: 0,
    marked_past_due: 0,
    reminded: 0,
    skipped: 0,
    rows: [],
  };

  for (const sub of subscriptions) {
    try {
      const outcome = await evaluateDunning(db, sub, now, GRACE_DAYS);
      results.rows.push(outcome);
      if (outcome.action === 'suspend') results.suspended += 1;
      else if (outcome.action === 'past_due') results.marked_past_due += 1;
      else if (outcome.action === 'reminder') results.reminded += 1;
      else results.skipped += 1;
    } catch (err) {
      results.rows.push({ tenant_id: sub.tenant_id, error: String(err).slice(0, 200) });
      results.scanned -= 1;
    }
  }

  return Response.json(results);
}

async function evaluateDunning(db: any, sub: any, now: Date, graceDays: number) {
  const reference = sub.current_period_end || sub.trial_end || sub.started_at || '';
  if (!reference) {
    return { tenant_id: sub.tenant_id, skipped: true, reason: 'pas de référence de période' };
  }
  const overdueDays = Math.max(0, Math.floor((now.getTime() - new Date(reference).getTime()) / 86400000));
  const attempts = (Number(sub.dunning_attempts) || 0) + 1;
  let action: string;
  if (overdueDays > graceDays * 3) action = 'suspend';
  else if (overdueDays > graceDays) action = 'past_due';
  else if (overdueDays > 0) action = 'grace';
  else action = 'ok';

  if (action === 'ok') {
    return { tenant_id: sub.tenant_id, skipped: true, reason: 'paiement à jour', overdue_days: 0 };
  }

  if (action === 'suspend') {
    await db.entities.Subscription.update(sub.id, {
      status: 'expired',
      dunning_attempts: attempts,
      notes: `Relance ${attempts} — suspension automatique`,
    }).catch(() => null);
    await db.entities.Tenant.update(sub.tenant_id, { status: 'suspended' }).catch(() => null);
    return { tenant_id: sub.tenant_id, action: 'suspend', subscription_status: 'expired', attempts };
  }

  if (action === 'past_due' || action === 'grace') {
    const patch: any = { dunning_attempts: attempts };
    if (action === 'grace') {
      patch.status = 'past_due';
      const newEnd = new Date(new Date(sub.current_period_end || now).getTime() + graceDays * 86400000);
      patch.current_period_end = newEnd.toISOString();
    } else {
      patch.status = 'past_due';
    }
    await db.entities.Subscription.update(sub.id, patch).catch(() => null);
    return { tenant_id: sub.tenant_id, action, subscription_status: patch.status, attempts, overdue_days: overdueDays };
  }

  return { tenant_id: sub.tenant_id, skipped: true, reason: `action inconnue : ${action}` };
}
