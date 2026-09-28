import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitVat, formatInvoiceNumber } from '../src/lib/tax.js';
import { computeCouponDiscount } from '../src/lib/orderService.js';

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
});

describe('formatInvoiceNumber', () => {
  it('zero-pads the sequence', () => {
    assert.equal(formatInvoiceNumber(2026, 7), 'FA-2026-00007');
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
