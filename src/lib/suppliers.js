import { round2 } from './format';

/**
 * SUPPLIER CONNECTOR ARCHITECTURE
 *
 * Every external supplier implements the same SupplierProvider contract, so the
 * commerce engine never contains supplier-specific logic:
 *
 *   searchProducts(query) -> NormalizedProduct[]
 *   getProduct(id)        -> NormalizedProduct
 *   getInventory(id)      -> { stock, variants }
 *   getVariants(id)       -> variant[]
 *   calculateShipping({ productId, quantity, country }) -> ShippingQuote
 *   createOrder({ externalProductId, quantity, shipping }) -> SupplierOrderResult
 *   cancelOrder(id)       -> void
 *   getTracking(id)       -> TrackingInformation
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MOCK ADAPTERS — clearly isolated, labelled `isMock: true`, and never used by
 * the core order flow until an admin publishes an imported product.
 * Replace a mock with a real HTTP adapter without touching anything else.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MOCK_CATALOG = {
  mock_supplier_a: [
    { id: 'A-1001', title: 'Robe longue satinée', category: 'Women', price: 8.4, stock: 240, weight: 0.45, image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=700&q=70' },
    { id: 'A-1002', title: 'Ensemble deux pièces', category: 'Women', price: 11.2, stock: 120, weight: 0.6, image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&q=70' },
    { id: 'A-1003', title: 'Sac à main cuir PU', category: 'Bags', price: 9.9, stock: 300, weight: 0.8, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700&q=70' },
    { id: 'A-1004', title: 'Montre connectée', category: 'Electronics', price: 14.5, stock: 90, weight: 0.25, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&q=70' },
    { id: 'A-1005', title: 'Écouteurs sans fil', category: 'Electronics', price: 7.8, stock: 410, weight: 0.15, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&q=70' },
    { id: 'A-1006', title: 'Baskets urbaines', category: 'Shoes', price: 12.6, stock: 180, weight: 0.9, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&q=70' },
  ],
  mock_supplier_b: [
    { id: 'B-2201', title: 'Palette maquillage 12 teintes', category: 'Beauty', price: 5.2, stock: 520, weight: 0.3, image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=700&q=70' },
    { id: 'B-2202', title: 'Sérum éclat vitamine C', category: 'Beauty', price: 4.1, stock: 610, weight: 0.2, image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=700&q=70' },
    { id: 'B-2203', title: 'Lampe décorative LED', category: 'Home', price: 6.7, stock: 210, weight: 1.1, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=700&q=70' },
    { id: 'B-2204', title: 'Coussin velours (lot de 2)', category: 'Home', price: 5.9, stock: 340, weight: 0.7, image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&q=70' },
    { id: 'B-2205', title: 'Ceinture réversible', category: 'Accessories', price: 3.4, stock: 700, weight: 0.25, image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=700&q=70' },
    { id: 'B-2206', title: 'Sac à dos scolaire', category: 'Kids', price: 6.1, stock: 260, weight: 0.65, image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=700&q=70' },
  ],
};

const DEFAULT_VARIANTS = {
  Women: [{ name: 'Taille', options: ['S', 'M', 'L', 'XL'] }],
  Men: [{ name: 'Taille', options: ['M', 'L', 'XL', 'XXL'] }],
  Shoes: [{ name: 'Pointure', options: ['38', '39', '40', '41', '42', '43'] }],
  Bags: [{ name: 'Couleur', options: ['Noir', 'Marron', 'Beige'] }],
  Beauty: [{ name: 'Format', options: ['Standard'] }],
  Home: [{ name: 'Couleur', options: ['Beige', 'Gris', 'Terracotta'] }],
  Electronics: [{ name: 'Couleur', options: ['Noir', 'Blanc'] }],
  Accessories: [{ name: 'Couleur', options: ['Noir', 'Marron'] }],
  Kids: [{ name: 'Taille', options: ['4-5 ans', '6-7 ans', '8-9 ans'] }],
};

function normalize(adapterCode, supplier, raw) {
  const shippingBase = supplier.shipping_base_usd ?? 9;
  const importPercent = supplier.import_cost_percent ?? 7;
  return {
    supplierId: supplier.id,
    supplierCode: adapterCode,
    supplierName: supplier.name,
    externalProductId: raw.id,
    title: raw.title,
    description: `${raw.title} — sélection ${raw.category.toLowerCase()} importée de ${supplier.name}. Contrôle qualité avant expédition, emballage renforcé pour le transport international.`,
    category: raw.category,
    brand: raw.brand || supplier.name,
    images: [raw.image],
    videos: [],
    variants: DEFAULT_VARIANTS[raw.category] || [{ name: 'Format', options: ['Standard'] }],
    attributes: { Matière: 'Voir fiche fournisseur', Origine: supplier.country },
    supplierPrice: raw.price,
    currency: 'USD',
    stock: raw.stock,
    weightKg: raw.weight,
    dimensions: '30 x 20 x 10 cm',
    originCountry: supplier.country,
    shippingOptions: [
      { method: 'standard', label: 'Standard international', price: shippingBase, eta: `${supplier.avg_shipping_days ?? 18} jours` },
      { method: 'express', label: 'Express', price: round2(shippingBase * 2.4), eta: `${Math.max(5, Math.round((supplier.avg_shipping_days ?? 18) / 3))} jours` },
    ],
    estimatedDelivery: `${supplier.avg_shipping_days ?? 18} jours`,
    importCostPercent: importPercent,
    status: 'active',
  };
}

function createMockProvider(adapterCode) {
  return {
    adapterCode,
    isMock: true,
    async searchProducts(query, supplier) {
      const catalog = MOCK_CATALOG[adapterCode] || [];
      const q = String(query || '').toLowerCase().trim();
      const rows = q ? catalog.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) : catalog;
      return rows.map((raw) => normalize(adapterCode, supplier, raw));
    },
    async getProduct(externalId, supplier) {
      const raw = (MOCK_CATALOG[adapterCode] || []).find((p) => p.id === externalId);
      if (!raw) throw new Error(`Produit ${externalId} introuvable chez ${supplier.name}`);
      return normalize(adapterCode, supplier, raw);
    },
    async getInventory(externalId) {
      const raw = (MOCK_CATALOG[adapterCode] || []).find((p) => p.id === externalId);
      return { stock: raw?.stock ?? 0 };
    },
    async getVariants(externalId, supplier) {
      const p = await this.getProduct(externalId, supplier);
      return p.variants;
    },
    async calculateShipping({ externalProductId, quantity = 1, supplier }) {
      const p = await this.getProduct(externalProductId, supplier);
      const weight = (p.weightKg || 0.5) * quantity;
      const option = p.shippingOptions[0];
      return { provider: supplier.name, fee: round2(option.price + weight * 1.2), eta: option.eta, method: option.method };
    },
    async createOrder({ externalProductId, quantity, supplier }) {
      return {
        supplierOrderId: `SO-${adapterCode.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
        status: 'CONFIRMED',
        externalProductId,
        quantity,
        supplierName: supplier.name,
        placedAt: new Date().toISOString(),
      };
    },
    async cancelOrder(supplierOrderId) {
      return { status: 'CANCELLED', supplierOrderId };
    },
    async getTracking(supplierOrderId) {
      return {
        supplierOrderId,
        status: 'IN_TRANSIT',
        events: [
          { status: 'CONFIRMED', label: 'Commande acceptée par le fournisseur', at: new Date(Date.now() - 36e5 * 48).toISOString() },
          { status: 'IN_TRANSIT', label: 'Colis en transit international', at: new Date(Date.now() - 36e5 * 12).toISOString() },
        ],
      };
    },
  };
}

/** Registry — new suppliers are registered here, never inside the order engine. */
export const SUPPLIER_REGISTRY = {
  mock_supplier_a: createMockProvider('mock_supplier_a'),
  mock_supplier_b: createMockProvider('mock_supplier_b'),
};

export function getSupplierAdapter(adapterCode) {
  const adapter = SUPPLIER_REGISTRY[adapterCode];
  if (!adapter) throw new Error(`Aucun adaptateur fournisseur pour « ${adapterCode} ».`);
  return adapter;
}

export function registerSupplierAdapter(code, adapter) {
  SUPPLIER_REGISTRY[code] = adapter;
}

/** Search every enabled supplier in parallel and return normalized results. */
export async function searchAllSuppliers(suppliers, query) {
  const enabled = suppliers.filter((s) => s.enabled !== false && SUPPLIER_REGISTRY[s.adapter]);
  const results = await Promise.all(
    enabled.map(async (supplier) => {
      try {
        const adapter = getSupplierAdapter(supplier.adapter);
        return await adapter.searchProducts(query, supplier);
      } catch {
        return [];
      }
    }),
  );
  return results.flat();
}