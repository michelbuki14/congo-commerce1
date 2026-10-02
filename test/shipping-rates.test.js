import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  billableWeight,
  volumetricWeight,
  longestSide,
  pickRate,
  rateMatches,
  regionalSurchargeFor,
  dutyEstimate,
  quoteShipping,
  averageRate,
  DEFAULT_SHIPPING_CONFIG,
} from '../src/lib/shippingRates.js';

describe('longestSide', () => {
  it('returns the largest dimension', () => {
    assert.equal(longestSide({ length: 10, width: 20, height: 15 }), 20);
  });
  it('handles null/undefined input', () => {
    assert.equal(longestSide(null), 0);
    assert.equal(longestSide(undefined), 0);
  });
});

describe('volumetricWeight', () => {
  it('computes volumetric weight with default divisor', () => {
    assert.equal(volumetricWeight({ length: 40, width: 30, height: 20 }), 4.8);
  });
  it('returns 0 when any dimension is missing', () => {
    assert.equal(volumetricWeight({ length: 40, width: 30 }), 0);
  });
});

describe('billableWeight', () => {
  it('returns the greater of actual and volumetric', () => {
    const r = billableWeight({ weightKg: 2, dims: { length: 60, width: 40, height: 30 } });
    assert.equal(r.actual, 2);
    assert.ok(r.volumetric > 2);
    assert.equal(r.billable, r.volumetric);
  });
  it('returns actual weight when it dominates', () => {
    const r = billableWeight({ weightKg: 10 });
    assert.equal(r.actual, 10);
    assert.equal(r.volumetric, 0);
    assert.equal(r.billable, 10);
  });
});

describe('rateMatches', () => {
  const base = { active: true, destination: 'kinshasa', courier_id: 'c1', min_weight_kg: 0, max_weight_kg: 20, max_dimension_cm: 0 };

  it('matches when all criteria align', () => {
    assert.equal(rateMatches(base, { destination: 'Kinshasa', courierId: 'c1', weightKg: 5 }), true);
  });

  it('rejects inactive rates', () => {
    assert.equal(rateMatches({ ...base, active: false }, { destination: 'kinshasa', courierId: 'c1', weightKg: 5 }), false);
  });

  it('rejects mismatched destination (case-insensitive)', () => {
    assert.equal(rateMatches(base, { destination: 'matadi', courierId: 'c1', weightKg: 5 }), false);
  });

  it('rejects weight below minimum', () => {
    assert.equal(rateMatches({ ...base, min_weight_kg: 10 }, { destination: 'kinshasa', courierId: 'c1', weightKg: 5 }), false);
  });

  it('rejects weight above maximum', () => {
    assert.equal(rateMatches({ ...base, max_weight_kg: 10 }, { destination: 'kinshasa', courierId: 'c1', weightKg: 15 }), false);
  });

  it('rejects when dimension cap is exceeded', () => {
    assert.equal(rateMatches({ ...base, max_dimension_cm: 50 }, { destination: 'kinshasa', courierId: 'c1', weightKg: 5, longestSideCm: 60 }), false);
  });
});

describe('pickRate', () => {
  it('returns null when no rates match', () => {
    assert.equal(pickRate([{ active: true, destination: 'x' }], { destination: 'y' }), null);
  });

  it('picks the most specific match (priority + courier + destination)', () => {
    const rates = [
      { active: true, destination: 'kinshasa', priority: 0, courier_id: '', min_weight_kg: 0, max_weight_kg: 0, max_dimension_cm: 0 },
      { active: true, destination: 'kinshasa', priority: 0, courier_id: 'c1', min_weight_kg: 0, max_weight_kg: 0, max_dimension_cm: 0 },
    ];
    const r = pickRate(rates, { destination: 'Kinshasa', courierId: 'c1', weightKg: 1 });
    assert.equal(r.courier_id, 'c1');
  });
});

describe('regionalSurchargeFor', () => {
  it('returns the matching surcharge', () => {
    const cfg = { regional_surcharges: [{ destination: 'kinshasa', surcharge_usd: 5 }] };
    assert.equal(regionalSurchargeFor(cfg, 'Kinshasa'), 5);
  });
  it('returns 0 when no match', () => {
    assert.equal(regionalSurchargeFor({ regional_surcharges: [] }, 'goma'), 0);
  });
});

describe('dutyEstimate', () => {
  it('computes duty and VAT for international orders', () => {
    const r = dutyEstimate({ goodsUsd: 100, config: DEFAULT_SHIPPING_CONFIG, originCountry: 'CN' });
    assert.equal(r.duty, 12);
    assert.ok(r.importVat > 0);
  });
  it('returns zero duty for domestic orders', () => {
    const r = dutyEstimate({ goodsUsd: 100, config: DEFAULT_SHIPPING_CONFIG, originCountry: 'CD' });
    assert.equal(r.duty, 0);
    assert.equal(r.importVat, 0);
  });
});

describe('quoteShipping', () => {
  const cfg = { ...DEFAULT_SHIPPING_CONFIG, regional_surcharges: [] };
  const rate = { active: true, destination: 'kinshasa', courier_id: '', base_usd: 5, per_kg_usd: 1, min_weight_kg: 0, max_weight_kg: 50, eta_days: 3 };

  it('computes freight and adds fees', () => {
    const q = quoteShipping({ rates: [rate], config: cfg, destination: 'kinshasa', weightKg: 2 });
    assert.ok(q.freight >= 5);
    assert.ok(q.total >= q.freight);
    assert.equal(q.matched, true);
  });

  it('returns zero freight when no rate matches', () => {
    const q = quoteShipping({ rates: [rate], config: cfg, destination: 'nowhere', weightKg: 1 });
    assert.equal(q.freight, 0);
    assert.equal(q.matched, false);
  });

  it('marks free shipping when above threshold', () => {
    const q = quoteShipping({ rates: [rate], config: cfg, destination: 'kinshasa', weightKg: 1, goodsUsd: 100 });
    assert.equal(q.freeShipping, true);
  });
});

describe('averageRate', () => {
  it('returns average of matching rates', () => {
    const rates = [
      { active: true, base_usd: 5, per_kg_usd: 1, max_weight_kg: 10 },
      { active: true, base_usd: 7, per_kg_usd: 2, max_weight_kg: 10 },
    ];
    const avg = averageRate(rates, 1);
    assert.ok(avg > 0);
  });

  it('returns null when no rates match weight', () => {
    assert.equal(averageRate([{ active: true, base_usd: 5, per_kg_usd: 1, max_weight_kg: 10 }], 100), null);
  });
});
