import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  gatewayHealth,
  courierHealth,
  HEALTH_LABELS,
  HEALTH_TONES,
} from '../src/lib/platformHealth.js';

const past = () => new Date(Date.now() - 86400000).toISOString();

describe('gatewayHealth', () => {
  it('returns unknown when no orders', () => {
    const rows = gatewayHealth([], 7);
    assert.deepEqual(rows, []);
  });

  it('marks gateway as ok when 100% success rate', () => {
    const orders = [{ payment_provider: 'mpesa', payment_status: 'PAID', total_usd: 100, created_date: past() }];
    const rows = gatewayHealth(orders, 7);
    assert.equal(rows[0].status, 'ok');
    assert.equal(rows[0].rate, 1);
  });

  it('marks gateway as degraded at 70% success rate', () => {
    const orders = [
      { payment_provider: 'mpesa', payment_status: 'PAID', total_usd: 100, created_date: past() },
      { payment_provider: 'mpesa', payment_status: 'PAID', total_usd: 50, created_date: past() },
      { payment_provider: 'mpesa', payment_status: 'FAILED', total_usd: 30, created_date: past() },
    ];
    const rows = gatewayHealth(orders, 7);
    assert.equal(rows[0].status, 'degraded');
    assert.ok(rows[0].rate >= 0.6 && rows[0].rate < 0.9);
  });

  it('marks gateway as down below 60% success rate', () => {
    const orders = [
      { payment_provider: 'mpesa', payment_status: 'FAILED', total_usd: 100, created_date: past() },
      { payment_provider: 'mpesa', payment_status: 'FAILED', total_usd: 50, created_date: past() },
      { payment_provider: 'mpesa', payment_status: 'PAID', total_usd: 30, created_date: past() },
    ];
    const rows = gatewayHealth(orders, 7);
    assert.equal(rows[0].status, 'down');
  });

  it('counts only recent orders within the lookback window', () => {
    const old = new Date(Date.now() - 10 * 86400000).toISOString();
    const orders = [
      { payment_provider: 'mpesa', payment_status: 'PAID', total_usd: 100, created_date: old },
    ];
    const rows = gatewayHealth(orders, 7);
    assert.equal(rows.length, 0);
  });

  it('uses payment_method fallback when payment_provider is missing', () => {
    const orders = [{ payment_method: 'cash', payment_status: 'PAID', total_usd: 50, created_date: past() }];
    const rows = gatewayHealth(orders, 7);
    assert.equal(rows[0].name, 'cash');
  });
});

describe('courierHealth', () => {
  it('initializes empty couriers with zero stats', () => {
    const rows = courierHealth([], [], 7);
    assert.deepEqual(rows, []);
  });

  it('tracks deliveries, declined and open counts', () => {
    const couriers = [{ name: 'TestCourier', active: true }];
    const shipments = [
      { courier_name: 'TestCourier', status: 'DELIVERED', created_date: past() },
      { courier_name: 'TestCourier', status: 'IN_TRANSIT', created_date: past() },
      { courier_name: 'TestCourier', status: 'DECLINED', courier_response: 'declined', created_date: past() },
    ];
    const rows = courierHealth(couriers, shipments, 7);
    const r = rows.find((x) => x.name === 'TestCourier');
    assert.equal(r.total, 3);
    assert.equal(r.delivered, 1);
    assert.equal(r.declined, 1);
    // Both IN_TRANSIT and DECLINED are not in CLOSED_SHIPMENT, so they count as open
    assert.equal(r.openCount, 2);
  });
});

describe('HEALTH_LABELS and HEALTH_TONES', () => {
  it('has entries for each band', () => {
    assert.ok(HEALTH_LABELS.ok);
    assert.ok(HEALTH_TONES.ok);
    assert.ok(HEALTH_LABELS.down);
    assert.equal(HEALTH_TONES.down, 'bad');
  });
});