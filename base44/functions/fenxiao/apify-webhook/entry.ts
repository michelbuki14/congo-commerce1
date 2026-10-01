import { getBase44Client } from '@base44/sdk';
const client = getBase44Client();

export async function ingestApifyResults(payload: { runId: string; datasetId: string; keywords?: any[] }) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN not configured');
  
  const { ApifyClient } = await import('apify-client');
  const api = new ApifyClient({ token });
  
  const { items } = await api.dataset(payload.datasetId).listItems();
  
  const products = [];
  for (const item of items) {
    const product = await client.entities.Product.upsert({
      title: item.title,
      source_url: item.url,
      price: item.price,
      currency: item.currency,
      supplier_name: item.seller,
      rating: item.rating,
      reviews_count: item.reviews,
      source: 'alibaba_apify',
      source_run_id: payload.runId,
      keywords: payload.keywords
    });
    products.push(product);
  }
  
  return { ingested: products.length, runId: payload.runId, datasetId: payload.datasetId };
}

export async function handleWebhook(req: any) {
  const body = req.body || {};
  const eventData = body.eventData || {};
  const resource = body.resource || {};
  
  const runId = eventData.actorRunId || resource.id;
  const datasetId = eventData.defaultDatasetId;
  
  if (!runId || !datasetId) {
    return { success: false, error: 'Missing runId or datasetId', raw: body };
  }
  
  const result = await ingestApifyResults({ runId, datasetId, keywords: [] });
  return { success: true, ...result };
}
