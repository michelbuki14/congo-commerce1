import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { round2, usdToCdf, formatUSD, formatCDF } from '../src/lib/format.js';

describe('round2', () => {
  it('rounds half-up to cents', () => {
    assert.equal(round2(2.345), 2.35);
    assert.equal(round2(2.344), 2.34);
  });
  it('absorbs float dust (0.1 + 0.2)', () => {
    assert.equal(round2(0.1 + 0.2), 0.3);
  });
  it('treats non-numbers as zero', () => {
    assert.equal(round2(undefined), 0);
    assert.equal(round2('abc'), 0);
  });
});

describe('usdToCdf', () => {
  it('converts at the default 2800 rate', () => {
    assert.equal(usdToCdf(10), 28000);
    assert.equal(usdToCdf(0.5), 1400);
  });
});

describe('display formatters', () => {
  it('formats USD with cents', () => {
    assert.equal(formatUSD(12.5), '$12.50');
  });
  it('formats CDF without decimals', () => {
    assert.ok(formatCDF(28000).includes('28'));
  });
});
