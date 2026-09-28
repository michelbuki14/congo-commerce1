import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const ACTIVE_TENANT_KEY = 'congo_commerce:saas:active_tenant';

/**
 * Multitenancy for the SaaS layer.
 *
 * Two ways a tenant is resolved:
 *  - by hostname: a visitor arriving on a tenant's domain or subdomain is shown
 *    that tenant's branding, without any account;
 *  - by account: a signed-in owner (or an admin) selects the tenant they manage.
 *
 * Tenant-owned records carry `tenant_id`; an empty `tenant_id` means the record
 * belongs to the platform's own default tenant, so existing catalogue data keeps
 * working untouched.
 */

export const DEFAULT_TENANT_ID = '';

export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function currentHostname() {
  try {
    return window.location.hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** The tenant whose verified domain matches the host the visitor is on. */
export async function resolveTenantByHost(host = currentHostname()) {
  if (!host) return null;
  const domains = await base44.entities.TenantDomain
    .filter({ hostname: host, status: 'verified' }, '-created_date', 5)
    .catch(() => []);
  if (!domains.length) return null;
  const tenants = await base44.entities.Tenant.list('name', 200).catch(() => []);
  return tenants.find((t) => t.id === domains[0].tenant_id) || null;
}

export function readActiveTenantId() {
  try {
    return localStorage.getItem(ACTIVE_TENANT_KEY) || '';
  } catch {
    return '';
  }
}

export function writeActiveTenantId(id) {
  try {
    localStorage.setItem(ACTIVE_TENANT_KEY, id || '');
  } catch {
    /* ignore */
  }
}

function hexToHslChannels(hex) {
  const value = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const BRAND_VARS = ['--primary', '--ring', '--sidebar-primary', '--accent', '--chart-1'];

/** White label: paint the storefront with the tenant's own colours. */
export function applyTenantBranding(tenant) {
  const root = document.documentElement;
  BRAND_VARS.forEach((v) => root.style.removeProperty(v));
  if (!tenant) return;
  const primary = hexToHslChannels(tenant.primary_color);
  const accent = hexToHslChannels(tenant.accent_color);
  if (primary) {
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--ring', primary);
    root.style.setProperty('--sidebar-primary', primary);
  }
  if (accent) {
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--chart-1', accent);
  }
}

export function clearTenantBranding() {
  applyTenantBranding(null);
}

/**
 * The tenant a signed-in owner manages, or the one bound to the current host.
 * Admins get the full list plus an account switcher.
 */
export function useActiveTenant() {
  const [tenants, setTenants] = useState([]);
  const [hostTenant, setHostTenant] = useState(null);
  const [me, setMe] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(() => readActiveTenantId());

  const load = useCallback(async () => {
    const user = await base44.auth.me().catch(() => null);
    const admin = user?.role === 'admin';
    const email = String(user?.email || '').trim().toLowerCase();
    const [all, memberships, host] = await Promise.all([
      base44.entities.Tenant.list('name', 200).catch(() => []),
      email ? base44.entities.TenantMember.filter({ email }).catch(() => []) : Promise.resolve([]),
      resolveTenantByHost(),
    ]);
    const assigned = new Set(memberships.filter(m => m.status !== 'suspended').map(m => m.tenant_id));
    setMe(user);
    setIsAdmin(admin);
    setHostTenant(host);
    setTenants(admin ? all : all.filter((t) => email && (String(t.owner_email || '').trim().toLowerCase() === email || assigned.has(t.id))));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectTenant = useCallback((id) => {
    writeActiveTenantId(id);
    setSelectedId(id);
  }, []);

  const tenant = hostTenant || tenants.find((t) => t.id === selectedId) || tenants[0] || null;

  return { tenant, tenants, hostTenant, me, isAdmin, loading, selectTenant, reload: load };
}

export function isTenantOwner(tenant, me) {
  if (!tenant || !me) return false;
  if (me.role === 'admin') return true;
  return String(tenant.owner_email || '').trim().toLowerCase() === String(me.email || '').trim().toLowerCase();
}

/** Tenant-scoped query helper: an empty tenant_id is the platform's own stock. */
export function tenantScope(tenant) {
  return tenant?.id ? { tenant_id: tenant.id } : {};
}

/**
 * A catalogue record is visible on the current storefront when:
 *  - the visitor is on a store's own verified domain: only that store's records;
 *  - otherwise: the platform's own stock (no tenant_id) plus the selected store's.
 */
export function inTenantScope(record, scope) {
  const owner = String(record?.tenant_id || '');
  if (scope?.hostTenant?.id) return owner === scope.hostTenant.id;
  if (scope?.tenant?.id) return !owner || owner === scope.tenant.id;
  return !owner;
}

export function scopeRecords(records, scope) {
  return (records || []).filter((r) => inTenantScope(r, scope));
}

/**
 * The two keys that bind a record to a store's data space:
 * `tenant_id` for the store itself, `tenant_owner_email` for its owner — the
 * same email the partner consoles sign in with, so row rules can match it.
 */
export function tenantKeys(tenantId = '', tenantOwnerEmail = '') {
  return {
    tenant_id: tenantId || '',
    tenant_owner_email: tenantOwnerEmail || '',
  };
}

/** Resolves the storefront's store once per page load: host domain first, then the account's selection. */
export async function resolveStorefrontScope() {
  const hostTenant = await resolveTenantByHost();
  if (hostTenant) return { tenant: hostTenant, hostTenant };
  const id = readActiveTenantId();
  if (!id) return { tenant: null, hostTenant: null };
  const rows = await base44.entities.Tenant.filter({ id }).catch(() => []);
  return { tenant: rows[0] || null, hostTenant: null };
}