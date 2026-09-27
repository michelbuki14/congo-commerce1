import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { orderNumber, paymentState, resolveFulfillment } from '../../shared/fulfillments.ts';

/**
 * Payment check used by both branches of the "Unpaid Fulfillment Followup"
 * workflow. A workflow cannot re-read a record after its durable wait, so the
 * state is resolved here each time the follow-up wakes up.
 *
 * `paid`   -> the customer paid: log the analytics event and stop.
 * `closed` -> cancelled or refunded: stop, never nudge a dead order.
 */

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const fulfillmentId = String(body.fulfillment_id || '').trim();
    if (!fulfillmentId) return Response.json({ error: 'fulfillment_id is required' }, { status: 400 });

    const { fulfillment, order } = await resolveFulfillment(base44, fulfillmentId);
    if (!fulfillment) return Response.json({ error: 'FulfillmentOrder not found' }, { status: 404 });

    const state = paymentState(fulfillment, order);

    return Response.json({
      fulfillment_id: fulfillment.id,
      order_number: orderNumber(fulfillment, order),
      paid: state.paid,
      closed: state.closed,
      payment_status: state.payment_status,
      fulfillment_status: state.fulfillment_status,
    });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}