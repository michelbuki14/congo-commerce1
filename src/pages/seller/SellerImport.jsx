import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Upload, Info, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import { searchAllSuppliers } from '@/lib/suppliers';
import { computePriceBreakdown } from '@/lib/pricing';
import { generateProductDescription, suggestProductTags } from '@/lib/ai';
import { loadPlatformConfig } from '@/lib/config';
import DashboardNav from '@/components/DashboardNav';
import { Image } from '@/components/ui/image';
import { formatUSD } from '@/lib/format';



export default function SellerImport() {
  const { t } = useTranslation();
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState({ title: '', description: '', markup_percent: 45, category_id: '' });
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState('');

  useEffect(() => {
    loadPlatformConfig();
    (async () => {
      const [s, c] = await Promise.all([
        base44.entities.Supplier.filter({ enabled: true }).catch(() => []),
        base44.entities.Category.list('sort_order', 40).catch(() => []),
      ]);
      setSuppliers(s);
      setCategories(c);
    })();
  }, []);

  const runSearch = async (e) => {
    e?.preventDefault();
    setSearching(true);
    setDone('');
    try {
      const rows = await searchAllSuppliers(suppliers, query);
      setResults(rows);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (suppliers.length) runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers]);

  const preview = useMemo(() => {
    if (!selected) return null;
    const supplier = suppliers.find((s) => s.id === selected.supplierId);
    return computePriceBreakdown(
      {
        supplier_price: selected.supplierPrice,
        source_type: supplier?.type === 'international' ? 'international_supplier' : 'local_warehouse',
        markup_percent: draft.markup_percent,
      },
    );
  }, [selected, draft.markup_percent, suppliers]);

  const choose = (item) => {
    setSelected(item);
    setDraft({
      title: item.title,
      description: item.description,
      markup_percent: 45,
      category_id: categories.find((c) => c.name.toLowerCase().startsWith(item.category.toLowerCase().slice(0, 4)))?.id || categories[0]?.id || '',
    });
    setDone('');
  };

  const writeDescription = async () => {
    if (!selected) return;
    const text = await generateProductDescription({ title: draft.title, category: selected.category, attributes: selected.attributes, sellerId: seller?.id });
    if (text) setDraft((d) => ({ ...d, description: text }));
  };

  const publish = async () => {
    if (!selected || !seller || publishing) return;
    setPublishing(true);
    try {
      const supplier = suppliers.find((s) => s.id === selected.supplierId);
      const category = categories.find((c) => c.id === draft.category_id);
      const tags = await suggestProductTags({ title: draft.title, description: draft.description, sellerId: seller?.id });
      const product = await base44.entities.Product.create({
        tenant_id: seller.tenant_id || '',
        tenant_owner_email: seller.email || '',
        title: draft.title,
        slug: draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: draft.description,
        category_id: draft.category_id,
        category_name: category?.name || selected.category,
        brand: selected.brand,
        images: selected.images,
        seller_id: seller.id,
        seller_name: seller.name,
        supplier_id: supplier?.id || '',
        supplier_name: supplier?.name || selected.supplierName,
        external_product_id: selected.externalProductId,
        source_type: supplier?.type === 'international' ? 'international_supplier' : 'local_warehouse',
        supplier_price: selected.supplierPrice,
        currency: 'USD',
        markup_percent: Number(draft.markup_percent) || 45,
        price_usd: preview.total,
        stock: selected.stock,
        weight_kg: selected.weightKg,
        dimensions: selected.dimensions,
        origin_country: selected.originCountry,
        shipping_options: selected.shippingOptions,
        estimated_delivery: selected.estimatedDelivery,
        variants: selected.variants,
        attributes: selected.attributes,
        tags: tags.length ? tags : [selected.category.toLowerCase()],
        status: 'published',
      });
      await base44.entities.Supplier.update(supplier.id, {
        products_count: (supplier.products_count || 0) + 1,
        last_sync_at: new Date().toISOString(),
      }).catch(() => {});
      setDone(t('sellerImport.publishedMsg', { title: product.title, price: formatUSD(product.price_usd) }));
      setSelected(null);
    } finally {
      setPublishing(false);
    }
  };

  if (loadingSeller) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('sellerImport.title')} links={[
        { to: '/seller', label: t('sellerImport.navDashboard'), end: true },
        { to: '/seller/products', label: t('sellerImport.navProducts') },
        { to: '/seller/orders', label: t('sellerImport.navOrders') },
        { to: '/seller/import', label: t('sellerImport.navImport') },
        { to: '/seller/wallet', label: t('sellerImport.navWallet') },
        { to: '/seller/settings', label: t('sellerImport.navShop') },
      ]} />

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {t('sellerImport.demoNoteStart')} <strong>{t('sellerImport.demoNoteStrong')}</strong> {t('sellerImport.demoNoteEnd')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {suppliers.map((s) => (
          <span key={s.id} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">
            {s.name} · {s.type === 'international' ? t('sellerImport.intl') : t('sellerImport.warehouse')} {s.is_mock ? t('sellerImport.demoTag') : ''}
          </span>
        ))}
        {!suppliers.length && <p className="text-xs text-muted-foreground">{t('sellerImport.noSuppliers')}</p>}
      </div>

      <form onSubmit={runSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('sellerImport.searchPh')}
            className="h-11 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm"
          />
        </div>
        <button type="submit" className="rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
          {searching ? t('sellerImport.searching') : t('sellerImport.search')}
        </button>
      </form>

      {done && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> {done}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          {results.map((r) => (
            <button
              key={`${r.supplierCode}-${r.externalProductId}`}
              type="button"
              onClick={() => choose(r)}
              className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left ${
                selected?.externalProductId === r.externalProductId ? 'border-primary bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                <Image src={r.images?.[0]} alt={r.title} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t('sellerImport.resultMeta', { supplier: r.supplierName, ref: r.externalProductId, stock: r.stock })}
                </p>
                <p className="text-xs font-bold">{t('sellerImport.supplierCost', { price: formatUSD(r.supplierPrice) })}</p>
              </div>
            </button>
          ))}
          {!results.length && !searching && (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              {t('sellerImport.emptyResults')}
            </p>
          )}
        </div>

        {selected && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold">{t('sellerImport.previewTitle')}</h2>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm"
            />
            <button type="button" onClick={writeDescription} className="text-xs font-semibold text-primary">
              {t('sellerImport.generateDesc')}
            </button>
            <select
              value={draft.category_id}
              onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">{t('sellerImport.categoryPh')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{t('sellerImport.marginLabel', { value: draft.markup_percent })}</label>
              <input
                type="range"
                min="10"
                max="150"
                value={draft.markup_percent}
                onChange={(e) => setDraft({ ...draft, markup_percent: Number(e.target.value) })}
                className="mt-1 w-full accent-[hsl(var(--primary))]"
              />
            </div>

            {preview && (
              <div className="space-y-1 rounded-xl bg-secondary/50 p-3 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('sellerImport.costRow')}</span><span>{formatUSD(preview.supplierPrice)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('sellerImport.intlShipRow')}</span><span>{formatUSD(preview.intlShipping)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('sellerImport.importRow')}</span><span>{formatUSD(preview.importCosts)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('sellerImport.localRow')}</span><span>{formatUSD(preview.logistics)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('sellerImport.marginRow')}</span><span>{formatUSD(preview.margin)}</span></div>
                <div className="flex justify-between border-t border-border pt-1 text-sm font-bold">
                  <span>{t('sellerImport.clientPrice')}</span><span className="text-primary">{formatUSD(preview.total)}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={publish}
              disabled={publishing}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> {publishing ? t('sellerImport.publishing') : t('sellerImport.publish')}
            </button>
            <p className="text-[11px] text-muted-foreground">
              {t('sellerImport.refNote', { ref: selected.externalProductId })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}