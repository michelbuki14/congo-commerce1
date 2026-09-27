/**
 * CSV import helper for the bulk product tool.
 * Small, dependency-free parser: quotes, embedded commas and CRLF are handled.
 */
export const PRODUCT_CSV_COLUMNS = [
  { key: 'title', required: true, hint: 'Titre du produit (obligatoire)' },
  { key: 'price_usd', required: true, hint: 'Prix de vente en USD (obligatoire)' },
  { key: 'description', hint: 'Description libre' },
  { key: 'category', hint: 'Nom exact de la catégorie de la plateforme' },
  { key: 'brand', hint: 'Marque' },
  { key: 'stock', hint: 'Quantité disponible' },
  { key: 'weight_kg', hint: 'Poids en kilos' },
  { key: 'dimensions', hint: 'L x l x H en cm, ex : 30x20x10' },
  { key: 'images', hint: 'URLs séparées par ;' },
  { key: 'tags', hint: 'Mots-clés séparés par ;' },
  { key: 'compare_at_usd', hint: 'Prix barré éventuel' },
  { key: 'status', hint: 'draft ou published' },
];

const EXAMPLE_ROWS = [
  [
    'Sac à main en raphia',
    '24.9',
    'Sac tissé main, doublure coton, anses renforcées.',
    'Femme',
    'Atelier Kin',
    '12',
    '0.6',
    '30x20x10',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800',
    'raphia;fait main;accessoire',
    '32',
    'draft',
  ],
  [
    'Écouteurs sans fil Pro',
    '18.5',
    'Boîtier de charge, réduction de bruit, autonomie 24 h.',
    'Électronique',
    'Sonic',
    '40',
    '0.2',
    '10x8x4',
    '',
    'audio;bluetooth',
    '',
    'published',
  ],
];

export function buildProductTemplate() {
  const header = PRODUCT_CSV_COLUMNS.map((c) => c.key).join(',');
  const rows = EXAMPLE_ROWS.map((row) => row.map(csvCell).join(','));
  return [header, ...rows].join('\n');
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCsv(text) {
  const clean = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!clean) return { headers: [], rows: [], error: 'Le fichier est vide.' };

  const grid = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      grid.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  row.push(field);
  grid.push(row);

  const headers = (grid.shift() || []).map((h) => h.trim().toLowerCase());
  if (!headers.length) return { headers: [], rows: [], error: 'Aucune colonne détectée.' };

  const rows = grid
    .filter((cells) => cells.some((c) => String(c).trim()))
    .map((cells, index) => {
      const record = {};
      headers.forEach((header, i) => { record[header] = String(cells[i] ?? '').trim(); });
      record.__line = index + 2;
      return record;
    });

  return { headers, rows, error: '' };
}

function splitList(value) {
  return String(value || '').split(/[;|]/).map((s) => s.trim()).filter(Boolean);
}

function slugify(title, fallback) {
  const slug = String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || fallback;
}

export function mapRowsToProducts(rows = [], { categories = [], seller, defaultStatus = 'draft' } = {}) {
  const issues = [];
  const products = [];
  const usedSlugs = new Set();

  rows.forEach((row) => {
    const title = (row.title || row.titre || '').trim();
    const rawPrice = String(row.price_usd || row.prix_usd || row.price || '').replace(',', '.');
    const price = Number(rawPrice);
    const problems = [];
    if (!title) problems.push('titre manquant');
    if (!price || price <= 0) problems.push('prix invalide');
    if (problems.length) {
      issues.push({ line: row.__line, title: title || '—', message: problems.join(', ') });
      return;
    }

    const categoryName = (row.category || row.categorie || '').trim();
    const category =
      categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase()) ||
      categories.find((c) => categoryName && c.name.toLowerCase().startsWith(categoryName.toLowerCase().slice(0, 4)));

    const base = slugify(title, `produit-${row.__line}`);
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) { slug = `${base}-${n}`; n += 1; }
    usedSlugs.add(slug);

    const images = splitList(row.images || row.image);
    const tags = splitList(row.tags);
    const requested = String(row.status || '').toLowerCase();

    products.push({
      tenant_id: seller?.tenant_id || '',
      tenant_owner_email: seller?.email || '',
      title,
      slug,
      description: (row.description || '').trim(),
      category_id: category?.id || '',
      category_name: category?.name || categoryName,
      brand: (row.brand || '').trim(),
      images,
      seller_id: seller?.id || '',
      seller_name: seller?.name || '',
      source_type: 'local_seller',
      currency: 'USD',
      price_usd: price,
      compare_at_usd: Number(row.compare_at_usd) || 0,
      stock: Number(row.stock) || 0,
      weight_kg: Number(row.weight_kg) || 0,
      dimensions: (row.dimensions || '').trim(),
      origin_country: 'CD',
      tags: tags.length ? tags : [categoryName.toLowerCase()].filter(Boolean),
      status: requested === 'published' ? 'published' : defaultStatus,
    });

    if (categoryName && !category) {
      issues.push({ line: row.__line, title, message: `catégorie « ${categoryName} » inconnue — produit importé sans rayon` });
    }
  });

  return { products, issues };
}