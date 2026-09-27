import {
  ensureWallet,
  hasOpenCase,
  notify,
  openTicket,
  postLedger,
  recordAnalytics,
  recordUsage,
  round2,
} from './workflowSupport.ts';

/**
 * COMMERCE & RISK WORKFLOWS — product publication, return/refund, creator
 * commission and risk control. Every money movement goes through the ledger
 * with an idempotency key, so a replay can never pay twice.
 */

const productPublication = {
  code: 'product_publication',
  name: 'Publication de produit',
  description:
    'Contrôle puis publie un produit : validation, modération, mise en ligne, indexation et notification du vendeur.',
  version: '1.0',
  category: 'commerce',
  trigger: 'manual',
  aggregateType: 'Product',
  tenant_scoped: true,
  admin_only: false,
  idempotent: true,
  max_attempts: 2,
  steps: [
    {
      name: 'validate_product',
      label: 'Valider le produit',
      retries: 1,
      run: async (ctx) => {
        const id = String(ctx.input.product_id || ctx.input.id || '');
        if (!id) throw new Error('Identifiant produit manquant');
        const product = await ctx.base44.asServiceRole.entities.Product.get(id).catch(() => null);
        if (!product) throw new Error('Produit introuvable');
        if (!product.title) throw new Error('Titre du produit manquant');
        if (!(Number(product.price_usd) > 0)) throw new Error('Prix de vente invalide');
        if (product.status === 'archived') throw new Error('Produit archivé : réactivez-le avant publication');
        ctx.data.product = product;
        return {
          product_id: product.id,
          title: product.title,
          price_usd: product.price_usd,
          has_images: Array.isArray(product.images) && product.images.length > 0,
          source_type: product.source_type || 'local_seller',
        };
      },
    },
    {
      name: 'moderate_product',
      label: 'Modérer le produit',
      run: async (ctx) => {
        const product = ctx.data.product;
        const seller = product.seller_id
          ? await ctx.base44.asServiceRole.entities.Seller.get(product.seller_id).catch(() => null)
          : null;
        const trusted = Boolean(seller && seller.status === 'active' && (seller.verified || Number(seller.orders_count || 0) > 0));
        const decision = trusted ? 'approved' : 'pending_review';
        ctx.data.decision = decision;
        return { decision, seller_trusted: trusted, reason: trusted ? 'Vendeur vérifié' : 'Nouveau vendeur — contrôle manuel' };
      },
    },
    {
      name: 'publish_product',
      label: 'Mettre en ligne',
      run: async (ctx) => {
        const product = ctx.data.product;
        if (ctx.data.decision !== 'approved') {
          const updated = await ctx.base44.asServiceRole.entities.Product.update(product.id, { status: 'pending_review' });
          ctx.data.product = updated;
          return { published: false, status: 'pending_review', reason: 'En attente de validation' };
        }
        const slug =
          product.slug ||
          String(product.title)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        const updated = await ctx.base44.asServiceRole.entities.Product.update(product.id, { status: 'published', slug });
        ctx.data.product = updated;
        return { published: true, status: 'published', slug };
      },
    },
    {
      name: 'index_product',
      label: 'Indexer le produit',
      critical: false,
      run: async (ctx) => {
        const product = ctx.data.product;
        await recordAnalytics(ctx.base44, {
          name: 'product_published',
          productId: product.id,
          valueUsd: product.price_usd,
          description: product.title,
        });
        await ctx.publish('ProductPublished', {
          product_id: product.id,
          title: product.title,
          price_usd: product.price_usd,
          description: `Produit publié : ${product.title}`,
        });
        return { indexed: true, product_id: product.id };
      },
    },
    {
      name: 'notify_seller',
      label: 'Notifier le vendeur',
      critical: false,
      run: async (ctx) => {
        const product = ctx.data.product;
        const result = await notify(ctx.base44, {
          tenantId: product.tenant_id || '',
          tenantOwnerEmail: product.tenant_owner_email || '',
          audience: 'seller',
          type: 'system',
          title: `Produit ${product.status === 'published' ? 'publié' : 'en revue'} — ${product.title}`,
          message:
            product.status === 'published'
              ? 'Votre produit est en ligne et visible par les clients.'
              : 'Votre produit est en attente de validation par notre équipe.',
          reference: product.slug || product.id,
        });
        return { ...result };
      },
    },
  ],
};

const returnRefund = {
  code: 'return_refund',
  name: 'Retour & remboursement',
  description:
    'Traite un retour : décision, remboursement du client (portefeuille, une seule fois), reprise des gains vendeur, remise en stock et notification.',
  version: '1.0',
  category: 'commerce',
  trigger: 'event',
  event_names: ['return_requested'],
  aggregateType: 'Return',
  tenant_scoped: true,
  admin_only: false,
  idempotent: true,
  max_attempts: 2,
  steps: [
    {
      name: 'validate_return',
      label: 'Valider la demande',
      retries: 1,
      run: async (ctx) => {
        const id = String(ctx.input.return_id || '');
        const orderNumber = String(ctx.input.order_number || ctx.input.reference || '');
        let row = id ? await ctx.base44.asServiceRole.entities.Return.get(id).catch(() => null) : null;
        if (!row && orderNumber) {
          row = (await ctx.base44.asServiceRole.entities.Return.filter({ order_number: orderNumber }).catch(() => []))[0] || null;
        }
        if (!row) throw new Error('Demande de retour introuvable');
        if (row.status === 'refunded' || row.status === 'closed') {
          return { skipped: true, reason: `Retour déjà traité (${row.status})` };
        }
        const order =
          (await ctx.base44.asServiceRole.entities.Order.filter({ order_number: row.order_number }).catch(() => []))[0] || null;
        ctx.data.row = row;
        ctx.data.order = order;
        ctx.data.refundAmount = round2(row.refund_amount_usd || order?.total_usd || 0);
        return {
          return_number: row.return_number,
          order_number: row.order_number,
          status: row.status,
          refund_amount_usd: ctx.data.refundAmount,
          order_found: Boolean(order),
        };
      },
    },
    {
      name: 'decide_return',
      label: 'Décider du retour',
      run: async (ctx) => {
        const row = ctx.data.row;
        const decision = String(ctx.input.decision || 'approve');
        const status = decision === 'reject' ? 'rejected' : 'approved';
        const updated = await ctx.base44.asServiceRole.entities.Return.update(row.id, {
          status,
          resolution_notes: String(ctx.input.resolution_notes || `Décision du moteur : ${status}`).slice(0, 500),
        });
        ctx.data.row = updated;
        ctx.data.rejected = decision === 'reject';
        return { decision, status };
      },
    },
    {
      name: 'refund_customer',
      label: 'Rembourser le client',
      run: async (ctx) => {
        if (ctx.data.rejected) return { skipped: true, reason: 'Retour refusé' };
        const row = ctx.data.row;
        const order = ctx.data.order;
        const amount = ctx.data.refundAmount;
        if (!(amount > 0)) return { skipped: true, reason: 'Aucun montant à rembourser' };

        const { wallet } = await ensureWallet(ctx.base44, {
          ownerType: 'customer',
          ownerId: order?.customer_phone || row.customer_phone || '',
          ownerEmail: order?.customer_email || '',
          ownerName: order?.customer_name || row.customer_name || 'Client',
          tenantId: row.tenant_id || '',
          tenantOwnerEmail: row.tenant_owner_email || '',
        });

        const result = await postLedger(ctx.base44, {
          wallet,
          amountUsd: amount,
          direction: 'credit',
          type: 'REFUND',
          description: `Remboursement retour ${row.return_number || row.order_number}`,
          reference: row.return_number || row.order_number,
          orderNumber: row.order_number,
          idempotencyKey: `refund:${row.return_number || row.order_number}`,
        });
        ctx.data.wallet = result.wallet || wallet;
        return { refunded: result.posted, duplicate: result.duplicate, amount_usd: amount, wallet_id: wallet.id };
      },
    },
    {
      name: 'reverse_seller_earnings',
      label: 'Reprendre les gains vendeur',
      critical: false,
      run: async (ctx) => {
        if (ctx.data.rejected) return { skipped: true, reason: 'Retour refusé' };
        const row = ctx.data.row;
        const fulfillments = await ctx.base44.asServiceRole.entities.FulfillmentOrder
          .filter({ order_number: row.order_number })
          .catch(() => []);
        const reversals = [];
        for (const fulfillment of fulfillments) {
          if (!fulfillment.seller_id || !(Number(fulfillment.seller_payout_usd) > 0)) continue;
          const { wallet } = await ensureWallet(ctx.base44, {
            ownerType: 'seller',
            ownerId: fulfillment.seller_id,
            ownerName: fulfillment.seller_name || 'Vendeur',
            tenantId: fulfillment.tenant_id || '',
            tenantOwnerEmail: fulfillment.tenant_owner_email || '',
          });
          const result = await postLedger(ctx.base44, {
            wallet,
            amountUsd: round2(fulfillment.seller_payout_usd),
            direction: 'debit',
            type: 'ADJUSTMENT',
            description: `Reprise de gains — retour ${row.return_number || row.order_number}`,
            reference: row.return_number || row.order_number,
            orderNumber: row.order_number,
            idempotencyKey: `reversal:${row.return_number || row.order_number}:${fulfillment.seller_id}`,
          });
          reversals.push({ seller_id: fulfillment.seller_id, posted: result.posted, amount_usd: fulfillment.seller_payout_usd });
        }
        return { reversals, count: reversals.length };
      },
    },
    {
      name: 'restore_inventory',
      label: 'Remettre en stock',
      critical: false,
      run: async (ctx) => {
        if (ctx.data.rejected) return { skipped: true, reason: 'Retour refusé' };
        const row = ctx.data.row;
        const order = ctx.data.order;
        const productId = row.product_id || order?.items?.[0]?.product_id || '';
        if (!productId) return { skipped: true, reason: 'Produit inconnu sur ce retour' };
        const product = await ctx.base44.asServiceRole.entities.Product.get(productId).catch(() => null);
        if (!product) return { skipped: true, reason: 'Produit introuvable' };
        const updated = await ctx.base44.asServiceRole.entities.Product.update(product.id, {
          stock: Number(product.stock || 0) + 1,
        });
        return { product_id: product.id, stock: updated.stock };
      },
    },
    {
      name: 'update_order_refund',
      label: 'Mettre à jour la commande',
      run: async (ctx) => {
        if (ctx.data.rejected) return { skipped: true, reason: 'Retour refusé' };
        const row = ctx.data.row;
        const order = ctx.data.order;
        const amount = ctx.data.refundAmount;
        const total = round2(order?.total_usd || 0);
        const status = total > 0 && amount >= total ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        if (order) {
          await ctx.base44.asServiceRole.entities.Order.update(order.id, { payment_status: status });
        }
        await ctx.base44.asServiceRole.entities.Return.update(row.id, { status: 'refunded' });
        ctx.data.row = { ...row, status: 'refunded' };
        return { order_number: row.order_number, payment_status: order ? status : 'order_not_found', return_status: 'refunded' };
      },
    },
    {
      name: 'notify_customer',
      label: 'Notifier le client',
      critical: false,
      run: async (ctx) => {
        const row = ctx.data.row;
        const rejected = ctx.data.rejected;
        const result = await notify(ctx.base44, {
          tenantId: row.tenant_id || '',
          tenantOwnerEmail: row.tenant_owner_email || '',
          audience: 'customer',
          type: 'order',
          title: rejected ? `Retour refusé — ${row.order_number}` : `Remboursement effectué — ${row.order_number}`,
          message: rejected
            ? 'Votre demande de retour n’a pas été acceptée. Contactez le support pour en savoir plus.'
            : `${round2(ctx.data.refundAmount)} USD ont été remboursés sur votre portefeuille Congo Commerce.`,
          reference: row.order_number,
        });
        return { ...result };
      },
    },
  ],
};

const creatorCommission = {
  code: 'creator_commission',
  name: 'Commission créateur',
  description:
    'Calcule et règle la commission d’un créateur : attribution, calcul, gel en cas de litige, crédit du portefeuille et notification.',
  version: '1.0',
  category: 'commerce',
  trigger: 'event',
  event_names: ['payout_released'],
  aggregateType: 'Creator',
  tenant_scoped: true,
  admin_only: false,
  idempotent: true,
  max_attempts: 2,
  steps: [
    {
      name: 'load_attribution',
      label: 'Charger l’attribution',
      retries: 1,
      run: async (ctx) => {
        const orderNumber = String(ctx.input.order_number || ctx.input.reference || '');
        if (!orderNumber) throw new Error('Référence de commande manquante');
        const order =
          (await ctx.base44.asServiceRole.entities.Order.filter({ order_number: orderNumber }).catch(() => []))[0] || null;
        if (!order) throw new Error(`Commande ${orderNumber} introuvable`);

        const creatorId = String(ctx.input.creator_id || order.creator_id || '');
        const code = String(ctx.input.affiliate_code || order.affiliate_code || '');
        let creator = creatorId ? await ctx.base44.asServiceRole.entities.Creator.get(creatorId).catch(() => null) : null;
        if (!creator && code) {
          creator = (await ctx.base44.asServiceRole.entities.Creator.filter({ referral_code: code }).catch(() => []))[0] || null;
        }
        if (!creator) throw new Error('Aucun créateur attribué à cette commande');

        ctx.data.order = order;
        ctx.data.creator = creator;
        return { order_number: orderNumber, creator_id: creator.id, creator_name: creator.name, referral_code: creator.referral_code || code };
      },
    },
    {
      name: 'compute_commission',
      label: 'Calculer la commission',
      run: async (ctx) => {
        const order = ctx.data.order;
        const creator = ctx.data.creator;
        const fulfillments = await ctx.base44.asServiceRole.entities.FulfillmentOrder
          .filter({ order_number: order.order_number })
          .catch(() => []);
        const fromFulfillments = round2(fulfillments.reduce((sum, f) => sum + Number(f.creator_commission_usd || 0), 0));
        const rate = Number(creator.commission_rate || 8);
        const computed = round2(((Number(order.subtotal_usd) || Number(order.total_usd) || 0) * rate) / 100);
        const amount = fromFulfillments > 0 ? fromFulfillments : computed;
        ctx.data.amount = amount;
        ctx.data.rate = rate;
        return { amount_usd: amount, rate_percent: rate, source: fromFulfillments > 0 ? 'fulfillment' : 'order_subtotal' };
      },
    },
    {
      name: 'hold_or_approve',
      label: 'Geler ou approuver',
      run: async (ctx) => {
        const order = ctx.data.order;
        const creator = ctx.data.creator;
        const { open } = await hasOpenCase(ctx.base44, order.order_number);
        const forced = String(ctx.input.decision || '');
        const approved = forced === 'approve' ? true : forced === 'reject' ? false : !open;
        ctx.data.approved = approved;

        if (!approved) {
          const { wallet } = await ensureWallet(ctx.base44, {
            ownerType: 'creator',
            ownerId: creator.id,
            ownerEmail: creator.email || '',
            ownerName: creator.name,
          });
          await ctx.base44.asServiceRole.entities.Wallet.update(wallet.id, {
            pending_usd: round2((wallet.pending_usd || 0) + ctx.data.amount),
          });
          ctx.data.wallet = wallet;
        }
        return { approved, open_case: open, status: approved ? 'approved' : 'held' };
      },
    },
    {
      name: 'credit_creator_wallet',
      label: 'Créditer le créateur',
      run: async (ctx) => {
        if (!ctx.data.approved) return { skipped: true, reason: 'Commission gelée — dossier ouvert sur cette commande' };
        const creator = ctx.data.creator;
        const order = ctx.data.order;
        const amount = ctx.data.amount;
        if (!(amount > 0)) return { skipped: true, reason: 'Aucune commission à verser' };

        const { wallet } = await ensureWallet(ctx.base44, {
          ownerType: 'creator',
          ownerId: creator.id,
          ownerEmail: creator.email || '',
          ownerName: creator.name,
        });
        const result = await postLedger(ctx.base44, {
          wallet,
          amountUsd: amount,
          direction: 'credit',
          type: 'COMMISSION',
          description: `Commission ${creator.referral_code || creator.name} — ${order.order_number}`,
          reference: order.order_number,
          orderNumber: order.order_number,
          idempotencyKey: `commission:${order.order_number}:${creator.id}`,
        });
        if (result.posted) {
          await ctx.base44.asServiceRole.entities.Creator.update(creator.id, {
            total_earnings_usd: round2((creator.total_earnings_usd || 0) + amount),
            total_conversions: Number(creator.total_conversions || 0) + 1,
          });
        }
        return { credited: result.posted, duplicate: result.duplicate, amount_usd: amount, wallet_id: wallet.id };
      },
    },
    {
      name: 'notify_creator',
      label: 'Notifier le créateur',
      critical: false,
      run: async (ctx) => {
        const result = await notify(ctx.base44, {
          audience: 'seller',
          type: 'social',
          title: ctx.data.approved ? 'Commission créditée' : 'Commission en attente',
          message: ctx.data.approved
            ? `${ctx.data.amount} USD de commission ont été crédités sur votre portefeuille.`
            : `Votre commission de ${ctx.data.amount} USD est gelée le temps de la vérification d’un dossier.`,
          reference: ctx.data.order?.order_number || '',
        });
        return { ...result };
      },
    },
  ],
};

const fraudReview = {
  code: 'fraud_review',
  name: 'Contrôle des risques',
  description:
    'Qualifie un signal de risque, gèle les fonds concernés, ouvre un dossier d’arbitrage et attend la décision humaine avant de libérer.',
  version: '1.0',
  category: 'risk',
  trigger: 'event',
  event_names: ['dispute_opened'],
  aggregateType: 'Order',
  tenant_scoped: true,
  admin_only: true,
  idempotent: false,
  max_attempts: 2,
  steps: [
    {
      name: 'load_risk_case',
      label: 'Charger le dossier',
      retries: 1,
      run: async (ctx) => {
        const orderNumber = String(ctx.input.order_number || ctx.input.reference || '');
        if (!orderNumber) throw new Error('Référence du dossier manquante');
        const order = (await ctx.base44.asServiceRole.entities.Order.filter({ order_number: orderNumber }).catch(() => []))[0] || null;
        const disputes = await ctx.base44.asServiceRole.entities.Dispute.filter({ order_number: orderNumber }).catch(() => []);
        const events = await ctx.base44.asServiceRole.entities.FraudEvent.filter({ order_number: orderNumber }).catch(() => []);
        ctx.data.order = order || null;
        ctx.data.disputes = disputes;
        ctx.data.fraudEvents = events;
        return {
          order_number: orderNumber,
          order_found: Boolean(order),
          disputes: disputes.length,
          fraud_events: events.length,
          order_total_usd: round2(order?.total_usd || 0),
        };
      },
    },
    {
      name: 'assess_risk',
      label: 'Évaluer le risque',
      run: async (ctx) => {
        const disputes = ctx.data.disputes || [];
        const events = ctx.data.fraudEvents || [];
        const disputeSeverity = disputes.some((d) => ['open', 'investigating', 'escalated'].includes(String(d.status)));
        const eventScore = events.reduce((max, e) => Math.max(max, Number(e.score || 0)), 0);
        const score = Math.min(100, (disputeSeverity ? 60 : 0) + eventScore);
        const level = score >= 70 ? 'critical' : score >= 30 ? 'suspicious' : 'normal';
        const action = level === 'critical' ? 'hold_payout' : level === 'suspicious' ? 'monitor' : 'allow';
        ctx.data.level = level;
        ctx.data.score = score;
        ctx.data.action = action;
        return {
          score,
          level,
          action,
          signals: [...disputes.map((d) => `dispute:${d.type}`), ...events.map((e) => `fraud:${e.rule_code || e.score}`)],
        };
      },
    },
    {
      name: 'hold_funds',
      label: 'Geler les fonds concernés',
      run: async (ctx) => {
        const order = ctx.data.order;
        if (!order || ctx.data.action === 'allow') return { skipped: true, reason: 'Aucun gel nécessaire' };
        const fulfillments = await ctx.base44.asServiceRole.entities.FulfillmentOrder
          .filter({ order_number: order.order_number })
          .catch(() => []);
        const frozen = [];
        for (const fulfillment of fulfillments) {
          if (fulfillment.payout_released || !fulfillment.seller_id) continue;
          const { wallet } = await ensureWallet(ctx.base44, {
            ownerType: 'seller',
            ownerId: fulfillment.seller_id,
            ownerName: fulfillment.seller_name || 'Vendeur',
            tenantId: fulfillment.tenant_id || '',
            tenantOwnerEmail: fulfillment.tenant_owner_email || '',
          });
          if (wallet.status !== 'frozen') {
            await ctx.base44.asServiceRole.entities.Wallet.update(wallet.id, { status: 'frozen' });
            frozen.push(wallet.id);
          }
        }
        ctx.data.frozenWallets = frozen;
        return { frozen_wallets: frozen.length, action: ctx.data.action, payout_released: fulfillments.some((f) => f.payout_released) };
      },
    },
    {
      name: 'open_review_ticket',
      label: 'Ouvrir le dossier d’arbitrage',
      run: async (ctx) => {
        const order = ctx.data.order;
        const reference = order?.order_number || ctx.input.reference || '';
        const existing = await ctx.base44.asServiceRole.entities.SupportTicket
          .filter({ order_number: reference, status: 'open' })
          .catch(() => []);
        if (existing.length) return { ticket_id: existing[0].id, created: false };
        const ticket = await openTicket(ctx.base44, {
          tenantId: order?.tenant_id || '',
          tenantOwnerEmail: order?.tenant_owner_email || '',
          subject: `Contrôle des risques — ${reference}`,
          category: 'order',
          priority: ctx.data.level === 'critical' ? 'high' : 'normal',
          customerName: order?.customer_name || '',
          customerEmail: order?.customer_email || '',
          reference,
          description: `Score ${ctx.data.score} (${ctx.data.level}). Action : ${ctx.data.action}.`,
        });
        ctx.data.ticket = ticket;
        return { ticket_id: ticket.id, ticket_number: ticket.ticket_number, created: true };
      },
    },
    {
      name: 'resolve_case',
      label: 'Attendre la décision',
      run: async (ctx) => {
        const decision = String(ctx.input.decision || '');
        if (!decision) {
          return { waiting: true, reason: 'Décision d’un arbitre requise (approve / reject)' };
        }
        const release = decision === 'approve';
        const frozen = ctx.data.frozenWallets || [];
        for (const walletId of frozen) {
          await ctx.base44.asServiceRole.entities.Wallet.update(walletId, { status: release ? 'active' : 'frozen' }).catch(() => null);
        }
        const ticket = ctx.data.ticket;
        if (ticket) {
          await ctx.base44.asServiceRole.entities.SupportTicket.update(ticket.id, {
            status: 'resolved',
            resolution_notes: `Décision arbitre : ${decision}`,
          }).catch(() => null);
        }
        return { decision, released: release, wallets: frozen.length };
      },
    },
    {
      name: 'notify_admin',
      label: 'Alerter les administrateurs',
      critical: false,
      run: async (ctx) => {
        const reference = ctx.data.order?.order_number || ctx.input.reference || '';
        const result = await notify(ctx.base44, {
          audience: 'admin',
          type: 'system',
          title: `Contrôle des risques — ${reference}`,
          message: `Score ${ctx.data.score} (${ctx.data.level}) · action ${ctx.data.action}. Dossier d’arbitrage ouvert.`,
          reference,
        });
        return { ...result };
      },
    },
  ],
};

export const COMMERCE_WORKFLOWS = [productPublication, returnRefund, creatorCommission, fraudReview];