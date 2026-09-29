import { base44 } from '@/api/base44Client';

/** Used by the platform event dispatcher. Browser-side only — server functions
 *  call their own inline version with the asServiceRole client. */
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

/** Emit a platform event. Accepts an optional Base44 client so server functions
 *  can pass the asServiceRole / db client instead of the browser client. */
export function emitEvent(client, name, options = {}) {
  const db = client || base44;
  return db.functions
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
