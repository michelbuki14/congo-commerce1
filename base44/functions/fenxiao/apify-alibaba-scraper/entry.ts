import { getBase44Client } from '@base44/sdk';
const client = getBase44Client();

export async function scrapeAlibabaProducts(keywords: string[], maxResults = 100) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error('APIFY_API_TOKEN not configured');
  }

  const ApifyClient = (await import('apify-client')).ApifyClient;
  const apiClient = new ApifyClient({ token });

  const input = { keywords, maxResults };
  const run = await apiClient.actor('zen-studio/alibaba-scraper').call(input);
  
  const { items } = await apiClient.dataset(run.defaultDatasetId).listItems();
  
  const products = items.map(item => ({
    title: item.title,
    price: item.price,
    currency: item.currency,
    url: item.url,
    seller: item.seller,
    rating: item.rating,
    reviews: item.reviews
  }));

  for (const p of products) {
    await client.entities.Product.upsert({
      title: p.title,
      source_url: p.url,
      price: p.price,
      currency: p.currency,
      supplier_name: p.seller,
      rating: p.rating,
      reviews_count: p.reviews
    });
  }

  return { runId: run.id, datasetId: run.defaultDatasetId, products };
}
