import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreSignals, riskLevel, DEFAULT_RULES } from '../src/lib/fraud.js';

describe('riskLevel', () => {
  it('maps scores to bands', () => {
    assert.equal(riskLevel(0), 'low');
    assert.equal(riskLevel(29), 'low');
    assert.equal(riskLevel(30), 'medium');
    assert.equal(riskLevel(60), 'high');
    assert.equal(riskLevel(85), 'critical');
    assert.equal(riskLevel(100), 'critical');
  });
});

describe('scoreSignals', () => {
  it('scores signals at or above threshold, ignores below', () => {
    const r = scoreSignals(
      [
        { signal: 'high_value', value: 500 },
        { signal: 'phone_velocity', value: 1 },
      ],
      DEFAULT_RULES,
    );
    assert.equal(r.score, 25);
    assert.deepEqual(
      r.signals.map((s) => s.code),
      ['HIGH_VALUE'],
    );
  });
  it('escalates to block when a block rule matches', () => {
    const r = scoreSignals([{ signal: 'self_referral', value: 1 }], DEFAULT_RULES);
    assert.equal(r.action, 'block');
    assert.equal(r.score, 25);
  });
  it('ignores inactive rules and unknown signals', () => {
    const rules = DEFAULT_RULES.map((x) => ({ ...x, active: x.code === 'HIGH_VALUE' ? false : true }));
    const r = scoreSignals(
      [
        { signal: 'high_value', value: 9999 },
        { signal: 'nope', value: 9999 },
      ],
      rules,
    );
    assert.equal(r.score, 0);
    assert.equal(r.level, 'low');
  });
  it('accumulates multiple matched rules', () => {
    const r = scoreSignals(
      [
        { signal: 'high_value', value: 400 },
        { signal: 'phone_velocity', value: 5 },
      ],
      DEFAULT_RULES,
    );
    assert.equal(r.score, 55);
    assert.equal(r.level, 'medium');
  });
});
