import { getBase44Client } from '@base44/sdk';
const client = getBase44Client();

async function call1688AOP(method: string, url: string, params: any = {}) {
  const appKey = process.env.FENXIAO_APP_KEY;
  const appSecret = process.env.FENXIAO_APP_SECRET;
  if (!appKey || !appSecret) throw new Error('FENXIAO_APP_KEY/SECRET not configured');
  return { method, url, params, appKey };
}

export async function checkKaUser(userLogonId: string, userId: string) {
  try {
    const result = await call1688AOP('GET', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.fenxiao.benefit.checkKaUser',
      params: { userLogonId }
    });
    const isKaUser = result?.data?.isKaUser || false;
    await client.entities.FenxiaoBenefit.update(userId, { is_ka_user: isKaUser });
    return { isKaUser };
  } catch (e) { return { isKaUser: false, error: String(e) }; }
}

export async function checkCreditBenefit(userLogonId: string, userId: string) {
  try {
    const result = await call1688AOP('GET', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.fenxiao.benefit.checkCreditBenefit',
      params: { userLogonId }
    });
    return { creditBenefitStatus: result?.data?.creditBenefitStatus || 'not_applied' };
  } catch (e) { return { creditBenefitStatus: 'not_applied', error: String(e) }; }
}

export async function createCreditBenefit(userLogonId: string, userId: string, benefitType: 'basic' | 'distribution' = 'distribution') {
  try {
    const result = await call1688AOP('POST', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.fenxiao.benefit.createCreditBenefit',
      params: { userLogonId, benefitType }
    });
    await client.entities.FenxiaoBenefit.update(userId, {
      credit_benefit_status: result?.data?.status || 'pending',
      benefit_type: benefitType,
      applied_at: new Date().toISOString()
    });
    return { success: true, status: result?.data?.status };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function getHotCategorys() {
  try {
    const result = await call1688AOP('GET', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.fenxiao.sourcing.getHotCategorys'
    });
    const categories = result?.data?.categories || [];
    for (const cat of categories) {
      await client.entities.FenxiaoSourcingCategory.upsert({
        category_id: cat.id,
        category_name: cat.name,
        parent_category_id: cat.parentId,
        level: cat.level,
        supports_sourcing: true,
        is_active: true
      });
    }
    return { categories };
  } catch (e) { return { categories: [], error: String(e) }; }
}

export async function getTopicCalendarList() {
  try {
    const result = await call1688AOP('GET', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.fenxiao.sourcing.getTopicCalendarList'
    });
    return { topics: result?.data?.topics || [] };
  } catch (e) { return { topics: [], error: String(e) }; }
}

export async function createSourcingRequisition(requisition: any) {
  try {
    const method = requisition.requisition_type === 'topic_sourcing'
      ? 'com.alibaba.fenxiao.fenxiao.sourcing.createTopicRequisition'
      : 'com.alibaba.fenxiao.fenxiao.sourcing.createSourcingRequisition';
    const result = await call1688AOP('POST', 'https://open.1688.com/api/rest', { method, params: requisition });
    await client.entities.SourcingRequisition.create({
      tenant_id: process.env.TENANT_ID,
      tenant_owner_email: process.env.TENANT_OWNER_EMAIL,
      requisition_id: result?.data?.requisitionId,
      requisition_type: requisition.requisition_type,
      category_id: requisition.category_id,
      target_product_id: requisition.target_product_id,
      theme_id: requisition.theme_id,
      requirements: requisition.requirements,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      created_by: 'system'
    });
    return { success: true, requisition_id: result?.data?.requisitionId };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function getSourcingRequisitionList(filters: any) {
  try {
    const result = await call1688AOP('GET', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.fenxiao.sourcing.getSourcingRequisitionList',
      params: filters
    });
    return { requisitions: result?.data?.list || [] };
  } catch (e) { return { requisitions: [], error: String(e) }; }
}

export async function getSourcingResultList(requisitionId: string) {
  try {
    const result = await call1688AOP('GET', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.fenxiao.sourcing.getSourcingResultList',
      params: { requisitionId }
    });
    const results = result?.data?.list || [];
    for (const res of results) {
      await client.entities.SourcingResult.upsert({
        requisition_id: requisitionId,
        result_id: res.id,
        supplier_id: res.supplierId,
        supplier_name: res.supplierName,
        product_id: res.productId,
        product_title: res.productTitle,
        sku_id: res.skuId,
        price_usd: res.price,
        min_order_qty: res.minOrderQty,
        delivery_days: res.deliveryDays,
        supports_dropship: res.supportsDropship
      });
    }
    return { results };
  } catch (e) { return { results: [], error: String(e) }; }
}

export async function createSourcingOperation(operation: any) {
  try {
    const result = await call1688AOP('POST', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.fenxiao.sourcing.createSourcingOperation',
      params: operation
    });
    await client.entities.SourcingOperation.create({
      tenant_id: process.env.TENANT_ID,
      tenant_owner_email: process.env.TENANT_OWNER_EMAIL,
      operation_id: result?.data?.operationId || `op_${Date.now()}`,
      requisition_id: operation.requisition_id,
      result_id: operation.result_id,
      operation_type: operation.operation_type,
      new_supplier_id: operation.new_supplier_id,
      new_sku_id: operation.new_sku_id,
      operation_status: result?.data?.status || 'pending',
      performed_by: 'system',
      performed_at: new Date().toISOString()
    });
    await client.entities.SourcingResult.update(
      { requisition_id: operation.requisition_id, result_id: operation.result_id },
      { selected_for_replacement: true, selected_at: new Date().toISOString() }
    );
    return { success: true, operation_id: result?.data?.operationId };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function createReverseOrder(params: any) {
  try {
    const result = await call1688AOP('POST', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.fenxiao.order.createReverseOrder',
      params
    });
    await client.entities.FenxiaoReverseOrder.create({
      tenant_id: process.env.TENANT_ID,
      tenant_owner_email: process.env.TENANT_OWNER_EMAIL,
      reverse_order_id: result?.data?.reverseOrderId || `rev_${Date.now()}`,
      original_order_id: params.original_order_id,
      downstream_order_no: params.downstream_order_no,
      reverse_type: params.reverse_type,
      reverse_reason: params.reverse_reason,
      item_refund_amount: params.item_refund_amount,
      shipping_refund_amount: params.shipping_refund_amount,
      total_refund_amount: params.item_refund_amount + params.shipping_refund_amount,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      created_by: 'system',
      created_date: new Date().toISOString()
    });
    return { success: true, reverse_order_id: result?.data?.reverseOrderId };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function checkWarehouseOpenStatus(userLogonId: string) {
  try {
    const result = await call1688AOP('GET', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.fenxiao.warehouse.checkWarehouseOpenStatus',
      params: { userLogonId }
    });
    return { isOpened: result?.data?.isOpened || false, status: result?.data?.status };
  } catch (e) { return { isOpened: false, status: 'failed', error: String(e) }; }
}

export async function queryWarehouseList(userLogonId: string) {
  try {
    const result = await call1688AOP('GET', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.fenxiao.warehouse.queryWarehouseList',
      params: { userLogonId }
    });
    const warehouses = result?.data?.warehouses || [];
    for (const w of warehouses) {
      await client.entities.FenxiaoWarehouse.upsert({
        warehouse_id: w.id,
        warehouse_name: w.name,
        warehouse_type: '1688_cloud',
        is_opened: true,
        open_status: 'opened',
        address: w.address,
        city: w.city,
        province: w.province,
        country: w.country,
        created_by: 'system'
      });
    }
    return { warehouses };
  } catch (e) { return { warehouses: [], error: String(e) }; }
}

export async function createWarehouseOrder(params: any) {
  try {
    const result = await call1688AOP('POST', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.fenxiao.warehouse.createOrder',
      params
    });
    await client.entities.FenxiaoWarehouseOrder.create({
      tenant_id: process.env.TENANT_ID,
      tenant_owner_email: process.env.TENANT_OWNER_EMAIL,
      order_id: result?.data?.orderId || `wh_${Date.now()}`,
      warehouse_id: params.warehouse_id,
      original_order_id: params.original_order_id,
      downstream_order_no: params.downstream_order_no,
      items: params.items,
      logistic_company_id: params.logistic_company_id,
      status: 'created',
      created_by: 'system',
      created_date: new Date().toISOString()
    });
    return { success: true, order_id: result?.data?.orderId };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function queryWarehouseOrderDetail(orderId: string) {
  try {
    const result = await call1688AOP('GET', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.fenxiao.warehouse.queryOrderDetail',
      params: { orderId }
    });
    return { order: result?.data };
  } catch (e) { return { order: null, error: String(e) }; }
}

export async function queryLogisticCompanyList() {
  try {
    const result = await call1688AOP('GET', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.logistics.alibaba.logistics.OpQueryLogisticCompanyList'
    });
    return { companies: result?.data?.companies || [] };
  } catch (e) { return { companies: [], error: String(e) }; }
}

export async function checkPayCreditOpenStatus(userLogonId: string) {
  try {
    const result = await call1688AOP('GET', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.paycredit.openStatus.query',
      params: { userLogonId }
    });
    return { hasOpen: result?.data?.hasOpen || false, openUrl: result?.data?.openUrl };
  } catch (e) { return { hasOpen: false, error: String(e) }; }
}

export async function batchFundChargeDecision(applyAmount: number, supplierName: string) {
  try {
    const result = await call1688AOP('POST', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.paycredit.batchFundCharge.decison',
      params: { applyAmount, supplierName }
    });
    return { canProceed: result?.data?.canProceed || false };
  } catch (e) { return { canProceed: false, error: String(e) }; }
}

export async function batchFundChargeApply(params: any) {
  try {
    const result = await call1688AOP('POST', 'https://open.1688.com/api/rest', {
      method: 'com.alibaba.fenxiao.paycredit.batchFundCharge.apply',
      params
    });
    return { applyNo: result?.data?.applyNo, cashierUrl: result?.data?.cashierUrl, success: !!result?.data?.applyNo };
  } catch (e) { return { success: false, error: String(e) }; }
}
