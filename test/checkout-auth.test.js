import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitVat, formatInvoiceNumber } from '../src/lib/tax.js';
import { computeCouponDiscount, loadCartLines } from '../src/lib/orderService.js';

describe('splitVat', () => {
  it('extracts 16% TVA from a TTC price without adding on top', () => {
    const r = splitVat(116, 16);
    assert.equal(r.ht, 100);
    assert.equal(r.vat, 16);
    assert.equal(r.ttc, 116);
  });
  it('passes amounts through when the rate is zero', () => {
    assert.deepEqual(splitVat(50, 0), { ht: 50, vat: 0, ttc: 50, rate: 0 });
  });
  it('returns zero for non-numeric input', () => {
    assert.deepEqual(splitVat('abc', 16), { ht: 0, vat: 0, ttc: 0, rate: 16 });
  });
});

describe('formatInvoiceNumber', () => {
  it('zero-pads the sequence', () => {
    assert.equal(formatInvoiceNumber(2026, 7), 'FA-2026-00007');
  });
  it('handles large sequence numbers', () => {
    assert.equal(formatInvoiceNumber(2026, 1234), 'FA-2026-01234');
  });
});

describe('computeCouponDiscount', () => {
  it('applies percent with cap', () => {
    assert.equal(computeCouponDiscount({ type: 'percent', value: 10, max_discount_usd: 5 }, 100), 5);
    assert.equal(computeCouponDiscount({ type: 'percent', value: 10 }, 100), 10);
  });
  it('caps fixed discounts at the subtotal', () => {
    assert.equal(computeCouponDiscount({ type: 'fixed', value: 50 }, 30), 30);
  });
  it('gives nothing for free_shipping and null coupons', () => {
    assert.equal(computeCouponDiscount({ type: 'free_shipping' }, 100), 0);
    assert.equal(computeCouponDiscount(null, 100), 0);
  });
});

describe('loadCartLines', () => {
  it('returns empty when items list is empty', async () => {
    const lines = await loadCartLines(null, []);
    assert.deepEqual(lines, []);
  });

  it('filters out products not found in DB', async () => {
    const fakeDb = {
      entities: {
        Product: {
          get: async () => null,
        },
      },
    };
    const lines = await loadCartLines(fakeDb, [{ product_id: 'missing', quantity: 2 }]);
    assert.deepEqual(lines, []);
  });

  it('returns enriched lines with live prices and stock check', async () => {
    const fakeDb = {
      entities: {
        Product: {
          get: async (id) => ({ id, price_usd: 25, supplier_price: 15, stock: 10, name: 'Test' }),
        },
      },
    };
    const lines = await loadCartLines(fakeDb, [{ product_id: 'p1', quantity: 3 }]);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].unit_price_usd, 25);
    assert.equal(lines[0].line_total_usd, 75);
    assert.equal(lines[0].stock_ok, true);
  });

  it('flags insufficient stock', async () => {
    const fakeDb = {
      entities: {
        Product: {
          get: async (id) => ({ id, price_usd: 25, supplier_price: 15, stock: 2, name: 'Test' }),
        },
      },
    };
    const lines = await loadCartLines(fakeDb, [{ product_id: 'p1', quantity: 5 }]);
    assert.equal(lines[0].stock_ok, false);
  });

  it('defaults quantity to 1 and ignores client-supplied price', async () => {
    const fakeDb = {
      entities: {
        Product: {
          get: async (id) => ({ id, price_usd: 100, supplier_price: 60, stock: 5, name: 'Test' }),
        },
      },
    };
    const lines = await loadCartLines(fakeDb, [{ product_id: 'p1', quantity: 'bogus', price_usd: 999 }]);
    assert.equal(lines[0].quantity, 1);
    assert.equal(lines[0].unit_price_usd, 100);
  });
});
