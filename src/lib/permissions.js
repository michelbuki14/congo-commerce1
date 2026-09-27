export const TENANT_ROLES = [
  { id: 'TENANT_ADMIN', label: 'Administrateur enseigne' },
  { id: 'FINANCE_ADMIN', label: 'Finance' },
  { id: 'SUPPORT', label: 'Support' },
  { id: 'SELLER', label: 'Vendeur' },
  { id: 'CREATOR', label: 'Créateur' },
  { id: 'COURIER', label: 'Livreur' },
];

export const TENANT_PERMISSIONS = [
  { key: 'PRODUCT_CREATE', label: 'Créer des produits' },
  { key: 'PRODUCT_UPDATE', label: 'Modifier des produits' },
  { key: 'PRODUCT_DELETE', label: 'Supprimer des produits' },
  { key: 'ORDER_READ', label: 'Voir les commandes' },
  { key: 'ORDER_UPDATE', label: 'Traiter les commandes' },
  { key: 'REFUND_CREATE', label: 'Rembourser' },
  { key: 'SELLER_APPROVE', label: 'Valider des vendeurs' },
  { key: 'SELLER_SUSPEND', label: 'Suspendre des vendeurs' },
  { key: 'FINANCE_READ', label: 'Voir la finance' },
  { key: 'PAYOUT_APPROVE', label: 'Valider les retraits' },
  { key: 'SUPPLIER_MANAGE', label: 'Gérer les fournisseurs' },
  { key: 'ANALYTICS_READ', label: 'Voir l’analytique' },
  { key: 'DOMAIN_MANAGE', label: 'Gérer les domaines' },
  { key: 'TEAM_MANAGE', label: 'Gérer l’équipe' },
];

const ALL = TENANT_PERMISSIONS.map((p) => p.key);

export const ROLE_PERMISSIONS = {
  TENANT_ADMIN: ALL,
  FINANCE_ADMIN: ['ORDER_READ', 'REFUND_CREATE', 'FINANCE_READ', 'PAYOUT_APPROVE', 'ANALYTICS_READ'],
  SUPPORT: ['ORDER_READ', 'ORDER_UPDATE', 'PRODUCT_UPDATE'],
  SELLER: ['PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE', 'ORDER_READ', 'ORDER_UPDATE'],
  CREATOR: ['ANALYTICS_READ'],
  COURIER: ['ORDER_READ'],
};

export function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function permissionLabel(key) {
  return TENANT_PERMISSIONS.find((p) => p.key === key)?.label || key;
}

export function can(permission, permissions) {
  return Array.isArray(permissions) && permissions.includes(permission);
}