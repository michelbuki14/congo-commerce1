import { base44 } from '@/api/base44Client';

/**
 * Client side of the event spine. Call `emitEvent` from the flow that already
 * performs the action — the platform then records the event and reacts to it
 * (notification to the right person, automated step, audit trail).
 *
 * Emission never blocks the user's action: a failure to record an event is
 * swallowed here and logged on the server side.
 */

export const EVENT_CATEGORIES = {
  order: 'Commandes',
  seller: 'Vendeurs',
  catalogue: 'Catalogue',
  account: 'Comptes',
  risk: 'Risques',
};

export const EVENT_LABELS = {
  order_placed: 'Commande enregistrée',
  order_paid: 'Paiement confirmé',
  payment_failed: 'Paiement échoué',
  fulfillment_status_changed: 'Expédition mise à jour',
  order_delivered: 'Commande livrée',
  payout_released: 'Versement libéré',
  product_published: 'Produit publié',
  product_archived: 'Produit archivé',
  product_low_stock: 'Stock faible',
  seller_applied: 'Candidature vendeur',
  account_created: 'Nouveau compte',
  dispute_opened: 'Litige ouvert',
  return_requested: 'Demande de retour',
  risk_flagged: 'Risque détecté',
};

export function emitEvent(name, options = {}) {
  return base44.functions
    .invoke('dispatchPlatformEvent', {
      name,
      category: options.category || '',
      source: options.source || '',
      source_id: options.sourceId || '',
      reference: options.reference || '',
      severity: options.severity || '',
      tenant_id: options.tenantId || '',
      tenant_owner_email: options.tenantOwnerEmail || '',
      description: options.description || '',
      payload: options.payload || {},
    })
    .then((res) => res?.data || null)
    .catch(() => null);
}