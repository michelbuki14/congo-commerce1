import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COURIER_PROVIDERS, listCouriers, selectCourierFor } from '../src/lib/logistics.js';

describe('logistics', () => {
  it('exposes three mock couriers', () => {
    const providers = listCouriers();
    assert.equal(providers.length, 3);
    assert.ok(COURIER_PROVIDERS.kin_express);
    assert.ok(COURIER_PROVIDERS.congo_logistique);
    assert.ok(COURIER_PROVIDERS.katanga_moves);
  });

  it('calculates a rate for a served city', () => {
    const quote = COURIER_PROVIDERS.kin_express.calculateRate({ weightKg: 2, city: 'Kinshasa' });
    assert.ok(quote.available);
    assert.equal(quote.fee, 5);
    assert.equal(quote.eta, '2-4 jours');
  });

  it('declines a city the courier does not serve', () => {
    const quote = COURIER_PROVIDERS.katanga_moves.calculateRate({ weightKg: 1, city: 'Goma' });
    assert.equal(quote.available, false);
    assert.ok(quote.reason.includes('ne dessert pas'));
  });

  it('selects the cheapest courier for a city', () => {
    const choice = selectCourierFor('Kinshasa', 1);
    assert.ok(choice);
    assert.equal(choice.courier.name, 'Kin Express');
    assert.equal(choice.quote.fee, 4);
  });
});
