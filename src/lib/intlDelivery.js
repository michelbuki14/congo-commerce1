import { getPricingConfig } from './config';
import { round2 } from './format';

/**
 * OUR OWN DELIVERY TEAM — the international leg.
 *
 * Local orders go to a partner courier (Kin Express, …). International imports
 * never do: the goods land in our own warehouse abroad, the customer approves
 * the photo, we pack, and our own team carries the parcel to its destination.
 *
 * The tariff is therefore its own table, billed per kilo, and it never mixes
 * with the local delivery fee — international freight is never waived by the
 * local free-shipping threshold.
 *
 * The same table is mirrored in the place-order function, which recomputes the
 * fee from the option id alone: the browser never sets its own freight price.
 */
export const INTL_CARRIER = {
  id: 'ccx',
  name: 'Congo Commerce Express',
  code: 'CCX',
};

/** Fallback table, used until the pricing settings carry their own. */
export const DEFAULT_INTL_OPTIONS = [
  { id: 'ccx_standard', label: 'Standard', base_usd: 12, per_kg_usd: 6, eta_days: '15-20 jours' },
  { id: 'ccx_express', label: 'Express', base_usd: 26, per_kg_usd: 13, eta_days: '7-12 jours' },
];

/** Platform settings may override the table without a deploy. */
export function getIntlOptions() {
  const configured = getPricingConfig()?.intl_delivery_options;
  return Array.isArray(configured) && configured.length ? configured : DEFAULT_INTL_OPTIONS;
}

export function findIntlOption(id) {
  const wanted = String(id || '');
  return getIntlOptions().find((o) => o.id === wanted) || null;
}

export function intlLines(lines = []) {
  return lines.filter((l) => l.product?.source_type === 'international_supplier');
}

/** Billable weight of the imported lines, at the 0.5 kg floor used elsewhere. */
export function intlWeightKg(lines = []) {
  return round2(
    intlLines(lines).reduce(
      (s, l) => s + (Number(l.product?.weight_kg) || 0.5) * (Number(l.quantity) || 1),
      0,
    ),
  );
}

export function intlFee(option, weightKg = 0) {
  if (!option) return 0;
  return round2(
    (Number(option.base_usd) || 0) + (Number(option.per_kg_usd) || 0) * Math.max(0, Number(weightKg) || 0),
  );
}

/** What the customer sees as their carrier: our team plus the service they chose. */
export function intlServiceLabel(option) {
  return option ? `${INTL_CARRIER.name} · ${option.label}` : INTL_CARRIER.name;
}