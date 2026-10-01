import test from 'node:test';
import assert from 'node:assert/strict';
import { sameIdentity, sellerMayAct, courierMayAct, validAdvance, validCourierAdvance } from './fulfillmentAccess.js';

test('seller cannot act on another shop or a suspended shop', () => {
  assert.equal(sellerMayAct({ email: 'own@example.test', status: 'active' }, { email: 'own@example.test' }), true);
  assert.equal(sellerMayAct({ email: 'other@example.test', status: 'active' }, { email: 'own@example.test' }), false);
  assert.equal(sellerMayAct({ email: 'own@example.test', status: 'suspended' }, { email: 'own@example.test' }), false);
});
test('courier cannot act on another fleet or a disabled fleet', () => {
  assert.equal(courierMayAct({ email: 'fleet@example.test', active: true }, { email: 'fleet@example.test' }), true);
  assert.equal(courierMayAct({ email: 'other@example.test', active: true }, { email: 'fleet@example.test' }), false);
  assert.equal(courierMayAct({ email: 'fleet@example.test', active: false }, { email: 'fleet@example.test' }), false);
  assert.equal(sameIdentity('', ''), false);
});
test('seller cannot forge delivery or skip milestones; admin cannot skip', () => {
  assert.equal(validAdvance('CONFIRMED', 'PROCESSING', false), true);
  assert.equal(validAdvance('PENDING', 'DELIVERED', false), false);
  assert.equal(validAdvance('OUT_FOR_DELIVERY', 'DELIVERED', false), false);
  assert.equal(validAdvance('PENDING', 'DELIVERED', true), false);
  assert.equal(validAdvance('DELIVERED', 'CANCELLED', true), false);
});
test('courier cannot deliver an unaccepted, already delivered or cancelled shipment', () => {
  const f = { status: 'IN_TRANSIT' };
  assert.equal(validCourierAdvance({ status: 'IN_TRANSIT', courier_response: 'accepted' }, f, 'DELIVERED'), true);
  assert.equal(validCourierAdvance({ status: 'IN_TRANSIT', courier_response: 'pending' }, f, 'DELIVERED'), false);
  assert.equal(validCourierAdvance({ status: 'DELIVERED', courier_response: 'accepted' }, f, 'DELIVERED'), false);
  assert.equal(validCourierAdvance({ status: 'IN_TRANSIT', courier_response: 'accepted' }, { status: 'CANCELLED' }, 'DELIVERED'), false);
});