import {
  ROLE_PERMISSIONS,
  VAT_RATE,
  addDays,
  ensureWallet,
  iso,
  notify,
  openTicket,
  planAmount,
  recordAnalytics,
  recordUsage,
  resolvePlan,
  round2,
} from './workflowSupport.ts';

/**
 * ONBOARDING WORKFLOWS — tenant provisioning and seller onboarding.
 * Each step is idempotent: it checks what already exists before writing, so a
 * retry, a resume or a replayed execution converges to the same state.
 */

const tenantProvisioning = {
  code: 'tenant_provisioning',
  name: 'Création d’enseigne',
  description:
    'Provisionne une enseigne complète : réglages par défaut, rôles, boutique, abonnement d’essai, liste d’intégration, accueil et mesure d’usage.',
  version: '1.0',
  category: 'onboarding',
  trigger: 'manual',
  aggregateType: 'Tenant',
  tenant_scoped: true,
  admin_only: false,
  idempotent: true,
  max_attempts: 2,
  steps: [
    {
      name: 'validate_tenant',
      label: 'Valider l’enseigne',
      retries: 1,
      run: async (ctx) => {
        const id = String(ctx.input.tenant_id || ctx.input.id || '');
        const email = String(ctx.input.owner_email || ctx.tenantOwnerEmail || '').toLowerCase();
        let tenant = id ? await ctx.base44.asServiceRole.entities.Tenant.get(id).catch(() => null) : null;
        if (!tenant && email) {
          tenant = (await ctx.base44.asServiceRole.entities.Tenant.filter({ owner_email: email }).catch(() => []))[0] || null;
        }
        if (!tenant) throw new Error('Enseigne introuvable');
        if (!tenant.name || !tenant.slug) throw new Error('Enseigne incomplète : nom et identifiant requis');
        ctx.data.tenant = tenant;
        return { tenant_id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status };
      },
    },
    {
      name: 'apply_tenant_defaults',
      label: 'Appliquer les réglages par défaut',
      run: async (ctx) => {
        const tenant = ctx.data.tenant;
        const plan = await resolvePlan(ctx.base44, tenant.plan_code);
        const patch = {};
        if (!tenant.currency) patch.currency = 'USD';
        if (!tenant.default_language) patch.default_language = 'fr';
        if (!tenant.vat_rate) patch.vat_rate = VAT_RATE;
        if (!tenant.commission_rate) patch.commission_rate = plan.commission_rate || 12;
        const updated = Object.keys(patch).length
          ? await ctx.base44.asServiceRole.entities.Tenant.update(tenant.id, patch)
          : tenant;
        ctx.data.tenant = { ...tenant, ...updated };
        return { defaults: patch, plan_code: plan.code };
      },
    },
    {
      name: 'seed_roles_permissions',
      label: 'Créer les rôles et permissions',
      run: async (ctx) => {
        const tenant = ctx.data.tenant;
        const members = await ctx.base44.asServiceRole.entities.TenantMember
          .filter({ tenant_id: tenant.id, email: tenant.owner_email || '' })
          .catch(() => []);
        if (!members.length && tenant.owner_email) {
          await ctx.base44.asServiceRole.entities.TenantMember.create({
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            owner_email: tenant.owner_email,
            email: tenant.owner_email,
            full_name: tenant.owner_name || '',
            role: 'TENANT_ADMIN',
            permissions: ROLE_PERMISSIONS.TENANT_ADMIN,
            status: 'active',
            invited_by: ctx.actorEmail || 'system',
          });
        } else if (members.length && !members[0].permissions?.length) {
          await ctx.base44.asServiceRole.entities.TenantMember.update(members[0].id, {
            permissions: ROLE_PERMISSIONS.TENANT_ADMIN,
            status: 'active',
          });
        }
        return { owner_member_created: !members.length, roles: Object.keys(ROLE_PERMISSIONS) };
      },
    },
    {
      name: 'create_default_store',
      label: 'Créer la boutique par défaut',
      run: async (ctx) => {
        const tenant = ctx.data.tenant;
        const existing = await ctx.base44.asServiceRole.entities.Seller.filter({ tenant_id: tenant.id }).catch(() => []);
        if (existing.length) {
          ctx.data.store = existing[0];
          return { store_id: existing[0].id, created: false };
        }
        const store = await ctx.base44.asServiceRole.entities.Seller.create({
          tenant_id: tenant.id,
          tenant_owner_email: tenant.owner_email || '',
          name: tenant.name,
          slug: tenant.slug,
          owner_name: tenant.owner_name || '',
          email: tenant.owner_email || '',
          phone: tenant.phone || '',
          city: tenant.city || 'Kinshasa',
          country: tenant.country || 'CD',
          description: `Boutique officielle de ${tenant.name}`,
          status: 'active',
          commission_rate: tenant.commission_rate || 12,
          payout_method: 'mpesa',
        });
        ctx.data.store = store;
        return { store_id: store.id, created: true, name: store.name };
      },
    },
    {
      name: 'create_trial_subscription',
      label: 'Créer l’abonnement d’essai',
      run: async (ctx) => {
        const tenant = ctx.data.tenant;
        const plan = await resolvePlan(ctx.base44, ctx.input.plan_code || tenant.plan_code);
        const existing = await ctx.base44.asServiceRole.entities.Subscription.filter({ tenant_id: tenant.id }).catch(() => []);
        if (existing.length) return { subscription_id: existing[0].id, created: false, status: existing[0].status };

        const start = new Date();
        const trialEnd = addDays(start, plan.trial_days || 14);
        const subscription = await ctx.base44.asServiceRole.entities.Subscription.create({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          owner_email: tenant.owner_email || '',
          plan_code: plan.code,
          billing_cycle: 'monthly',
          status: 'trialing',
          amount_usd: planAmount(plan, 'monthly'),
          currency: 'USD',
          started_at: iso(start),
          trial_end: iso(trialEnd),
          current_period_start: iso(start),
          current_period_end: iso(trialEnd),
          notes: 'Essai créé par le moteur de workflows',
        });
        await ctx.base44.asServiceRole.entities.Tenant.update(tenant.id, { plan_code: plan.code, status: 'trial' });
        ctx.data.subscription = subscription;
        return { subscription_id: subscription.id, created: true, plan_code: plan.code, trial_end: iso(trialEnd) };
      },
    },
    {
      name: 'publish_onboarding_checklist',
      label: 'Publier la liste d’intégration',
      run: async (ctx) => {
        const tenant = ctx.data.tenant;
        const checklist = [
          'Vérifier l’identité de l’entreprise (KYC)',
          'Ajouter les premiers produits',
          'Configurer les zones et frais de livraison',
          'Relier un moyen d’encaissement mobile money',
          'Inviter l’équipe et attribuer les rôles',
        ];
        await notify(ctx.base44, {
          tenantId: tenant.id,
          tenantOwnerEmail: tenant.owner_email || '',
          audience: 'admin',
          type: 'system',
          title: `Intégration — ${tenant.name}`,
          message: `Enseigne provisionnée. Étapes à suivre : ${checklist.join(' · ')}`,
          reference: tenant.slug,
        });
        return { checklist };
      },
    },
    {
      name: 'welcome_tenant',
      label: 'Accueillir le propriétaire',
      critical: false,
      run: async (ctx) => {
        const tenant = ctx.data.tenant;
        const result = await notify(ctx.base44, {
          tenantId: tenant.id,
          tenantOwnerEmail: tenant.owner_email || '',
          audience: 'seller',
          type: 'system',
          title: `Bienvenue sur Congo Commerce, ${tenant.name}`,
          message:
            'Votre espace est prêt : boutique créée, essai activé. Ajoutez vos produits pour recevoir vos premières commandes.',
          reference: tenant.slug,
          email: tenant.owner_email
            ? {
                to: tenant.owner_email,
                subject: `Votre espace ${tenant.name} est prêt`,
                text: `Bonjour ${tenant.owner_name || ''},\n\nVotre espace ${tenant.name} est actif avec un abonnement d'essai. Connectez-vous pour ajouter vos premiers produits.\n\nL'équipe Congo Commerce`,
              }
            : null,
        });
        return { ...result };
      },
    },
    {
      name: 'record_provisioning_usage',
      label: 'Enregistrer la mesure d’usage',
      critical: false,
      run: async (ctx) => {
        const tenant = ctx.data.tenant;
        await recordUsage(ctx.base44, {
          tenantId: tenant.id,
          name: 'tenant_provisioned',
          description: `Enseigne ${tenant.name} provisionnée`,
        });
        await recordAnalytics(ctx.base44, {
          name: 'tenant_provisioned',
          valueUsd: 0,
          description: `Enseigne ${tenant.name}`,
        });
        return { recorded: true };
      },
    },
  ],
};

const sellerOnboarding = {
  code: 'seller_onboarding',
  name: 'Intégration vendeur',
  description:
    'Valide un vendeur : dossier KYC, portefeuille, configuration de versement, activation de la vitrine, notification et mesure d’usage.',
  version: '1.0',
  category: 'commerce',
  trigger: 'manual',
  aggregateType: 'Seller',
  tenant_scoped: true,
  admin_only: true,
  idempotent: true,
  max_attempts: 2,
  steps: [
    {
      name: 'validate_seller',
      label: 'Valider le vendeur',
      retries: 1,
      run: async (ctx) => {
        const id = String(ctx.input.seller_id || ctx.input.id || '');
        let seller = id ? await ctx.base44.asServiceRole.entities.Seller.get(id).catch(() => null) : null;
        if (!seller && ctx.input.seller_email) {
          seller = (await ctx.base44.asServiceRole.entities.Seller.filter({ email: String(ctx.input.seller_email) }).catch(() => []))[0] || null;
        }
        if (!seller) throw new Error('Vendeur introuvable');
        ctx.data.seller = seller;
        return { seller_id: seller.id, name: seller.name, status: seller.status };
      },
    },
    {
      name: 'open_kyc_review',
      label: 'Ouvrir le dossier KYC',
      run: async (ctx) => {
        const seller = ctx.data.seller;
        const existing = await ctx.base44.asServiceRole.entities.SupportTicket
          .filter({ tenant_id: seller.tenant_id || '', category: 'account', status: 'open' })
          .catch(() => []);
        const already = existing.find((t) => String(t.subject || '').includes(seller.name));
        if (already) return { ticket_id: already.id, created: false };
        const ticket = await openTicket(ctx.base44, {
          tenantId: seller.tenant_id || '',
          tenantOwnerEmail: seller.tenant_owner_email || '',
          subject: `Vérification KYC — ${seller.name}`,
          category: 'account',
          priority: 'high',
          customerName: seller.owner_name || seller.name,
          customerEmail: seller.email || '',
          description: `Documents à vérifier pour ${seller.name} (${seller.city || 'ville inconnue'}) — téléphone ${seller.phone || 'non fourni'}.`,
        });
        return { ticket_id: ticket.id, ticket_number: ticket.ticket_number, created: true };
      },
    },
    {
      name: 'create_seller_wallet',
      label: 'Créer le portefeuille vendeur',
      run: async (ctx) => {
        const seller = ctx.data.seller;
        const { wallet, created } = await ensureWallet(ctx.base44, {
          ownerType: 'seller',
          ownerId: seller.id,
          ownerEmail: seller.email || seller.tenant_owner_email || '',
          ownerName: seller.name,
          tenantId: seller.tenant_id || '',
          tenantOwnerEmail: seller.tenant_owner_email || '',
        });
        ctx.data.wallet = wallet;
        return { wallet_id: wallet.id, created, balance_usd: wallet.balance_usd || 0 };
      },
    },
    {
      name: 'configure_payout',
      label: 'Configurer le versement',
      run: async (ctx) => {
        const seller = ctx.data.seller;
        const patch = {};
        if (!seller.payout_method) patch.payout_method = 'mpesa';
        if (!seller.payout_holder) patch.payout_holder = seller.owner_name || seller.name;
        if (!seller.payout_account) patch.payout_account = seller.phone || '';
        if (!seller.commission_rate) patch.commission_rate = 12;
        if (!Object.keys(patch).length) return { configured: false, reason: 'Configuration déjà complète' };
        const updated = await ctx.base44.asServiceRole.entities.Seller.update(seller.id, patch);
        ctx.data.seller = updated;
        return { configured: true, ...patch };
      },
    },
    {
      name: 'activate_storefront',
      label: 'Activer la vitrine',
      run: async (ctx) => {
        const seller = ctx.data.seller;
        const verified = ctx.input.verified !== false;
        const updated = await ctx.base44.asServiceRole.entities.Seller.update(seller.id, {
          status: 'active',
          verified,
          payout_updated_at: iso(new Date()),
        });
        ctx.data.seller = updated;
        return { seller_id: updated.id, status: updated.status, verified };
      },
    },
    {
      name: 'notify_seller',
      label: 'Notifier le vendeur',
      critical: false,
      run: async (ctx) => {
        const seller = ctx.data.seller;
        const result = await notify(ctx.base44, {
          tenantId: seller.tenant_id || '',
          tenantOwnerEmail: seller.tenant_owner_email || '',
          audience: 'seller',
          type: 'system',
          title: `Boutique « ${seller.name} » activée`,
          message: 'Votre vitrine est en ligne. Ajoutez vos produits pour commencer à vendre.',
          reference: seller.slug || '',
          email: seller.email
            ? {
                to: seller.email,
                subject: `Votre boutique ${seller.name} est activée`,
                text: `Bonjour ${seller.owner_name || ''},\n\nVotre boutique ${seller.name} est validée et en ligne sur Congo Commerce.\n\nL'équipe Congo Commerce`,
              }
            : null,
        });
        return { ...result };
      },
    },
    {
      name: 'record_seller_analytics',
      label: 'Mesurer l’activation',
      critical: false,
      run: async (ctx) => {
        const seller = ctx.data.seller;
        await recordUsage(ctx.base44, {
          tenantId: seller.tenant_id || 'platform',
          name: 'seller_activated',
          description: `Vendeur ${seller.name} activé`,
        });
        await recordAnalytics(ctx.base44, { name: 'seller_activated', description: seller.name });
        return { recorded: true };
      },
    },
  ],
};

export const ONBOARDING_WORKFLOWS = [tenantProvisioning, sellerOnboarding];