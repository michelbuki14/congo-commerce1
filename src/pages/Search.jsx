import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ProductGrid from '@/components/ProductGrid';
import EmptyState from '@/components/EmptyState';
import { resolveStorefrontScope, scopeRecords } from '@/lib/tenancy';

const SORT_IDS = ['relevance', 'new', 'sold', 'price_asc', 'price_desc', 'rating'];

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Lightweight typo tolerance: direct hit, prefix hit, or ≥60% character overlap. */
function score(product, term) {
  if (!term) return 1;
  const haystack = normalize(
    [product.title, product.brand, product.category_name, product.seller_name, (product.tags || []).join(' ')].join(' '),
  );
  if (haystack.includes(term)) return 3;
  const words = haystack.split(/\s+/);
  if (words.some((w) => w.startsWith(term) || term.startsWith(w))) return 2;
  const grams = new Set(term.split(''));
  const hit = [...grams].filter((ch) => haystack.includes(ch)).length;
  return grams.size && hit / grams.size >= 0.6 ? 1 : 0;
}

export default function Search() {
  const { t } = useTranslation();
  const SORTS = SORT_IDS.map((id) => ({ id, label: t(`search.sort_${id}`) }));
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(24);
  const [showFilters, setShowFilters] = useState(false);

  const [term, setTerm] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [source, setSource] = useState(params.get('source') || 'all');
  const [sort, setSort] = useState(params.get('sort') || 'relevance');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [inStock, setInStock] = useState(false);

  useEffect(() => {
    (async () => {
      const scope = await resolveStorefrontScope();
      const [p, c] = await Promise.all([
        base44.entities.Product.filter({ status: 'published' }, '-created_date', 200),
        base44.entities.Category.list('sort_order', 40),
      ]);
      setProducts(scopeRecords(p, scope));
      setCategories(c);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setTerm(params.get('q') || '');
    setCategory(params.get('category') || '');
    setSource(params.get('source') || 'all');
    setSort(params.get('sort') || 'relevance');
    setVisible(24);
  }, [params]);

  // The URL carries the category slug; the catalogue stores category ids.
  const categoryId = useMemo(() => {
    if (!category) return '';
    return categories.find((c) => c.slug === category)?.id || category;
  }, [category, categories]);

  const results = useMemo(() => {
    const tx = normalize(term.trim());
    let list = products.map((p) => ({ p, s: score(p, tx) }));
    if (tx) list = list.filter((x) => x.s > 0);
    let out = list.map((x) => x.p);
    if (categoryId) out = out.filter((p) => p.category_id === categoryId);
    if (source === 'local') out = out.filter((p) => p.source_type !== 'international_supplier');
    if (source === 'international') out = out.filter((p) => p.source_type === 'international_supplier');
    if (maxPrice) out = out.filter((p) => Number(p.price_usd) <= Number(maxPrice));
    if (minRating) out = out.filter((p) => Number(p.rating) >= minRating);
    if (inStock) out = out.filter((p) => Number(p.stock) > 0);

    const sorted = [...out];
    if (sort === 'price_asc') sorted.sort((a, b) => a.price_usd - b.price_usd);
    else if (sort === 'price_desc') sorted.sort((a, b) => b.price_usd - a.price_usd);
    else if (sort === 'rating') sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'sold') sorted.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
    else if (sort === 'new') sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    return sorted;
  }, [products, term, categoryId, source, sort, maxPrice, minRating, inStock]);

  const applyTerm = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    setParams(next);
  };

  const clearFilters = () => {
    setCategory('');
    setSource('all');
    setMaxPrice('');
    setMinRating(0);
    setInStock(false);
    const next = new URLSearchParams();
    if (term) next.set('q', term);
    setParams(next);
  };

  const activeFilters = [category, source !== 'all' ? source : '', maxPrice, minRating, inStock].filter(Boolean).length;

  return (
    <div className="space-y-4 pb-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyTerm(term.trim());
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t('search.placeholder')}
            className="h-11 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card"
          aria-label={t('search.filters')}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilters > 0 && (
            <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold leading-4 text-primary-foreground">
              {activeFilters}
            </span>
          )}
        </button>
      </form>

      {showFilters && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t('search.category')}</p>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">{t('search.all')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t('search.maxPrice')}</p>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder={t('search.maxPricePh')}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t('search.minRating')}</p>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value={0}>{t('search.all')}</option>
                <option value={3}>{t('search.rate3')}</option>
                <option value={4}>{t('search.rate4')}</option>
                <option value={4.5}>{t('search.rate45')}</option>
              </select>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t('search.origin')}</p>
            <div className="flex gap-2">
              {[
                { id: 'all', label: t('search.originAll') },
                { id: 'local', label: t('search.originLocal') },
                { id: 'international', label: t('search.originIntl') },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSource(o.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    source === o.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            {t('search.inStockOnly')}
          </label>
          <button type="button" onClick={clearFilters} className="flex items-center gap-1 text-xs font-semibold text-primary">
            <X className="h-3.5 w-3.5" /> {t('search.resetFilters')}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {loading ? t('common.loading') : t('search.resultsCount', { count: results.length })}
          {term ? t('search.resultsForTerm', { term }) : ''}
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-2 text-xs"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      <ProductGrid
        products={results.slice(0, visible)}
        loading={loading}
        skeletonCount={8}
        emptyState={
          <EmptyState
            icon={SearchIcon}
            title={t('search.emptyTitle')}
            description={t('search.emptyDesc')}
            actionTo="/categories"
            actionLabel={t('search.emptyAction')}
          />
        }
      />

      {!loading && results.length > visible && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + 24)}
          className="mx-auto block rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold"
        >
          {t('search.loadMore')}
        </button>
      )}
    </div>
  );
}