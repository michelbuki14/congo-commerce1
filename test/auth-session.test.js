import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getSessionId, getProfile, saveProfile, getOrderIds, rememberOrder, toggleWishlist, isWishlisted } from '../src/lib/session.js';

/** Minimal localStorage mock for Node.js test environment. */
function createStorage() {
  const store = new Map();
  return {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    _store: store,
  };
}

let ls;

describe('getSessionId', () => {
  before(() => {
    ls = createStorage();
    globalThis.localStorage = ls;
  });

  it('returns a non-empty string', () => {
    const id = getSessionId();
    assert.ok(typeof id === 'string');
    assert.ok(id.length > 0);
  });
});

describe('getProfile / saveProfile', () => {
  before(() => {
    ls = createStorage();
    globalThis.localStorage = ls;
  });

  it('returns a default profile when nothing saved', () => {
    const p = getProfile();
    assert.equal(p.phone, '');
    assert.equal(p.city, 'Kinshasa');
  });

  it('merges saved fields into default profile', () => {
    saveProfile({ phone: '+243812345678', city: 'Goma' });
    const p = getProfile();
    assert.equal(p.phone, '+243812345678');
    assert.equal(p.city, 'Goma');
  });
});

describe('getOrderIds / rememberOrder', () => {
  before(() => {
    ls = createStorage();
    globalThis.localStorage = ls;
  });

  it('returns empty array when no orders', () => {
    assert.deepEqual(getOrderIds(), []);
  });

  it('remembers an order with required fields', () => {
    rememberOrder({ id: 'o1', order_number: 'ORD-001', total_usd: 50, created_date: '2025-01-01' });
    const ids = getOrderIds();
    assert.ok(ids.some((o) => o.order_number === 'ORD-001'));
  });

  it('does not duplicate orders', () => {
    rememberOrder({ id: 'o1', order_number: 'ORD-001', total_usd: 50, created_date: '2025-01-01' });
    const ids = getOrderIds();
    const dupes = ids.filter((o) => o.order_number === 'ORD-001');
    assert.equal(dupes.length, 1);
  });
});

describe('toggleWishlist / isWishlisted', () => {
  before(() => {
    ls = createStorage();
    globalThis.localStorage = ls;
  });

  it('adds and removes a product', () => {
    toggleWishlist('p1');
    assert.equal(isWishlisted('p1'), true);
    toggleWishlist('p1');
    assert.equal(isWishlisted('p1'), false);
  });
});
