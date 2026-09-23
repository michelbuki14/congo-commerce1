import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const KEY = 'congo_commerce:active_seller';

export function getStoredSellerId() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function storeSellerId(id) {
  try {
    localStorage.setItem(KEY, id || '');
  } catch {
    /* ignore */
  }
}

/** Which storefront the current device is managing (no backend account needed). */
export function useActiveSeller() {
  const [sellers, setSellers] = useState([]);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const rows = await base44.entities.Seller.list('name', 100).catch(() => []);
      setSellers(rows);
      const stored = getStoredSellerId();
      setSeller(rows.find((s) => s.id === stored) || rows[0] || null);
      setLoading(false);
    })();
  }, []);

  const selectSeller = useCallback(
    (id) => {
      storeSellerId(id);
      setSeller(sellers.find((s) => s.id === id) || null);
    },
    [sellers],
  );

  return { sellers, seller, loading, selectSeller };
}