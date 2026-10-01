/** Public address of the published app — used to build links that leave the app (e-mails). */
export const APP_URL = 'https://congocommerce.base44.app';

export function pageUrl(path) {
  const clean = String(path || '/');
  return `${APP_URL}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

/**
 * Escapes a stored value before it is interpolated into an HTML e-mail body or
 * attribute. Every value that originates from a user-editable record (shop
 * name, product slug, …) must pass through here: e-mail HTML is a rendering
 * sink exactly like a page.
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}