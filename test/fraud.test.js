import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreSignals, riskLevel, DEFAULT_RULES } from '../src/lib/fraud.js';

describe('riskLevel', () => {
  it('returns critical for scores >= 85', () => {
    assert.equal(riskLevel(85), 'critical');
    assert.equal(riskLevel(100), 'critical');
  });

  it('returns high for scores >= 60 and < 85', () => {
    assert.equal(riskLevel(60), 'high');
    assert.equal(riskLevel(84), 'high');
  });

  it('returns medium for scores >= 30 and < 60', () => {
    assert.equal(riskLevel(30), 'medium');
    assert.equal(riskLevel(59), 'medium');
  });

  it('returns low for scores below 30', () => {
    assert.equal(riskLevel(0), 'low');
    assert.equal(riskLevel(29), 'low');
  });

  it('treats non-numeric input as zero', () => {
    assert.equal(riskLevel('abc'), 'low');
  });
});

describe('scoreSignals', () => {
  it('returns zero score when no signals match enabled rules', () => {
    const result = scoreSignals([{ signal: 'nonexistent', value: 1 }], DEFAULT_RULES);
    assert.equal(result.score, 0);
    assert.equal(result.level, 'low');
    assert.equal(result.signals.length, 0);
  });

  it('sums scores for matching signals', () => {
    const signals = [
      { signal: 'high_value', value: 500 },
      { signal: 'phone_velocity', value: 5 },
    ];
    const result = scoreSignals(signals, DEFAULT_RULES);
    assert.ok(result.score > 0);
    assert.equal(result.signals.length, 2);
  });

  it('skips disabled rules', () => {
    const rules = DEFAULT_RULES.map((r) => ({ ...r, active: false }));
    const signals = [{ signal: 'high_value', value: 500 }];
    const result = scoreSignals(signals, rules);
    assert.equal(result.score, 0);
  });

  it('promotes action to block when a blocking rule matches', () => {
    const signals = [{ signal: 'self_referral', value: 1 }];
    const result = scoreSignals(signals, DEFAULT_RULES);
    assert.equal(result.action, 'block');
  });

  it('defaults action to review when no block rule matches', () => {
    const signals = [{ signal: 'high_value', value: 500 }];
    const result = scoreSignals(signals, DEFAULT_RULES);
    assert.equal(result.action, 'review');
  });

  it('caps score at reasonable values (high risk)', () => {
    const signals = [
      { signal: 'high_value', value: 500 },
      { signal: 'phone_velocity', value: 5 },
      { signal: 'session_velocity', value: 5 },
      { signal: 'failed_payments', value: 3 },
      { signal: 'refund_abuse', value: 3 },
      { signal: 'shared_phone', value: 3 },
      { signal: 'coupon_abuse', value: 4 },
      { signal: 'self_referral', value: 1 },
    ];
    const result = scoreSignals(signals, DEFAULT_RULES);
    assert.ok(result.score >= 85);
    assert.equal(result.level, 'critical');
  });
});
