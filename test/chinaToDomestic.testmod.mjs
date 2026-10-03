/// Generates domestic orders from Chinese warehouse receipts.
///   * Validates that a receipt exists and is in `approved` status.
///   * For each item in the receipt, creates a local `FulfillmentOrder`
///     and updates the `Product.stock` accordingly.
export const name = 'chinaToDomestic'
export const description = 'Create domestic orders from approved Chinese warehouse receipts'

import { createClientFromRequest } from "file://C:/Users/miche/congo-commerce1/test/chinaToDomestic.client.mjs"

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export default async function (req) {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 })
    const base44 = createClientFromRequest(req)
    const body = await req.json().catch(() => ({}))
    const receiptId = Number(body.receiptId || 0)
    if (!receiptId) return Response.json({ error: 'receiptId is required' }, { status: 400 })

    // Validate the receipt exists and is approved
    const receipts = await base44.asServiceRole.entities.ChinaWarehouseReceipt
      .filter({ id: receiptId })
      .catch(() => [])
    const receipt = receipts[0] || null
    if (!receipt) return Response.json({ error: 'Receipt not found' }, { status: 404 })
    if (receipt.status !== 'approved') return Response.json({ error: 'Receipt not approved', status: receipt.status }, { status: 409 })

    const items = receipt.items || []
    if (!items.length) return Response.json({ error: 'Receipt has no items' }, { status: 400 })

    const tenant = {
      tenant_id: String(receipt.tenant_id || ''),
      tenant_owner_email: String(receipt.tenant_owner_email || ''),
    }
    const createdOrders = []

    for (const item of items) {
      const productId = String(item.product_id || '')
      const qty = Number(item.qty || 0)
      if (!productId || !(qty > 0)) continue

      // Increment domestic stock for this product
      const products = await base44.asServiceRole.entities.Product
        .filter({ id: productId })
        .catch(() => [])
      const product = products[0] || null
      if (!product) continue

      const newStock = (Number(product.stock) || 0) + qty
      await base44.asServiceRole.entities.Product.update(product.id, { stock: newStock })

      // Create a domestic FulfillmentOrder for this line
      const fo = await base44.asServiceRole.entities.FulfillmentOrder.create({
        ...tenant,
        order_id: receipt.order_id || '',
        order_number: receipt.order_number || '',
        product_id: product.id,
        product_name: product.name || '',
        quantity: qty,
        status: 'PENDING',
        source_type: 'china-to-domestic',
        source_receipt_id: receipt.id,
        shipping_usd: round2(Number(item.unit_price_usd) * qty),
        created_by_id: receipt.created_by_id || '',
      })
      createdOrders.push(fo)
    }

    // Mark receipt as converted
    await base44.asServiceRole.entities.ChinaWarehouseReceipt.update(receipt.id, {
      status: 'converted',
      converted_at: new Date().toISOString(),
    })

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'chinaToDomestic.converted',
      actor: 'system',
      entity: 'ChinaWarehouseReceipt',
      entity_id: receipt.id,
      reference: receipt.receipt_number || String(receipt.id),
      severity: 'info',
      details: { receiptId, itemsCount: items.length, ordersCreated: createdOrders.length },
    })

    return Response.json({ status: 'converted', receiptId, ordersCreated: createdOrders.length })
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 })
  }
}
