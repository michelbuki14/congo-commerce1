import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrency, setCurrency as persistCurrency } from './session';
import { formatMoney } from './format';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState('USD');

  useEffect(() => {
    setCurrencyState(getCurrency());
  }, []);

  const setCurrency = useCallback((next) => {
    setCurrencyState(next);
    persistCurrency(next);
  }, []);

  const value = useMemo(
    () => ({ currency, setCurrency, format: (usd) => formatMoney(usd, currency) }),
    [currency, setCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) return { currency: 'USD', setCurrency: () => {}, format: (usd) => formatMoney(usd, 'USD') };
  return ctx;
}