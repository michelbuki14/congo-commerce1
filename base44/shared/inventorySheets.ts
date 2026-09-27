/**
 * Reads a supplier inventory Google Sheet and applies its stock levels to products.
 * Sheet format: a header row containing a "sku" column (matched against the product's
 * supplier reference, then its slug) and a "stock" column (also accepts "quantite"/"qty").
 */

const SKU_HEADERS = ['sku', 'reference', 'référence', 'ref', 'external_product_id', 'slug'];
const STOCK_HEADERS = ['stock', 'quantite', 'quantité', 'qty', 'quantity'];

function findCol(headers, names) {
  return headers.findIndex((h) => names.includes(String(h || '').trim().toLowerCase()));
}

async function loadProducts(base44, supplierId) {
  const query = supplierId ? { supplier_id: supplierId } : {};
  const all = [];
  for (let skip = 0; ; skip += 500) {
    const page = await base44.asServiceRole.entities.Product.filter(query, '-created_date', 500, skip);
    all.push(...page);
    if (page.length < 500) break;
  }
  return all;
}

export async function syncSource(base44, source, accessToken) {
  const range = encodeURIComponent(source.sheet_range || 'A:Z');
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${source.spreadsheet_id}/values/${range}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || `Google Sheets a répondu ${res.status}`);

  const [headers = [], ...rows] = body.values || [];
  const skuCol = findCol(headers, SKU_HEADERS);
  const stockCol = findCol(headers, STOCK_HEADERS);
  if (skuCol < 0 || stockCol < 0) throw new Error('Colonnes « sku » et « stock » introuvables dans la première ligne');

  const products = await loadProducts(base44, source.supplier_id);
  const byRef = new Map();
  for (const p of products) {
    if (p.slug) byRef.set(String(p.slug).toLowerCase(), p);
    if (p.external_product_id) byRef.set(String(p.external_product_id).toLowerCase(), p);
  }

  const updates = [];
  const unmatched = [];
  let counted = 0;
  for (const row of rows) {
    const sku = String(row[skuCol] || '').trim();
    const stock = Number(String(row[stockCol] ?? '').replace(',', '.'));
    if (!sku || !Number.isFinite(stock)) continue;
    counted += 1;
    const product = byRef.get(sku.toLowerCase());
    if (!product) { unmatched.push(sku); continue; }
    const next = Math.max(0, Math.floor(stock));
    if (Number(product.stock || 0) !== next) updates.push({ id: product.id, stock: next });
  }

  for (let i = 0; i < updates.length; i += 500) {
    await base44.asServiceRole.entities.Product.bulkUpdate(updates.slice(i, i + 500));
  }

  return { rows: counted, updated: updates.length, unmatched: unmatched.slice(0, 50) };
}