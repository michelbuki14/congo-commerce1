import test from 'node:test';
import assert from 'node:assert/strict';
import { startWorkflow, resumeExecution } from './workflow.ts';
import { COMMERCE_WORKFLOWS } from './workflowsCommerce.ts';

// Isolated storage: these tests never connect to Base44 or payment providers.
function memoryClient(role = 'admin') {
  const tables = {};
  const writes = [];
  let seq = 0;
  const clone = (value) => structuredClone(value);
  const entities = new Proxy({}, { get: (_, name) => {
    const rows = tables[name] ||= [];
    return {
      filter: async (query) => clone(rows.filter(r => Object.entries(query).every(([k, v]) => r[k] === v))),
      list: async () => clone(rows),
      get: async id => clone(rows.find(r => r.id === id) || null),
      create: async data => { const row = { ...clone(data), id: `test-${++seq}`, created_date: new Date().toISOString() }; rows.push(row); writes.push([name, 'create']); return clone(row); },
      update: async (id, data) => { const row = rows.find(r => r.id === id); assert.ok(row, `${name}:${id}`); Object.assign(row, clone(data)); writes.push([name, 'update']); return clone(row); },
    };
  } });
  return { auth: { me: async () => role ? { role, email: 'admin@example.test' } : null }, asServiceRole: { entities }, tables, writes };
}

for (const code of ['product_publication', 'return_refund', 'creator_commission']) {
  for (const role of ['user', null]) {
    test(`${code}: rejects ${role || 'anonymous'} before writes`, async () => {
      const client = memoryClient(role);
      await assert.rejects(startWorkflow(client, { code, input: { product_id: 'another-product', return_id: 'another-return', decision: 'approve' } }), e => e.status === (role ? 403 : 401));
      assert.equal(client.writes.length, 0);
    });
  }
  test(`${code}: rejects malformed administrator decisions before writes`, async () => {
    const client = memoryClient();
    await assert.rejects(startWorkflow(client, { code, input: { decision: 'yes' } }), e => e.status === 400);
    assert.equal(client.writes.length, 0);
  });
}

test('commission attribution ignores caller-selected creator and referral', async () => {
  const client = memoryClient();
  await client.asServiceRole.entities.Order.create({ order_number: 'ATTRIBUTION', creator_id: 'stored-creator' });
  await client.asServiceRole.entities.Creator.create({ id: 'ignored' });
  client.tables.Creator = client.tables.Creator || [];
  client.tables.Creator[0].id = 'stored-creator';
  await client.asServiceRole.entities.FulfillmentOrder.create({ order_number: 'ATTRIBUTION', payout_released: true });
  const ctx = { base44: client, data: {}, input: { order_number: 'ATTRIBUTION', creator_id: 'attacker', affiliate_code: 'ATTACKER' } };
  const definition = COMMERCE_WORKFLOWS.find(d => d.code === 'creator_commission');
  await definition.steps[0].run(ctx);
  assert.equal(ctx.data.creator.id, 'stored-creator');
});

test('commission cannot proceed without released payout', async () => {
  const client = memoryClient();
  await client.asServiceRole.entities.Order.create({ order_number: 'UNRELEASED', creator_id: 'any' });
  const ctx = { base44: client, data: {}, input: { order_number: 'UNRELEASED' } };
  const result = await COMMERCE_WORKFLOWS.find(d => d.code === 'creator_commission').steps[0].run(ctx);
  assert.equal(result.skipped, true);
  assert.equal(ctx.data.creator, undefined);
});

async function waitingReturn() {
  const client = memoryClient();
  await client.asServiceRole.entities.Order.create({ order_number: 'RETURN-TEST', total_usd: 20, customer_phone: 'fixture-only', items: [] });
  const row = await client.asServiceRole.entities.Return.create({ order_number: 'RETURN-TEST', return_number: 'TEST-RETURN', status: 'requested', refund_amount_usd: 20 });
  const run = await startWorkflow(client, { code: 'return_refund', input: { return_id: row.id, reference: 'RETURN-TEST' } });
  assert.equal(run.status, 'WAITING');
  return { client, row, run };
}

test('resuming without a decision stays waiting without financial writes', async () => {
  const { client, run } = await waitingReturn();
  const result = await resumeExecution(client, run.execution_id);
  assert.equal(result.status, 'WAITING');
  assert.equal((client.tables.WalletTransaction || []).length, 0);
  assert.equal(client.tables.Return[0].status, 'requested');
});

test('legacy completed-but-waiting step cannot skip approval', async () => {
  const { client, run } = await waitingReturn();
  const step = client.tables.WorkflowStep.find(s => s.name === 'decide_return');
  step.status = 'COMPLETED';
  const result = await resumeExecution(client, run.execution_id);
  assert.equal(result.status, 'WAITING');
  assert.equal((client.tables.WalletTransaction || []).length, 0);
});

test('administrator rejection persists without paying a refund', async () => {
  const { client, run } = await waitingReturn();
  const result = await resumeExecution(client, run.execution_id, { inputPatch: { decision: 'reject' } });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(client.tables.Return[0].status, 'rejected');
  assert.equal((client.tables.WalletTransaction || []).length, 0);
});

test('administrator approval pays once and a completed run cannot resume', async () => {
  const { client, run } = await waitingReturn();
  const result = await resumeExecution(client, run.execution_id, { inputPatch: { decision: 'approve' } });
  assert.equal(result.status, 'COMPLETED');
  assert.equal(client.tables.Return[0].status, 'refunded');
  assert.equal(client.tables.WalletTransaction.length, 1);
  assert.equal(client.tables.WalletTransaction[0].amount_usd, 20);
  const repeat = await resumeExecution(client, run.execution_id, { inputPatch: { decision: 'approve' } });
  assert.equal(repeat.ok, false);
  assert.equal(client.tables.WalletTransaction.length, 1);
});

test('non-admin cannot resume a financial approval', async () => {
  const { client, run } = await waitingReturn();
  client.auth.me = async () => ({ role: 'user' });
  const before = client.writes.length;
  await assert.rejects(resumeExecution(client, run.execution_id, { inputPatch: { decision: 'approve' } }), e => e.status === 403);
  assert.equal(client.writes.length, before);
});