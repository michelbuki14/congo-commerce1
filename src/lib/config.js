import { base44 } from '@/api/base44Client';
import { setCdfRate } from './format';

/**
 * Every commercial rule lives here (or in the PlatformSetting records that override it).
 * Nothing country-specific is hard-coded inside pages or the commerce engine.
 */
export const DEFAULT_PRICING_CONFIG = {
  platform_margin_percent: 12,
  payment_fee_percent: 2.5,
  seller_commission_percent: 10,
  creator_commission_percent: 8,
  import_cost_percent: 7,
  international_shipping_usd: 9,
  local_logistics_usd: 2.5,
  free_shipping_threshold_usd: 60,
};

export const DEFAULT_COUNTRY_CONFIG = {
  code: 'CD',
  name: 'République Démocratique du Congo',
  default_currency: 'USD',
  currencies: ['USD', 'CDF'],
  usd_to_cdf_rate: 2800,
  timezone: 'Africa/Kinshasa',
  phone_prefix: '+243',
  languages: ['fr', 'en'],
  cities: ['Kinshasa', 'Lubumbashi', 'Goma', 'Bukavu', 'Matadi', 'Kananga', 'Kisangani', 'Mbuji-Mayi', 'Kolwezi', 'Bunia'],
};

let cache = null;
let inflight = null;

export async function loadPlatformConfig(force = false) {
  if (cache && !force) return cache;
  if (inflight && !force) return inflight;
  inflight = (async () => {
    let pricing = DEFAULT_PRICING_CONFIG;
    let country = DEFAULT_COUNTRY_CONFIG;
    try {
      const rows = await base44.entities.PlatformSetting.list();
      const byKey = {};
      rows.forEach((r) => { byKey[r.key] = r.value || {}; });
      pricing = { ...DEFAULT_PRICING_CONFIG, ...(byKey.pricing || {}) };
      country = { ...DEFAULT_COUNTRY_CONFIG, ...(byKey.country || {}) };
    } catch {
      // Settings unavailable — fall back to defaults so the storefront still works.
    }
    setCdfRate(country.usd_to_cdf_rate);
    cache = { pricing, country };
    return cache;
  })();
  return inflight;
}

export function getPricingConfig() {
  return cache?.pricing || DEFAULT_PRICING_CONFIG;
}

export function getCountryConfig() {
  return cache?.country || DEFAULT_COUNTRY_CONFIG;
}

export function getCities() {
  return getCountryConfig().cities || DEFAULT_COUNTRY_CONFIG.cities;
}