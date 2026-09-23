import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Plus, Sparkles, MousePointerClick, ShoppingBag, Coins, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { useCurrency } from '@/lib/currency';
import { compactNumber } from '@/lib/format';

export default function CreatorDashboard() {
  const { format } = useCurrency();
  const [creators, setCreators] = useState([]);
  const [creator, setCreator] = useState(null);
  const [contents, setContents] = useState([]);
  const [products, setProducts] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ product_id: '', title: '', caption: '', media_url: '', media_type: 'image' });
  const [saving, setSaving] = useState(false);

  const loadCreator = async (c) => {
    if (!c) return;
    const [ct, cl] = await Promise.all([
      base44.entities.Content.filter({ creator_id: c.id }, '-created_date', 50).catch(() => []),
      base44.entities.AffiliateClick.filter({ creator_id: c.id }, '-created_date', 100).catch(() => []),
    ]);
    setContents(ct);
    setClicks(cl);
  };

  useEffect(() => {
    (async () => {
      const [c, p] = await Promise.all([
        base44.entities.Creator.list('name', 50).catch(() => []),
        base44.entities.Product.filter({ status: 'published' }, '-sold_count', 40).catch(() => []),
      ]);
      setCreators(c);
      setProducts(p);
      const first = c[0] || null;
      setCreator(first);
      if (first) await loadCreator(first);
      setLoading(false);
    })();
  }, []);

  const switchCreator = async (id) => {
    const next = creators.find((c) => c.id === id) || null;
    setCreator(next);
    await loadCreator(next);
  };

  const copyLink = async () => {
    if (!creator) return;
    const url = `${window.location.origin}/?ref=${creator.referral_code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const publish = async (e) => {
    e.preventDefault();
    if (!creator || !draft.title) return;
    setSaving(true);
    try {
      const product = products.find((p) => p.id === draft.product_id);
      await base44.entities.Content.create({
        title: draft.title,
        caption: draft.caption,
        media_type: draft.media_type,
        media_url: draft.media_url || product?.images?.[0] || '',
        thumbnail_url: product?.images?.[0] || draft.media_url,
        creator_id: creator.id,
        creator_name: creator.name,
        creator_handle: creator.handle,
        creator_avatar: creator.avatar_url,
        seller_id: product?.seller_id || '',
        product_id: product?.id || '',
        product_title: product?.title || '',
        product_price_usd: product?.price_usd || 0,
        product_image: product?.images?.[0] || '',
        status: 'published',
      });
      setDraft({ product_id: '', title: '', caption: '', media_url: '', media_type: 'image' });
      setShowForm(false);
      await loadCreator(creator);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  if (!creator) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 font-semibold">Aucun compte créateur</p>
        <p className="mt-1 text-sm text-muted-foreground">Les créateurs sont créés par l'équipe Congo Commerce.</p>
        <Link to="/admin/users" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          Créer un créateur
        </Link>
      </div>
    );
  }

  const conversions = clicks.filter((c) => c.converted);
  const earnings = conversions.reduce((s, c) => s + (c.commission_usd || 0), 0);

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-bold md:text-xl">Espace créateur</h1>
        <select
          value={creator.id}
          onChange={(e) => switchCreator(e.target.value)}
          className="ml-auto h-9 rounded-lg border border-border bg-card px-2 text-sm"
        >
          {creators.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-secondary">
            <Image src={creator.avatar_url} alt={creator.name} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{creator.name} <span className="text-muted-foreground">@{creator.handle}</span></p>
            <p className="text-[11px] text-muted-foreground">{creator.city} · commission {creator.commission_rate}% · {compactNumber(creator.followers_count || 0)} abonnés</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-secondary/60 p-3">
          <span className="text-xs font-semibold">Code : {creator.referral_code}</span>
          <button type="button" onClick={copyLink} className="ml-auto flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-semibold">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Lien copié' : 'Copier mon lien'}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: MousePointerClick, label: 'Clics suivis', value: clicks.length },
          { icon: ShoppingBag, label: 'Conversions', value: conversions.length },
          { icon: Coins, label: 'Commissions', value: format(earnings) },
          { icon: Eye, label: 'Contenus publiés', value: contents.length },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3.5">
            <k.icon className="h-4 w-4 text-primary" />
            <p className="mt-1.5 text-lg font-bold">{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm((s) => !s)} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Nouveau contenu
        </button>
      </div>

      {showForm && (
        <form onSubmit={publish} className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <select value={draft.product_id} onChange={(e) => setDraft({ ...draft, product_id: e.target.value })} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">Article associé (optionnel)…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.title} — {format(p.price_usd)}</option>
            ))}
          </select>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Titre du contenu" required className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          <textarea value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} rows={2} placeholder="Légende" className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
          <input value={draft.media_url} onChange={(e) => setDraft({ ...draft, media_url: e.target.value })} placeholder="URL de la vidéo ou de la photo" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          <button type="submit" disabled={saving} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? 'Publication…' : 'Publier'}
          </button>
        </form>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-bold">Mes contenus</h2>
        <div className="grid gap-2 md:grid-cols-3">
          {contents.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative aspect-video w-full bg-secondary">
                <Image src={c.thumbnail_url || c.media_url} alt={c.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-2.5">
                <p className="line-clamp-1 text-sm font-medium">{c.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {compactNumber(c.likes_count || 0)} j'aime · {compactNumber(c.views_count || 0)} vues · {c.product_title || 'sans article'}
                </p>
              </div>
            </div>
          ))}
          {!contents.length && (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground md:col-span-3">
              Aucun contenu publié. Associez un article à une vidéo pour vendre directement depuis votre contenu.
            </p>
          )}
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground">
        Chaque vente attribuée à votre code génère une commission créditée sur votre portefeuille créateur, libérée après livraison confirmée.
      </p>
    </div>
  );
}