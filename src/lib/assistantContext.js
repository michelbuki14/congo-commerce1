// Builds the short customer brief the shopping agent uses to personalize its
// recommendations. Everything comes from data already on this device, so no
// extra read access to other customers' records is needed.
import { base44 } from '@/api/base44Client';
import { getProfile, getWishlist, getOrderIds, getFollowedIds, getSessionId } from '@/lib/session';

const BRIEF_PREFIX = 'Profil client (fourni automatiquement';

export async function buildCustomerBrief() {
  const profile = getProfile();

  const [wishRows, orders] = await Promise.all([
    Promise.all(getWishlist().slice(0, 6).map((id) => base44.entities.Product.get(id).catch(() => null))),
    base44.entities.Order.filter({ session_id: getSessionId() }, '-created_date', 5).catch(() => []),
  ]);

  const favourites = wishRows.filter(Boolean).map((p) => p.title);
  const bought = orders
    .flatMap((o) => (o.items || []).map((i) => i.title))
    .filter(Boolean)
    .slice(0, 6);
  const ordersCount = getOrderIds().length;
  const follows = getFollowedIds().length;

  const parts = [];
  if (profile.name) parts.push(`prénom : ${profile.name}`);
  if (profile.city) parts.push(`ville de livraison : ${profile.city}`);
  if (bought.length) parts.push(`articles déjà achetés : ${bought.join(', ')}`);
  if (favourites.length) parts.push(`articles en favoris : ${favourites.join(', ')}`);
  if (follows) parts.push(`boutiques ou créateurs suivis : ${follows}`);
  if (ordersCount) parts.push(`commandes déjà passées : ${ordersCount}`);

  if (!parts.length) return '';
  return `${BRIEF_PREFIX}, à utiliser pour personnaliser sans le réciter) — ${parts.join(' ; ')}.`;
}

// The customer's own bubble must show what they typed, never the internal
// profile brief that travels with their first message.
export function visibleUserText(content) {
  const text = String(content || '');
  if (!text.startsWith(BRIEF_PREFIX)) return text;
  const body = text.split('\n\n').slice(1).join('\n\n');
  return body.replace(/^Demande du client :\s*/, '') || text;
}