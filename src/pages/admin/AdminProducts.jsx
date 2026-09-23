import React, { useEffect, useMemo, useState } from 'react';
import { Search, Eye, EyeOff, Trash2, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import StatusBadge from '@/components/StatusBadge';
import { Image } from '@/components/ui/image';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { formatUSD } from '@/lib/format';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');

  useEffect(() => {
    base44.entities.Product.list('-created_date', 300)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const t = term.trim().toLowerCase();
    return products.filter((p) => {
      if (status !== 'all' && p.status !== status) return false;
      if (source === 'local' && p.source_type === 'international_supplier') return false;
      if (source === 'international' && p.source_type !== 'international_supplier') return false;
      if (t && !`${p.title} ${p.seller_name || ''} ${p.supplier_name || ''}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [products, term, status, source]);

  const setStatusOf = async (p, next) => {
    const updated = await base44.entities.Product.update(p.id, { status: next });
    setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
  };

  const toggleFlash = async (p) => {
    const updated = await base44.entities.Product.update(p.id, { is_flash_sale: !p.is_flash_sale });
    setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
  };

  const remove = async (p) => {
    await base44.entities.Product.delete(p.id);
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  };

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Catalogue produits" links={ADMIN_LINKS} />

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Rechercher un produit, vendeur, fournisseur…"
            className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-xs">
          <option value="all">Tous les statuts</option>
          <option value="published">Publiés</option>
          <option value="draft">Brouillons</option>
          <option value="archived">Archivés</option>
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-xs">
          <option value="all">Toutes provenances</option>
          <option value="local">Local RDC</option>
          <option value="international">International</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                <Image src={p.images?.[0]} alt={p.title} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {p.seller_name || p.supplier_name} · réf. {p.external_product_id || 'local'} · stock {p.stock ?? 0}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs font-bold">{formatUSD(p.price_usd)}</span>
                  <StatusBadge status={p.status} />
                  {p.is_flash_sale && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">Flash</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => toggleFlash(p)} className="rounded-lg p-2 hover:bg-secondary" title="Vente flash">
                  <Zap className={`h-4 w-4 ${p.is_flash_sale ? 'text-amber-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setStatusOf(p, p.status === 'published' ? 'archived' : 'published')}
                  className="rounded-lg p-2 hover:bg-secondary"
                  title="Publier / archiver"
                >
                  {p.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => remove(p)} className="rounded-lg p-2 text-destructive hover:bg-secondary" title="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {!visible.length && (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              Aucun produit ne correspond à ces critères.
            </p>
          )}
        </div>
      )}
    </div>
  );
}