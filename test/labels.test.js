import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fr from '../src/i18n/fr.js';
import { SHIPMENT_STATUS_LABELS } from '../src/lib/logistics.js';
import { HEALTH_LABELS } from '../src/lib/platformHealth.js';
import { EVENT_LABELS } from '../src/lib/events.js';
import { DISPUTE_TYPES, RESOLUTION_LABELS } from '../src/lib/disputeResolution.js';
import { FEATURE_LABELS } from '../src/lib/plans.js';
import { RETURN_REASON_LABELS } from '../src/lib/returns.js';

function hasKey(key) {
  const parts = key.split('.');
  // eslint-disable-next-line no-unused-vars
  let node = fr;
  for (const p of parts) {
    node = node?.[p];
    if (node === undefined) return false;
  }
  return true;
}

describe('lib label maps resolve in French dict', () => {
  const maps = {
    SHIPMENT_STATUS_LABELS,
    HEALTH_LABELS,
    EVENT_LABELS,
    DISPUTE_TYPES,
    RESOLUTION_LABELS,
    FEATURE_LABELS,
    RETURN_REASON_LABELS,
  };
  for (const [name, map] of Object.entries(maps)) {
    it(`${name} values all exist in fr`, () => {
      const missing = Object.values(map).filter((k) => !hasKey(k));
      assert.deepEqual(missing, []);
    });
  }
});
