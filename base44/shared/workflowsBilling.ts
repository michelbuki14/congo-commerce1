import { GRACE_DAYS, VAT_RATE, addDays, daysBetween, iso, notify, planAmount, resolvePlan, round2 } from './workflowSupport.ts';

/**
 * BILLING WORKFLOWS — SaaS subscription activation and unpaid-subscription
 * dunning. A failed payment never destroys tenant data: it moves the
 * subscription through grace, past-due and suspension, and keeps everything
 * reversible.
 */

const subscriptionActivation = {
  code: 'subscription_activation',
  name: 'Activation d’abonnement',
  description:
    'Active ou renouvelle un abonnement : validation du plan, abonnement, droits et limites, facture avec TVA, encaissement et confirmation.',
  version: '1.0',
  category: 'billing',
  trigger: 'manual',
  aggregateType: 'Subscription',
  tenant_scoped: true,
  admin_only: false,
  idempotent: true,
  max_attempts: 2,
  steps: [
    {
      name: 'validate_plan',
      label: 'Valider le plan',
      retries: 1,
      run: async (ctx) => {
        const code = String(ctx.input.plan_code || 'STARTER').toUpperCase();
        const plan = await resolvePlan(ctx.base44, code);
        if (!plan || plan.code !== code) throw new Error(`Plan inconnu : ${code}`);
        const cycle = ctx.input.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
        const amount = planAmount(plan, cycle);
        ctx.data.plan = plan;
        ctx.data.cycle = cycle;
        ctx.data.amount = amount;
        ctx.data.vat = round2((amount * VAT_RATE) / 100);
        return {
          plan_code: plan.code,
          plan_name: plan.name,
          billing_cycle: cycle,
          subtotal_usd: amount,
          vat_usd: ctx.data.vat,
          total_usd: round2(amount + ctx.data.vat),
          features: plan.features || [],
        };
      },
    },
    {
      name: 'activate_subscription',
      label: 'Activer l’abonnement',
      run: async (ctx) => {
        const tenantId = String(ctx.input.tenant_id || ctx.tenantId || '');
        if (!tenantId) throw new Error('Enseigne manquante pour l’abonnement');
        const plan = ctx.data.plan;
        const cycle = ctx.data.cycle;
        const start = new Date();
        const periodEnd = cycle === 'yearly' ? addDays(start, 365) : addDays(start, 30);

        const existing = await ctx.base44.asServiceRole.entities.Subscription.filter({ tenant_id: tenantId }).catch(() => []);
        const payload = {
          tenant_id: tenantId,
          tenant_name: ctx.input.tenant_name || existing[0]?.tenant_name || '',
          owner_email: ctx.input.owner_email || ctx.tenantOwnerEmail || existing[0]?.owner_email || '',
          plan_id: plan.id || existing[0]?.plan_id || '',
          plan_code: plan.code,
          billing_cycle: cycle,
          status: 'active',
          amount_usd: ctx.data.amount,
          currency: 'USD',
          current_period_start: iso(start),
          current_period_end: iso(periodEnd),
          last_payment_at: iso(start),
        };
        const subscription = existing.length
          ? await ctx.base44.asServiceRole.entities.Subscription.update(existing[0].id, payload)
          : await ctx.base44.asServiceRole.entities.Subscription.create({ ...payload, started_at: iso(start) });
        ctx.data.subscription = subscription;
        return { subscription_id: subscription.id, updated: existing.length > 0, status: 'active', period_end: iso(periodEnd) };
      },
    },
    {
      name: 'enable_plan_entitlements',
      label: 'Ouvrir les droits du plan',
      run: async (ctx) => {
        const subscription = ctx.data.subscription;
        const plan = ctx.data.plan;
        const tenant = await ctx.base44.asServiceRole.entities.Tenant.get(subscription.tenant_id).catch(() => null);
        if (!tenant) throw new Error('Enseigne introuvable pour ouvrir les droits');
        await ctx.base44.asServiceRole.entities.Tenant.update(tenant.id, { plan_code: plan.code, status: 'active' });
        ctx.data.tenant = tenant;
        return {
          plan_code: plan.code,
          features: plan.features || [],
          limits: {
            products: plan.product_limit,
            stores: plan.store_limit,
            sellers: plan.seller_limit,
            members: plan.member_limit,
          },
          commission_rate: plan.commission_rate,
        };
      },
    },
    {
      name: 'issue_invoice',
      label: 'Émettre la facture',
      run: async (ctx) => {
        const subscription = ctx.data.subscription;
        const tenant = ctx.data.tenant;
        const existing = await ctx.base44.asServiceRole.entities.TenantInvoice
          .filter({ tenant_id: subscription.tenant_id, period_start: subscription.current_period_start })
          .catch(() => []);
        if (existing.length) return { invoice_id: existing[0].id, created: false, total_usd: existing[0].total_usd };

        const invoice = await ctx.base44.asServiceRole.entities.TenantInvoice.create({
          tenant_id: subscription.tenant_id,
          tenant_name: tenant?.name || subscription.tenant_name || '',
          owner_email: subscription.owner_email || '',
          invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
          plan_code: ctx.data.plan.code,
          billing_cycle: ctx.data.cycle,
          period_start: subscription.current_period_start,
          period_end: subscription.current_period_end,
          subtotal_usd: ctx.data.amount,
          vat_usd: ctx.data.vat,
          total_usd: round2(ctx.data.amount + ctx.data.vat),
          status: ctx.input.payment_reference ? 'paid' : 'open',
          issued_at: iso(new Date()),
          due_at: iso(addDays(new Date(), 7)),
          paid_at: ctx.input.payment_reference ? iso(new Date()) : '',
          payment_reference: ctx.input.payment_reference || '',
          description: `Abonnement ${ctx.data.plan.name} (${ctx.data.cycle === 'yearly' ? 'annuel' : 'mensuel'})`,
        });
        ctx.data.invoice = invoice;
        return { invoice_id: invoice.id, created: true, total_usd: invoice.total_usd, status: invoice.status };
      },
    },
    {
      name: 'record_payment',
      label: 'Enregistrer l’encaissement',
      run: async (ctx) => {
        const invoice = ctx.data.invoice;
        if (!ctx.input.payment_reference) {
          return { skipped: true, reason: 'Aucune référence de paiement fournie — facture laissée ouverte' };
        }
        if (invoice.status === 'paid' && invoice.payment_reference === ctx.input.payment_reference) {
          return { recorded: false, duplicate: true, reference: invoice.payment_reference };
        }
        const updated = await ctx.base44.asServiceRole.entities.TenantInvoice.update(invoice.id, {
          status: 'paid',
          paid_at: iso(new Date()),
          payment_reference: String(ctx.input.payment_reference),
        });
        ctx.data.invoice = updated;
        return { recorded: true, reference: updated.payment_reference, total_usd: updated.total_usd };
      },
    },
    {
      name: 'notify_tenant',
      label: 'Notifier l’enseigne',
      critical: false,
      run: async (ctx) => {
        const subscription = ctx.data.subscription;
        const plan = ctx.data.plan;
        const result = await notify(ctx.base44, {
          tenantId: subscription.tenant_id,
          tenantOwnerEmail: subscription.owner_email || '',
          audience: 'seller',
          type: 'payment',
          title: `Abonnement ${plan.name} actif`,
          message: `Votre plan ${plan.name} est actif jusqu’au ${new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}.`,
          reference: subscription.id,
          email: subscription.owner_email
            ? {
                to: subscription.owner_email,
                subject: `Abonnement ${plan.name} activé`,
                text: `Votre abonnement ${plan.name} est actif. Montant : ${round2(ctx.data.amount + ctx.data.vat)} USD (TVA ${VAT_RATE}% incluse).`,
              }
            : null,
        });
        return { ...result };
      },
    },
  ],
};

const subscriptionDunning = {
  code: 'subscription_dunning',
  name: 'Relance d’impayé',
  description:
    'Relance un abonnement impayé : rappel, période de grâce, passage en impayé puis suspension — sans jamais supprimer les données de l’enseigne.',
  version: '1.0',
  category: 'billing',
  trigger: 'schedule',
  aggregateType: 'Subscription',
  tenant_scoped: true,
  admin_only: false,
  idempotent: false,
  max_attempts: 2,
  steps: [
    {
      name: 'load_subscription',
      label: 'Charger l’abonnement',
      retries: 1,
      run: async (ctx) => {
        const id = String(ctx.input.subscription_id || '');
        const tenantId = String(ctx.input.tenant_id || ctx.tenantId || '');
        let subscription = id ? await ctx.base44.asServiceRole.entities.Subscription.get(id).catch(() => null) : null;
        if (!subscription && tenantId) {
          subscription = (await ctx.base44.asServiceRole.entities.Subscription.filter({ tenant_id: tenantId }).catch(() => []))[0] || null;
        }
        if (!subscription) throw new Error('Abonnement introuvable');
        if (['cancelled', 'expired'].includes(String(subscription.status))) {
          return { skipped: true, reason: `Abonnement ${subscription.status}` };
        }
        ctx.data.subscription = subscription;
        return { subscription_id: subscription.id, status: subscription.status, plan_code: subscription.plan_code };
      },
    },
    {
      name: 'evaluate_dunning',
      label: 'Évaluer l’impayé',
      run: async (ctx) => {
        const subscription = ctx.data.subscription;
        const reference = subscription.current_period_end || subscription.trial_end || subscription.started_at;
        const overdueDays = Math.max(0, daysBetween(reference));
        const attempts = Number(subscription.dunning_attempts || 0) + 1;
        let action = 'reminder';
        if (overdueDays > GRACE_DAYS * 3) action = 'suspend';
        else if (overdueDays > GRACE_DAYS) action = 'past_due';
        else if (overdueDays > 0) action = 'grace';
        ctx.data.action = action;
        ctx.data.overdueDays = overdueDays;
        ctx.data.attempts = attempts;
        return { action, overdue_days: overdueDays, attempt: attempts, reference: reference || '' };
      },
    },
    {
      name: 'apply_dunning_action',
      label: 'Appliquer la décision',
      run: async (ctx) => {
        const subscription = ctx.data.subscription;
        const action = ctx.data.action;
        const patch = { notes: `Relance ${ctx.data.attempts} — ${action}` };
        if (action === 'grace') {
          patch.status = 'past_due';
          patch.current_period_end = iso(addDays(subscription.current_period_end || new Date(), GRACE_DAYS));
        }
        if (action === 'past_due') patch.status = 'past_due';
        if (action === 'suspend') {
          patch.status = 'expired';
          await ctx.base44.asServiceRole.entities.Tenant
            .update(subscription.tenant_id, { status: 'suspended' })
            .catch(() => null);
        }
        const updated = await ctx.base44.asServiceRole.entities.Subscription.update(subscription.id, patch);
        ctx.data.subscription = updated;
        return { action, subscription_status: updated.status, data_preserved: true };
      },
    },
    {
      name: 'notify_tenant',
      label: 'Prévenir l’enseigne',
      critical: false,
      run: async (ctx) => {
        const subscription = ctx.data.subscription;
        const messages = {
          reminder: 'Votre paiement n’a pas abouti. Régularisez pour éviter la suspension.',
          grace: `Paiement en retard : une période de grâce de ${GRACE_DAYS} jours est ouverte.`,
          past_due: 'Votre abonnement est impayé. Certaines fonctionnalités seront restreintes.',
          suspend: 'Votre abonnement est suspendu. Vos données sont conservées : régularisez pour réactiver.',
        };
        const result = await notify(ctx.base44, {
          tenantId: subscription.tenant_id,
          tenantOwnerEmail: subscription.owner_email || '',
          audience: 'seller',
          type: 'payment',
          title: 'Relance de paiement',
          message: messages[ctx.data.action] || messages.reminder,
          reference: subscription.id,
          email: subscription.owner_email
            ? { to: subscription.owner_email, subject: 'Relance de paiement — Congo Commerce', text: messages[ctx.data.action] || messages.reminder }
            : null,
        });
        return { ...result };
      },
    },
    {
      name: 'schedule_next_attempt',
      label: 'Programmer la prochaine relance',
      run: async (ctx) => {
        const subscription = ctx.data.subscription;
        const next = iso(addDays(new Date(), ctx.data.action === 'suspend' ? 30 : 3));
        await ctx.base44.asServiceRole.entities.Subscription.update(subscription.id, {
          dunning_attempts: ctx.data.attempts,
        });
        return { attempts: ctx.data.attempts, next_attempt_at: next, terminal: ctx.data.action === 'suspend' };
      },
    },
  ],
};

export const BILLING_WORKFLOWS = [subscriptionActivation, subscriptionDunning];