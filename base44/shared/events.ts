/**
 * EVENT CATALOGUE
 *
 * One entry per business event the platform reacts to. A rule declares what the
 * dispatcher must do with the event: notify someone, run an automated step, and
 * whether the event belongs in the audit trail. Adding a rule here is enough —
 * no code change in the dispatcher.
 *
 * Categories: order, seller, catalogue, account, risk.
 */

export const CATEGORY_LABELS = {
  order: 'Commande',
  seller: 'Vendeur',
  catalogue: 'Catalogue',
  account: 'Compte',
  risk: 'Risque',
  system: 'Système',
};

const money = (value) => `${Number(value || 0).toFixed(2)} USD`;
const who = (ctx) => ctx.actorName || ctx.actorEmail || 'Un client';

export const EVENT_RULES = {
  // ---- Orders & fulfillment -------------------------------------------------
  order_placed: {
    category: 'order',
    severity: 'info',
    audit: true,
    notify: [
      {
        audience: 'admin',
        title: (c) => `Nouvelle commande ${c.reference}`,
        message: (c) =>
          `${who(c)} — ${money(c.payload.total_usd)} · ${c.payload.fulfillments || 0} expédition(s) · ${c.payload.city || 'ville inconnue'}`,
      },
    ],
    automate: [],
  },
  order_paid: {
    category: 'order',
    severity: 'info',
    audit: false,
    notify: [
      {
        audience: 'customer',
        title: (c) => `Paiement confirmé — ${c.reference}`,
        message: (c) => `Votre paiement de ${money(c.payload.total_usd)} a été confirmé. Vos articles partent en préparation.`,
      },
      {
        audience: 'seller',
        title: (c) => `Vente confirmée — ${c.reference}`,
        message: (c) => `Une commande payée contient vos articles (${money(c.payload.total_usd)}). Préparez-la pour le transporteur.`,
      },
    ],
    automate: [],
  },
  payment_failed: {
    category: 'order',
    severity: 'warning',
    audit: true,
    notify: [
      {
        audience: 'customer',
        title: (c) => `Paiement refusé — ${c.reference}`,
        message: (c) => `Le paiement n'a pas abouti${c.payload.reason ? ` (${c.payload.reason})` : ''}. Votre commande reste enregistrée : réessayez ou choisissez le paiement à la livraison.`,
      },
    ],
    automate: [],
  },
  fulfillment_status_changed: {
    category: 'order',
    severity: 'info',
    audit: false,
    notify: [
      {
        audience: 'customer',
        title: (c) => `Commande ${c.reference} — ${c.payload.label || c.payload.status}`,
        message: (c) => `L'expédition ${c.payload.fulfillment_number || ''} est maintenant : ${c.payload.label || c.payload.status}.`.replace(/\s+/g, ' '),
      },
    ],
    automate: [],
  },
  order_delivered: {
    category: 'order',
    severity: 'info',
    audit: false,
    notify: [
      {
        audience: 'customer',
        title: (c) => `Commande ${c.reference} livrée`,
        message: () => 'Votre colis a été livré. Vous avez 7 jours pour signaler un problème depuis « Litiges ».',
      },
      {
        audience: 'seller',
        title: (c) => `Livraison terminée — ${c.payload.fulfillment_number || c.reference}`,
        message: () => 'Votre versement est libéré : il apparaît maintenant dans votre portefeuille.',
      },
    ],
    automate: [],
  },
  payout_released: {
    category: 'order',
    severity: 'info',
    audit: true,
    notify: [
      {
        audience: 'seller',
        title: (c) => `Versement libéré — ${c.payload.fulfillment_number || c.reference}`,
        message: (c) => `${money(c.payload.seller_payout_usd)} sont désormais disponibles sur votre portefeuille.`,
      },
    ],
    automate: [],
  },

  // ---- Sellers & catalogue --------------------------------------------------
  product_published: {
    category: 'catalogue',
    severity: 'info',
    audit: false,
    notify: [
      {
        audience: 'admin',
        title: (c) => `Nouveau produit publié`,
        message: (c) => `${c.reference || 'Un produit'} vient d'être mis en ligne par ${who(c)}.`,
      },
    ],
    automate: [],
  },
  product_archived: {
    category: 'catalogue',
    severity: 'info',
    audit: false,
    notify: [],
    automate: [],
  },
  product_low_stock: {
    category: 'catalogue',
    severity: 'warning',
    audit: false,
    notify: [
      {
        audience: 'seller',
        title: (c) => `Stock faible — ${c.reference}`,
        message: (c) => `Il ne reste que ${c.payload.stock ?? 0} exemplaire(s). Réapprovisionnez pour ne pas perdre de ventes.`,
      },
      {
        audience: 'admin',
        title: (c) => `Stock faible — ${c.reference}`,
        message: (c) => `${c.payload.stock ?? 0} exemplaire(s) restant(s) chez ${c.payload.seller_name || 'un vendeur'}.`,
      },
    ],
    automate: [],
  },
  seller_applied: {
    category: 'seller',
    severity: 'warning',
    audit: true,
    notify: [
      {
        audience: 'admin',
        title: () => 'Nouvelle candidature vendeur',
        message: (c) => c.description || 'Une candidature vendeur attend une vérification.',
      },
    ],
    automate: ['open_support_ticket'],
  },

  // ---- Accounts & risk ------------------------------------------------------
  account_created: {
    category: 'account',
    severity: 'info',
    audit: false,
    notify: [
      {
        audience: 'customer',
        title: () => 'Bienvenue sur Congo Commerce',
        message: () => 'Votre compte est prêt : suivez vos commandes, vos retours et votre portefeuille depuis votre profil.',
      },
    ],
    automate: ['record_usage_event'],
  },
  dispute_opened: {
    category: 'risk',
    severity: 'critical',
    audit: true,
    // Les réactions sont portées par le workflow « Contrôle des risques ».
    notify: [],
    automate: [],
  },
  return_requested: {
    category: 'order',
    severity: 'warning',
    audit: false,
    notify: [
      {
        audience: 'admin',
        title: (c) => `Retour demandé — ${c.reference || 'commande'}`,
        message: (c) => c.description || 'Une demande de retour attend une décision.',
      },
    ],
    automate: [],
  },
  risk_flagged: {
    category: 'risk',
    severity: 'warning',
    audit: true,
    notify: [
      {
        audience: 'admin',
        title: (c) => `Risque détecté — ${c.reference || 'commande'}`,
        message: (c) =>
          `Score ${c.payload.score ?? 0} (${c.payload.level || 'inconnu'}). Règles déclenchées : ${(c.payload.signals || []).join(', ') || 'aucune'}.`,
      },
    ],
    automate: [],
  },
};

/** Resolves the rule for an event, falling back to a recorded-only event. */
export function planForEvent(name, severity = '') {
  const rule = EVENT_RULES[name];
  if (!rule) {
    return { category: 'system', severity: severity || 'info', notify: [], automate: [], audit: false, known: false };
  }
  return { ...rule, severity: severity || rule.severity || 'info', known: true };
}

/** Materialises the notification payloads of a rule against the event context. */
export function buildNotifications(ctx, rule) {
  return (rule.notify || []).map((entry) => ({
    audience: entry.audience,
    title: typeof entry.title === 'function' ? entry.title(ctx) : entry.title,
    message: typeof entry.message === 'function' ? entry.message(ctx) : entry.message,
  }));
}