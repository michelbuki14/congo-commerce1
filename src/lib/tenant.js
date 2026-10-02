import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const KEY_PREFIX = 'congo_commerce:active_tenant:';

function readStored(key) {
  try {
    return localStorage.getItem(KEY_PREFIX + key) || '';
  } catch {
    return '';
  }
}

function writeStored(key, id) {
  try {
    localStorage.setItem(KEY_PREFIX + key, id || '');
  } catch {
    /* ignore */
  }
}

/**
 * Multitenancy: a signed-in partner only ever reaches the shop, courier fleet or
 * creator account bound to their tenant record.
 * Admins keep the global view and the account switcher.
 */
export function useTenantScope(entityName) {
  const [rows, setRows] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(() => readStored(entityName));

  useEffect(() => {
    let alive = true;
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      const admin = me?.role === 'admin';
      const tenantId = String(me?.tenant_id || '').trim();
      const all = await base44.entities[entityName].list('name', 100).catch(() => []);
      if (!alive) return;
      setRows(
        admin
          ? all
          : all.filter((r) => tenantId && String(r.tenant_id || '').trim() === tenantId),
      );
      setIsAdmin(admin);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [entityName]);

  const selectTenant = useCallback(
    (id) => {
      writeStored(entityName, id);
      setSelectedId(id);
    },
    [entityName],
  );

  return {
    tenants: rows,
    tenant: rows.find((r) => r.id === selectedId) || rows[0] || null,
    isAdmin,
    loading,
    selectTenant,
  };
}