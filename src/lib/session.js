// Lightweight local session: identity, wishlist, follows and order history for
// this device. Keeps the storefront usable on low bandwidth / intermittent data.
const PREFIX = 'congo_commerce:';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — non-blocking */
  }
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function getSessionId() {
  let id = read('session_id', null);
  if (!id) {
    id = uid('sess');
    write('session_id', id);
  }
  return id;
}

export function getProfile() {
  return read('profile', { name: '', phone: '', email: '', city: 'Kinshasa', address: '' });
}

export function saveProfile(profile) {
  write('profile', { ...getProfile(), ...profile });
}

export function getCurrency() {
  return read('currency', 'USD');
}

export function setCurrency(currency) {
  write('currency', currency);
}

export function getWishlist() {
  return read('wishlist', []);
}

export function toggleWishlist(productId) {
  const list = getWishlist();
  const next = list.includes(productId) ? list.filter((id) => id !== productId) : [...list, productId];
  write('wishlist', next);
  return next;
}

export function isWishlisted(productId) {
  return getWishlist().includes(productId);
}

export function getOrderIds() {
  return read('order_ids', []);
}

export function rememberOrder(order) {
  const ids = getOrderIds();
  if (!ids.some((o) => o.id === order.id)) {
    write('order_ids', [{ id: order.id, order_number: order.order_number, total_usd: order.total_usd, created_date: order.created_date || new Date().toISOString() }, ...ids].slice(0, 50));
  }
}

export function getLikedContent() {
  return read('liked_content', []);
}

export function toggleLikedContent(contentId) {
  const list = getLikedContent();
  const next = list.includes(contentId) ? list.filter((id) => id !== contentId) : [...list, contentId];
  write('liked_content', next);
  return next;
}

export function getFollowedIds() {
  return read('follows', []);
}

export function toggleFollowId(targetId) {
  const list = getFollowedIds();
  const next = list.includes(targetId) ? list.filter((id) => id !== targetId) : [...list, targetId];
  write('follows', next);
  return next;
}

export function getReferralCode() {
  return read('referral_code', '');
}

export function setReferralCode(code) {
  write('referral_code', code || '');
}

export function clearLocalSession() {
  ['wishlist', 'liked_content', 'follows', 'order_ids', 'profile'].forEach((k) => {
    try {
      localStorage.removeItem(PREFIX + k);
    } catch {
      /* ignore */
    }
  });
}