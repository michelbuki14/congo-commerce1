/**
 * DRC mobile-money numbering.
 *
 * A Congolese mobile number is 9 digits after the country code (+243), and the
 * first two digits identify the operator. The number a gateway is asked to debit
 * must be the customer's own wallet number — not necessarily the delivery phone —
 * so it is captured and validated on its own.
 */
import i18n from '@/i18n';
export const DRC_NETWORKS = [
  { providerId: 'mpesa', name: 'M-Pesa (Vodacom)', prefixes: ['81', '82', '83'] },
  { providerId: 'airtel', name: 'Airtel Money', prefixes: ['96', '97', '98', '99'] },
  { providerId: 'orange', name: 'Orange Money', prefixes: ['84', '85', '89'] },
  { providerId: 'africell', name: 'Afrimoney (Africell)', prefixes: ['90', '91'] },
];

/** Strips spaces, dashes and the country code into +243XXXXXXXXX, or '' if unusable. */
export function normalizeDrcPhone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return '';
  let local = digits;
  if (local.startsWith('243')) local = local.slice(3);
  else if (local.startsWith('0')) local = local.slice(1);
  if (local.length !== 9) return '';
  if (local[0] !== '8' && local[0] !== '9') return '';
  return `+243${local}`;
}

/** The operator a number belongs to, or null when its prefix is unknown. */
export function networkForPhone(phone) {
  const normalized = normalizeDrcPhone(phone);
  if (!normalized) return null;
  const prefix = normalized.slice(4, 6);
  return DRC_NETWORKS.find((n) => n.prefixes.includes(prefix)) || null;
}

/**
 * Checks a number against the operator the customer picked, so a payment is
 * never sent to a wallet the gateway cannot debit.
 */
export function validateMobileMoneyNumber(providerId, raw) {
  const t = i18n.t.bind(i18n);
  const network = DRC_NETWORKS.find((n) => n.providerId === providerId);
  const hint = network
    ? t('momo.hint', { network: network.name, prefixes: network.prefixes.map((p) => `0${p}`).join(', ') })
    : t('momo.hintDefault');
  const phone = normalizeDrcPhone(raw);

  if (!phone) {
    return { ok: false, phone: '', hint, error: t('momo.invalid') };
  }

  const detected = networkForPhone(phone);
  if (detected && network && detected.providerId !== network.providerId) {
    return {
      ok: false,
      phone,
      hint,
      error: t('momo.mismatch', { detected: detected.name, network: network.name }),
    };
  }

  return { ok: true, phone, hint, error: '' };
}