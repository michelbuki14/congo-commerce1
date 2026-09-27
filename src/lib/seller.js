import { useTenantScope } from '@/lib/tenant';

/**
 * Which storefront the signed-in account is managing. Multitenancy: a seller only
 * reaches the shop bound to their login e-mail, while admins keep the switcher.
 */
export function useActiveSeller() {
  const { tenants, tenant, isAdmin, loading, selectTenant } = useTenantScope('Seller');
  return { sellers: tenants, seller: tenant, isAdmin, loading, selectSeller: selectTenant };
}