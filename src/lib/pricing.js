import { getPricingConfig, DEFAULT_PRICING_CONFIG } from './config';
import { round2 } from './format';

export { DEFAULT_PRICING_CONFIG };

/**
 * PRICING ENGINE
 * Supplier price → international shipping → import costs → local logistics →
 * platform margin → fees. Every component is configurable, never hard-coded,
 * and the raw supplier price is never shown to a customer.
 */
export function computePriceBreakdown(product, cfg = getPricingConfig()) {
  const supplierPrice = Number(product?.supplier_price ?? product?.price_usd ?? 0) || 0;
  const isInternational = product?.source_type === 'international_supplier';

  const intlShipping = isInternational ? Number(cfg.international_shipping_usd) || 0 : 0;
  const importCosts = isInternational ? round2(supplierPrice * ((cfg.import_cost_percent || 0) / 100)) : 0;
  const logistics = Number(cfg.local_logistics_usd) || 0;
  const markupPercent = Number(product?.markup_percent ?? cfg.platform_margin_percent) || 0;
  const margin = round2(supplierPrice * (markupPercent / 100));
  const fees = round2(supplierPrice * ((cfg.payment_fee_percent || 0) / 100));

  const total = round2(supplierPrice + intlShipping + importCosts + logistics + margin + fees);

  return {
    supplierPrice,
    intlShipping,
    importCosts,
    logistics,
    margin,
    markupPercent,
    fees,
    total,
    isInternational,
  };
}

/** Suggested retail price used by the import tooling when publishing a product. */
export function suggestCustomerPrice(supplierPrice, sourceType, markupPercent, cfg = getPricingConfig()) {
  return computePriceBreakdown(
    { supplier_price: supplierPrice, source_type: sourceType, markup_percent: markupPercent },
    cfg,
  ).total;
}

export function applyMarkup(supplierPrice, markupPercent) {
  return round2(Number(supplierPrice || 0) * (1 + (Number(markupPercent) || 0) / 100));
}