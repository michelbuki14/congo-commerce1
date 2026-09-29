import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import DashboardNav from '@/components/DashboardNav';
import StatusBadge from '@/components/StatusBadge';
import { Image } from '@/components/ui/image';
import { formatUSD } from '@/lib/format';
import { readActiveTenantId } from '@/lib/tenancy';
import { emitEvent } from '@/lib/events';

const LINKS = [
  { to: '/seller', label: 'Tableau de bord', end: true },
  { to: '/seller/products', label: 'Produits' },
  { to: '/seller/orders', label: 'Commandes' },
  { to: '/seller/import', label: 'Import fournisseur' },
  { to: '/seller/wallet', label: 'Portefeuille' },
  { to: '/seller/settings', label: 'Boutique' },
];

const EMPTY = {
  title: '',
  description: '',
  price_usd: '',
  compare_at_usd: '',
  stock: '',
  category_id: '',
  images: '',
};

export default function SellerProducts() {
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async (sellerId) => {
    const rows = await base44.entities.Product.filter({ seller_id: sellerId }, '-created_date', 200);
    setProducts(rows);
  };

  useEffect(() => {
    (async () => {
      const cats = await base44.entities.Category.list('sort_order', 40).catch(() => []);
      setCategories(cats);
      if (seller) await load(seller.id);
      setLoading(false);
    })();
  }, [seller]);

  const startCreate = () => {
    setForm({ ...EMPTY, category_id: categories[0]?.id || '' });
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (p) => {
    setForm({
      title: p.title || '',
      description: p.description || '',
      price_usd: String(p.price_usd ?? ''),
      compare_at_usd: String(p.compare_at_usd ?? ''),
      stock: String(p.stock ?? ''),
      category_id: p.category_id || '',
      images: (p.images || []).join(', '),
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!seller || saving) return;
    setSaving(true);
    const category = categories.find((c) => c.id === form.category_id);
    const payload = {
      tenant_id: seller.tenant_id || readActiveTenantId() || '',
      tenant_owner_email: seller.email || '',
      title: form.title,
      description: form.description,
      price_usd: Number(form.price_usd) || 0,
      compare_at_usd: Number(form.compare_at_usd) || 0,
      stock: Number(form.stock) || 0,
      category_id: form.category_id,
      category_name: category?.name || '',
      images: form.images.split(',').map((s) => s.trim()).filter(Boolean),
      seller_id: seller.id,
      seller_name: seller.name,
      source_type: 'local_seller',
      supplier_price: Number(form.price_usd) || 0,
      currency: 'USD',
      origin_country: 'CD',
      estimated_delivery: '2-4 jours',
      status: 'published',
    };
    try {
      if (editingId) {
        await base44.entities.Product.update(editingId, payload);
      } else {
        const created = await base44.entities.Product.create({ ...payload, slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
        base44.analytics.track({ eventName: 'seller_product_published' });
        emitEvent(base44, 'product_published', {
          category: 'catalogue',
          source: 'Product',
          sourceId: created.id,
          reference: created.title,
          tenantId: payload.tenant_id,
          tenantOwnerEmail: payload.tenant_owner_email,
          description: `${seller.name} met en ligne « ${payload.title} » à ${payload.price_usd} USD`,
          payload: { price_usd: payload.price_usd, stock: payload.stock, category: payload.category_name },
        });
      }
      await load(seller.id);
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY);
      await base44.entities.Seller.update(seller.id, { products_count: products.length + (editingId ? 0 : 1) });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p) => {
    const next = p.status === 'published' ? 'archived' : 'published';
    const updated = await base44.entities.Product.update(p.id, { status: next });
    setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    emitEvent(base44, next === 'published' ? 'product_published' : 'product_archived', {
      category: 'catalogue',
      source: 'Product',
      sourceId: p.id,
      reference: p.title,
      tenantId: p.tenant_id || '',
      tenantOwnerEmail: p.tenant_owner_email || '',
      description: `« ${p.title} » ${next === 'published' ? 'remis en ligne' : 'archivé'}`,
      payload: { status: next, price_usd: p.price_usd },
    });
  };

  const remove = async (p) => {
    await base44.entities.Product.delete(p.id);
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  };

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Mes produits" links={LINKS} />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{products.length} produit(s) — {seller?.name || '—'}</p>
        <button type="button" onClick={startCreate} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Nouveau produit
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold">{editingId ? 'Modifier le produit' : 'Créer un produit'}</h2>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Titre du produit"
            required
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Description"
            className="w-full rounded-lg border border-border bg-background p-3 text-sm"
          />
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="number"
              step="0.01"
              value={form.price_usd}
              onChange={(e) => setForm({ ...form, price_usd: e.target.value })}
              placeholder="Prix USD"
              required
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              type="number"
              step="0.01"
              value={form.compare_at_usd}
              onChange={(e) => setForm({ ...form, compare_at_usd: e.target.value })}
              placeholder="Prix barré (optionnel)"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="Stock"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="">Catégorie…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            value={form.images}
            onChange={(e) => setForm({ ...form, images: e.target.value })}
            placeholder="URLs des images, séparées par des virgules"
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                <Image src={p.images?.[0]} alt={p.title} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatUSD(p.price_usd)} · stock {p.stock ?? 0} · {p.sold_count || 0} vendus
                </p>
                <StatusBadge status={p.status} />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => startEdit(p)} className="rounded-lg p-2 hover:bg-secondary" aria-label="Modifier">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => toggleStatus(p)} className="rounded-lg p-2 hover:bg-secondary" aria-label="Publier / archiver">
                  {p.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => remove(p)} className="rounded-lg p-2 text-destructive hover:bg-secondary" aria-label="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {!products.length && (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              Aucun produit. Créez-en un ou importez depuis un fournisseur.
            </p>
          )}
        </div>
      )}
    </div>
  );
}