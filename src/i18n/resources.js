import fr from './fr.js';
import en from './en.js';
import ln from './ln.js';
import sw from './sw.js';
import intlShipment from './intlShipment.js';

/**
 * The dictionaries the app actually runs on.
 *
 * fr.js / en.js are at their size limit, so newer namespaces (the
 * international-shipment route) live in intlShipment.js and are merged in
 * here. Anything that needs to resolve a translation key — the i18n setup and
 * the tests — reads these merged objects, so both see the same keys the UI
 * does. Lingala and Kiswahili fall back to the French copy for the newer
 * namespaces.
 */
export const mergeNamespaces = (base, extra) =>
  Object.entries(extra).reduce((out, [ns, values]) => ({ ...out, [ns]: { ...(out[ns] || {}), ...values } }), { ...base });

export const translations = {
  fr: mergeNamespaces(fr, intlShipment.fr),
  en: mergeNamespaces(en, intlShipment.en),
  ln: mergeNamespaces(ln, intlShipment.fr),
  sw: mergeNamespaces(sw, intlShipment.fr),
};