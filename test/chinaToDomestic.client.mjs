// test/chinaToDomestic.client.mjs
// Shared in-memory mock for @base44/sdk used by chinaToDomestic tests.
// Both the test file and the dynamically-imported function module import this
// same file, so they share the globalThis state object.

const ST = globalThis.__chinaToDomesticTestState;

export function createClientFromRequest() {
  return {
    asServiceRole: {
      entities: {
        ChinaWarehouseReceipt: {
          filter: async (q) => {
            ST.calls.filter.receipt = q;
            return ST.receipt && ST.receipt.id === q.id ? [ST.receipt] : [];
          },
          update: async (id, patch) => {
            ST.calls.update.receipt = { id, patch };
            if (ST.receipt && ST.receipt.id === id) Object.assign(ST.receipt, patch);
          },
        },
        Product: {
          filter: async (q) => {
            ST.calls.filter.product = q;
            return ST.products.filter((p) => p.id === q.id).map((p) => ({ ...p }));
          },
          update: async (id, patch) => {
            ST.calls.update.product = { id, patch };
            const p = ST.products.find((x) => x.id === id);
            if (p) p.stock = patch.stock;
          },
        },
        FulfillmentOrder: {
          create: async (body) => {
            if (!ST.calls.create.fulfillment) ST.calls.create.fulfillment = [];
            ST.calls.create.fulfillment.push(body);
            return { ...body, id: 'fo-' + Math.random().toString(36).slice(2, 8) };
          },
        },
        AuditLog: {
          create: async (body) => {
            ST.calls.create.audit = body;
          },
        },
      },
    },
  };
}
