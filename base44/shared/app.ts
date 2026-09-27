/** Public address of the published app — used to build links that leave the app (e-mails). */
export const APP_URL = 'https://congocommerce.base44.app';

export function pageUrl(path) {
  const clean = String(path || '/');
  return `${APP_URL}${clean.startsWith('/') ? clean : `/${clean}`}`;
}