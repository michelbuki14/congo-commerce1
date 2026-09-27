export const DEV_SECTIONS = [
  {
    id: 'start',
    title: 'Démarrage',
    blocks: [
      { h: 'Présentation', p: "L'API Congo Commerce donne accès aux produits, commandes, expéditions et boutiques de la plateforme. Toutes les réponses sont en JSON et les montants sont exprimés en USD." },
      { h: 'Obtenir une clé API', p: "Les clés API sont délivrées par l'équipe Congo Commerce aux partenaires validés (fournisseurs, transporteurs, intégrateurs). Contactez-nous via la page Contact en précisant votre cas d'usage." },
      { h: 'Authentification', p: 'Envoyez votre clé dans l\'en-tête de chaque requête :', code: 'api_key: VOTRE_CLE_API' },
    ],
  },
  {
    id: 'api',
    title: 'Référence API',
    blocks: [
      { h: 'Lister les produits', code: 'GET /api/apps/{app_id}/entities/Product?status=active' },
      { h: 'Lire une commande', code: 'GET /api/apps/{app_id}/entities/Order/{id}' },
      { h: 'Mettre à jour une expédition', code: 'PUT /api/apps/{app_id}/entities/Shipment/{id}\n{ "status": "IN_TRANSIT", "tracking_number": "CD123456" }' },
      { h: 'Objets principaux', p: 'Product (catalogue, stock, prix), Order (commande client, paiement, TVA 16 %), FulfillmentOrder (part vendeur/fournisseur), Shipment (suivi transporteur), Seller (boutique), PickupPoint (point de retrait).' },
    ],
  },
  {
    id: 'webhooks',
    title: 'Événements',
    blocks: [
      { h: 'Événements disponibles', p: 'order.created, order.paid, fulfillment.shipped, shipment.delivered, return.requested, dispute.opened.' },
      { h: 'Format', code: '{\n  "event": "order.paid",\n  "order_number": "CC-202609-9613",\n  "total_usd": 26.98,\n  "occurred_at": "2026-09-27T12:00:00Z"\n}' },
      { h: 'Bonnes pratiques', p: 'Répondez en moins de 10 secondes avec un code 200, traitez chaque événement une seule fois (idempotence) et réessayez en cas d\'erreur.' },
    ],
  },
  {
    id: 'guides',
    title: 'Guides plateforme',
    blocks: [
      { h: 'Vendeurs', p: 'Créez votre boutique via « Vendre avec nous », ajoutez vos produits ou importez-les depuis un fournisseur, préparez les commandes et demandez vos retraits Mobile Money.' },
      { h: 'Fournisseurs', p: 'Partagez votre stock via Google Sheets (synchronisation horaire) ou via l\'API. Chaque produit conserve votre identifiant fournisseur d\'origine.' },
      { h: 'Transporteurs', p: 'Le tableau de bord livreur liste vos courses, permet de confirmer la remise avec preuve et de suivre vos gains.' },
      { h: 'Paiements', p: 'Carte bancaire via Base44 Payments, Mobile Money (M-Pesa, Airtel, Orange) et paiement à la livraison. La TVA de 16 % est affichée sur chaque facture.' },
    ],
  },
];