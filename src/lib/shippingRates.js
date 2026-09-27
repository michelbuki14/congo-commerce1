import { base44 } from '@/api/base44Client';
import { round2 } from './format';

/**
 * SHIPPING RATE ENGINE
 * Admin-managed rate table: destination × courier × weight band × dimension cap.
 * A rate row is deliberately narrow — the quote picks the most specific row that
 * matches, so a generic "rest of country" line never beats a Kinshasa 0-1 kg line.
 */
export const DEFAULT_SHIPPING_CONFIG = {
  volumetric_divisor: 5000,
  handling_fee_usd: 1.5,
  cod_fee_usd: 1,
  fuel_surcharge_percent: 4,
  remote_area_surcharge_usd: 3.5,
  free_shipping_threshold_usd: 60,
  import_duty_percent: 12,
  import_vat_percent: 16,
  duty_included_in_price: true,
  regional_surcharges: [],
};

export const DESTINATION_TYPES = [
  { id: 'city', label: 'Ville' },
  { id: 'country', label: 'Pays' },
  { id: 'zone', label: 'Zone régionale' },
];

export async function loadShippingConfig() {
  const rows = await base44.entities.PlatformSetting.filter({ key: 'shipping' }).catch(() => []);
  return { ...DEFAULT_SHIPPING_CONFIG, ...(rows[0]?.value || {}) };
}

export async function saveShippingConfig(value) {
  const rows = await base44.entities.PlatformSetting.filter({ key: 'shipping' }).catch(() => []);
  const payload = { key: 'shipping', label: 'Configuration livraison', group: 'commerce', value };
  if (rows[0]) return base44.entities.PlatformSetting.update(rows[0].id, payload);
  return base44.entities.PlatformSetting.create(payload);
}

/** Longest side of a package, used against a rate's dimension cap. */
export function longestSide(dims) {
  return Math.max(Number(dims?.length) || 0, Number(dims?.width) || 0, Number(dims?.height) || 0);
}

export function volumetricWeight(dims, divisor) {
  const l = Number(dims?.length) || 0;
  const w = Number(dims?.width) || 0;
  const h = Number(dims?.height) || 0;
  if (!l || !w || !h) return 0;
  return round2((l * w * h) / (Number(divisor) || DEFAULT_SHIPPING_CONFIG.volumetric_divisor));
}

/** Couriers bill the greater of real weight and volumetric weight. */
export function billableWeight({ weightKg = 0, dims = null } = {}, divisor) {
  const actual = round2(Number(weightKg) || 0);
  const volumetric = volumetricWeight(dims, divisor);
  return { actual, volumetric, billable: Math.max(actual, volumetric) };
}

export function rateMatches(rate, query) {
  if (rate.active === false) return false;
  const destination = String(query.destination || '').trim().toLowerCase();
  if (rate.destination && destination && String(rate.destination).trim().toLowerCase() !== destination) return false;
  if (rate.courier_id && query.courierId && rate.courier_id !== query.courierId) return false;
  const weight = Number(query.weightKg) || 0;
  if (weight < (Number(rate.min_weight_kg) || 0)) return false;
  const max = Number(rate.max_weight_kg) || 0;
  if (max > 0 && weight > max) return false;
  const cap = Number(rate.max_dimension_cm) || 0;
  if (cap > 0 && (Number(query.longestSideCm) || 0) > cap) return false;
  return true;
}

function specificity(rate) {
  let score = Number(rate.priority) || 0;
  if (rate.courier_id) score += 2;
  if (rate.destination) score += 2;
  if (Number(rate.max_dimension_cm) > 0) score += 1;
  return score;
}

/** Most specific matching row, then the narrowest weight band. */
export function pickRate(rates = [], query = {}) {
  const matches = rates.filter((r) => rateMatches(r, query));
  if (!matches.length) return null;
  return matches.sort(
    (a, b) =>
      specificity(b) - specificity(a) ||
      (Number(a.max_weight_kg) || 0) - (Number(b.max_weight_kg) || 0),
  )[0];
}

export function regionalSurchargeFor(config, destination) {
  const city = String(destination || '').trim().toLowerCase();
  const row = (config?.regional_surcharges || []).find(
    (r) => String(r.destination || '').trim().toLowerCase() === city,
  );
  return round2(row?.surcharge_usd || 0);
}

/** Import duty + VAT estimate. `included` says whether the retail price already carries it. */
export function dutyEstimate({ goodsUsd = 0, config, originCountry = 'CD' } = {}) {
  const cfg = { ...DEFAULT_SHIPPING_CONFIG, ...(config || {}) };
  const goods = round2(Number(goodsUsd) || 0);
  const international = String(originCountry || 'CD').toUpperCase() !== 'CD';
  const dutiable = international ? goods : 0;
  const duty = round2(dutiable * ((cfg.import_duty_percent || 0) / 100));
  const importVat = round2((dutiable + duty) * ((cfg.import_vat_percent || 0) / 100));
  return { goods, international, dutiable, duty, importVat, total: round2(duty + importVat), included: cfg.duty_included_in_price !== false };
}

export function quoteShipping({
  rates = [],
  config,
  destination,
  courierId,
  weightKg = 0,
  dims = null,
  goodsUsd = 0,
  originCountry = 'CD',
  paymentMethod = 'mobile_money',
} = {}) {
  const cfg = { ...DEFAULT_SHIPPING_CONFIG, ...(config || {}) };
  const weight = billableWeight({ weightKg, dims }, cfg.volumetric_divisor);
  const rate = pickRate(rates, {
    destination,
    courierId,
    weightKg: weight.billable,
    longestSideCm: longestSide(dims),
  });

  const freight = rate ? round2((Number(rate.base_usd) || 0) + (Number(rate.per_kg_usd) || 0) * weight.billable) : 0;
  const rateSurcharge = round2(Number(rate?.surcharge_usd) || 0);
  const fuel = round2(freight * ((Number(cfg.fuel_surcharge_percent) || 0) / 100));
  const regional = rate ? regionalSurchargeFor(cfg, destination) : round2(Number(cfg.remote_area_surcharge_usd) || 0);
  const handling = round2(Number(cfg.handling_fee_usd) || 0);
  const cod = paymentMethod === 'cash_on_delivery' ? round2(Number(cfg.cod_fee_usd) || 0) : 0;
  const subtotal = round2(freight + rateSurcharge + fuel + regional + handling + cod);

  const duty = dutyEstimate({ goodsUsd, config: cfg, originCountry });
  const dutyCharged = duty.included ? 0 : duty.total;

  return {
    weight,
    rate,
    matched: Boolean(rate),
    freight,
    rateSurcharge,
    fuel,
    regional,
    handling,
    cod,
    subtotal,
    duty,
    dutyCharged,
    total: round2(subtotal + dutyCharged),
    etaDays: rate?.eta_days || '',
    freeShipping: goodsUsd >= (Number(cfg.free_shipping_threshold_usd) || 0),
  };
}

/** Average cost of the cheapest rate for a given weight, used by the admin summary. */
export function averageRate(rates = [], weightKg = 1) {
  const usable = rates.filter((r) => r.active !== false && rateMatches(r, { weightKg }));
  if (!usable.length) return null;
  const fees = usable.map((r) => (Number(r.base_usd) || 0) + (Number(r.per_kg_usd) || 0) * weightKg);
  return round2(fees.reduce((a, b) => a + b, 0) / fees.length);
}