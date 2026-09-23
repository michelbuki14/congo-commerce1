import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Zap, Power } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import { Image } from '@/components/ui/image';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { formatUSD, formatDate } from '@/lib/format';

const EMPTY = { code: '', description: '', type: 'percent', value: 10, min_order_usd: 0, max_discount_usd: 0, usage_limit: 0, expires_at: '' };

export default function AdminPromotions() {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const [c, p] = await Promise.all([
      base44.entities.Coupon.list('-created_date', 100).catch(() => []),
      base44.entities.Product.filter({ status: 'published' }, '-created_date', 60).catch(() => []),
    ]);
    setCoupons(c);
    setProducts(p);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!draft.code) return;
    await base44.entities.Coupon.create({
      ...draft,
      code: draft.code.toUpperCase(),
      active: true,
      expires_at: draft.expires_at || undefined,
    });
    setDraft(EMPTY);
    setShowForm(false);
    setMessage('Code promo créé.');
    await load();
  };

  const toggle = async (c) => {
    const updated = await base44.entities.Coupon.update(c.id, { active: !c.active });
    setCoupons((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
  };

  const remove = async (c) => {
    await base44.entities.Coupon.delete(c.id);
    setCoupons((prev) => prev.filter((x) => x.id !== c.id));
  };

  const toggleFlash = async (p) => {
    const updated = await base44.entities.Product.update(p.id, { is_flash_sale: !p.is_flash_sale });
    setProducts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Promotions & coupons" links={ADMIN_LINKS} />

      {message && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>}

      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm((s) => !s)} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Nouveau code
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-3">
          <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="CODE" required className="h-11 rounded-lg border border-border bg-background px-3 text-sm uppercase" />
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="percent">Pourcentage</option>
            <option value="fixed">Montant fixe</option>
            <option value="free_shipping">Livraison offerte</option>
          </select>
          <input type="number" step="0.01" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} placeholder="Valeur" className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
          <input type="number" step="0.01" value={draft.min_order_usd} onChange={(e) => setDraft({ ...draft, min_order_usd: Number(e.target.value) })} placeholder="Minimum USD" className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
          <input type="number" step="0.01" value={draft.max_discount_usd} onChange={(e) => setDraft({ ...draft, max_discount_usd: Number(e.target.value) })} placeholder="Remise max USD" className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
          <input type="date" value={draft.expires_at} onChange={(e) => setDraft({ ...draft, expires_at: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
          <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" className="h-11 rounded-lg border border-border bg-background px-3 text-sm md:col-span-3" />
          <button type="submit" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground md:col-span-3">Créer le code</button>
        </form>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-bold">Codes promo ({coupons.length})</h2>
        {coupons.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
            <div>
              <p className="text-sm font-bold">{c.code}</p>
              <p className="text-[11px] text-muted-foreground">
                {c.type === 'percent' ? `${c.value}%` : c.type === 'fixed' ? formatUSD(c.value) : 'Livraison offerte'}
                {c.min_order_usd ? ` · min ${formatUSD(c.min_order_usd)}` : ''} · utilisé {c.usage_count || 0} fois
                {c.expires_at ? ` · expire ${formatDate(c.expires_at)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggle(c)}
                className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  c.active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'
                }`}
              >
                <Power className="h-3.5 w-3.5" /> {c.active ? 'Actif' : 'Inactif'}
              </button>
              <button type="button" onClick={() => remove(c)} className="rounded-lg p-2 text-destructive hover:bg-secondary" aria-label="Supprimer">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {!coupons.length && (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">Aucun code promo.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold">Ventes flash</h2>
        <p className="text-[11px] text-muted-foreground">Activez la mise en avant « vente flash » sur les produits concernés.</p>
        <div className="grid gap-2 md:grid-cols-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                <Image src={p.images?.[0]} alt={p.title} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="text-[11px] text-muted-foreground">{formatUSD(p.price_usd)} · {p.seller_name || p.supplier_name}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleFlash(p)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  p.is_flash_sale ? 'bg-amber-100 text-amber-900' : 'bg-secondary'
                }`}
              >
                <Zap className="h-3.5 w-3.5" /> {p.is_flash_sale ? 'Active' : 'Activer'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}