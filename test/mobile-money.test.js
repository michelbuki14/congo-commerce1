import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDrcPhone, networkForPhone, validateMobileMoneyNumber } from '../src/lib/mobileMoney.js';

describe('normalizeDrcPhone', () => {
  it('accepts local, international and spaced forms', () => {
    assert.equal(normalizeDrcPhone('0812345678'), '+243812345678');
    assert.equal(normalizeDrcPhone('+243812345678'), '+243812345678');
    assert.equal(normalizeDrcPhone('243 81 234 5678'), '+243812345678');
    assert.equal(normalizeDrcPhone('081 234 5678'), '+243812345678');
  });
  it('rejects wrong lengths and non-mobile prefixes', () => {
    assert.equal(normalizeDrcPhone('081234567'), '');
    assert.equal(normalizeDrcPhone('0712345678'), '');
    assert.equal(normalizeDrcPhone(''), '');
    assert.equal(normalizeDrcPhone(null), '');
  });
});

describe('networkForPhone', () => {
  it('maps prefixes to operators', () => {
    assert.equal(networkForPhone('0812345678')?.providerId, 'mpesa');
    assert.equal(networkForPhone('0991234567')?.providerId, 'airtel');
    assert.equal(networkForPhone('0891234567')?.providerId, 'orange');
  });
  it('returns null for unknown input', () => {
    assert.equal(networkForPhone('not a number'), null);
  });
});

describe('validateMobileMoneyNumber', () => {
  it('accepts a matching operator number', () => {
    const r = validateMobileMoneyNumber('mpesa', '0812345678');
    assert.equal(r.ok, true);
    assert.equal(r.phone, '+243812345678');
  });
  it('rejects a number from another operator', () => {
    const r = validateMobileMoneyNumber('mpesa', '0991234567');
    assert.equal(r.ok, false);
    assert.match(r.error, /Airtel/);
  });
  it('rejects garbage with a hint', () => {
    const r = validateMobileMoneyNumber('orange', 'abc');
    assert.equal(r.ok, false);
    assert.ok(r.hint.length > 0);
  });
});
