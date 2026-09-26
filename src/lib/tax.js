import { getTaxConfig } from './config';
import { round2 } from './format';

export const DEFAULT_VAT_RATE = 16;

/**
 * Splits a TVA-inclusive amount (TTC) into the net amount (HT) and the TVA it
 * already contains. Retail prices in the DRC are displayed TTC, so the TVA is
 * never added on top of what the customer sees.
 */
export function splitVat(amountTtc, rate) {
  const ttc = round2(Number(amountTtc) || 0);
  const r = Number(rate) || 0;
  if (r <= 0) return { ht: ttc, vat: 0, ttc, rate: 0 };
  const ht = round2(ttc / (1 + r / 100));
  return { ht, vat: round2(ttc - ht), ttc, rate: r };
}

/** Active TVA rate — 0 when TVA is switched off in the compliance settings. */
export function getVatRate() {
  const cfg = getTaxConfig();
  if (cfg.enabled === false) return 0;
  return Number(cfg.vat_rate) || 0;
}

export function orderVat(totalTtc, rate = getVatRate()) {
  return splitVat(totalTtc, rate);
}

export function vatLabel(rate) {
  return `TVA (${Number(rate) || 0} %)`;
}

/** Invoice numbers are unique and continuous: FA-<année>-<séquence>. */
export function formatInvoiceNumber(year, seq) {
  return `FA-${year}-${String(seq).padStart(5, '0')}`;
}