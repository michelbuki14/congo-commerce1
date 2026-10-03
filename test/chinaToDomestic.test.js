// test/chinaToDomestic.test.js
// Unit test for base44/functions/chinaToDomestic/entry.ts
//
// Uses a shared global state object so the stub (imported by the test module)
// and the test assertions see the same data.

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fnSrcPath = path.join(__dirname, '..', 'base44/functions/chinaToDomestic/entry.ts');
const originalSrc = fs.readFileSync(fnSrcPath, 'utf8');

// Shared mutable state — both the stub and the test reference the same object.
const state = {
  receipt: null,
  products: [],
  calls: { filter: {}, update: {}, create: {} },
};

function resetState() {
  state.receipt = {
    id: 7, status: 'approved', tenant_id: 't-1', tenant_owner_email: 'owner@demo.test',
    order_id: 'o-1', order_number: 'ORD-1001', receipt_number: 'RCP-77',
    items: [
      { product_id: 'p-1', qty: 3, unit_price_usd: 12.5 },
      { product_id: 'p-2', qty: 1, unit_price_usd: 40.0 },
    ],
    created_by_id: 'u-1',
  };
  state.products = [
    { id: 'p-1', name: 'Widget A', stock: 10 },
    { id: 'p-2', name: 'Widget B', stock: 4 },
  ];
  state.calls = { filter: {}, update: {}, create: {} };
}

function writeTestModule() {
  const clientPath = 'file://' + path.join(__dirname, 'chinaToDomestic.client.mjs').replace(/\\/g, '/');
  const rewritten = originalSrc.replace(
    /import\s+\{[^}]*createClientFromRequest[^}]*\}\s+from\s+['"]npm:@base44\/sdk@[^'"]+['"]/,
    `import { createClientFromRequest } from "${clientPath}"`
  );
  const testModPath = path.join(__dirname, 'chinaToDomestic.testmod.mjs');
  fs.writeFileSync(testModPath, rewritten);
  return 'file://' + testModPath.replace(/\\/g, '/');
}

describe('chinaToDomestic', () => {
  beforeEach(() => {
    resetState();
    globalThis.__chinaToDomesticTestState = state;
  });

  it('converts an approved receipt: increments stock, creates fulfillment orders', async () => {
    const modUrl = writeTestModule();
    const mod = await import(modUrl);
    const req = { method: 'POST', json: async () => ({ receiptId: 7 }) };
    const res = await mod.default(req);
    const body = await res.json();

    assert.equal(body.status, 'converted');
    assert.equal(body.receiptId, 7);
    assert.equal(body.ordersCreated, 2);
  });

  it('increments Product.stock for every line item', async () => {
    const modUrl = writeTestModule();
    const mod = await import(modUrl);
    const req = { method: 'POST', json: async () => ({ receiptId: 7 }) };
    await mod.default(req);

    assert.equal(state.products[0].stock, 13); // 10 + 3
    assert.equal(state.products[1].stock, 5);  // 4 + 1
  });

  it('creates one FulfillmentOrder per receipt line item', async () => {
    const modUrl = writeTestModule();
    const mod = await import(modUrl);
    const req = { method: 'POST', json: async () => ({ receiptId: 7 }) };
    await mod.default(req);

    const { create } = state.calls;
    assert.ok(create.fulfillment && create.fulfillment.length > 0, 'FulfillmentOrder.create was called');
    assert.equal(create.fulfillment[0].product_id, 'p-1');
    assert.equal(create.fulfillment[0].quantity, 3);
    assert.equal(create.fulfillment[0].source_type, 'china-to-domestic');
    assert.equal(create.fulfillment[0].source_receipt_id, 7);
  });

  it('marks the receipt status as converted', async () => {
    const modUrl = writeTestModule();
    const mod = await import(modUrl);
    const req = { method: 'POST', json: async () => ({ receiptId: 7 }) };
    await mod.default(req);

    assert.ok(state.calls.update.receipt);
    assert.equal(state.calls.update.receipt.patch.status, 'converted');
  });

  it('emits an AuditLog entry for the conversion', async () => {
    const modUrl = writeTestModule();
    const mod = await import(modUrl);
    const req = { method: 'POST', json: async () => ({ receiptId: 7 }) };
    await mod.default(req);

    const { audit } = state.calls.create;
    assert.equal(audit.action, 'chinaToDomestic.converted');
    assert.equal(audit.entity, 'ChinaWarehouseReceipt');
    assert.equal(audit.entity_id, 7);
    assert.equal(audit.severity, 'info');
  });

  it('rejects a missing receipt with 404', async () => {
    state.receipt = null;
    globalThis.__chinaToDomesticTestState = state;
    const modUrl = writeTestModule();
    const mod = await import(modUrl);
    const req = { method: 'POST', json: async () => ({ receiptId: 999 }) };
    const res = await mod.default(req);
    assert.equal(res.status, 404);
  });

  it('rejects a non-approved receipt with 409', async () => {
    state.receipt = { ...state.receipt, status: 'pending' };
    globalThis.__chinaToDomesticTestState = state;
    const modUrl = writeTestModule();
    const mod = await import(modUrl);
    const req = { method: 'POST', json: async () => ({ receiptId: 7 }) };
    const res = await mod.default(req);
    assert.equal(res.status, 409);
  });
});