import React, { memo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Plus, Sparkles, MousePointerClick, ShoppingBag, Coins, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { useCurrency } from '@/lib/currency';
import { useTenantScope } from '@/lib/tenant';
import { compactNumber } from '@/lib/format';
import { useTranslation } from 'react-i18next';
import DashboardShell from '@/components/DashboardShell';

export default memo(function CreatorDashboard() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { tenants: creators, tenant: creator, isAdmin, loading: loadingCreator, selectTenant } = useTenantScope('Creator');
  const [contents, setContents] = useState([]);
  const [products, setProducts] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ product_id: '', title: '', caption: '', media_url: '', media_type: 'image' });
  const [saving, setSaving] = useState(false);

  const loadCreator = async (c) => {
    if (!c) return;
    try {
      const [ct, cl] = await Promise.all([
        base44.entities.Content.filter({ creator_id: c.id }, '-created_date', 50),
        base44.entities.AffiliateClick.filter({ creator_id: c.id }, '-created_date', 100),
      ]);
      setContents(ct);
      setClicks(cl);
    } catch {
      setError(t('creatorDashboard.loadFailed', 'Impossible de charger les données.'));
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await base44.entities.Product.filter({ status: 'published' }, '-sold_count', 40);
        if (alive) setProducts(p);
      } catch {
        if (alive) setError(t('creatorDashboard.loadFailed', 'Impossible de charger les données.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (creator) loadCreator(creator);
  }, [creator]);

  const switchCreator = (id) => selectTenant(id);

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

  if (loading || loadingCreator) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive bg-card p-6 text-center">
        <p className="text-sm font-semibold text-destructive">{error}</p>
        <button type="button" onClick={() => { setError(''); setLoading(true); }} className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {t('common.retry', 'Réessayer')}
        </button>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 font-semibold">{t('creatorDashboard.noCreatorAccount')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('creatorDashboard.noCreatorDesc')}</p>
        {isAdmin && (
          <Link to="/admin/users" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
            {t('creatorDashboard.createCreator')}
          </Link>
        )}
      </div>
    );
  }

  const conversions = clicks.filter((c) => c.converted);
  const earnings = conversions.reduce((s, c) => s + (c.commission_usd || 0), 0);

  return (
    <DashboardShell nav={[]} title={t('creatorDashboard.title')}>
      <>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <select
              value={creator.id}
              onChange={(e) => switchCreator(e.target.value)}
              className="ml-auto h-9 rounded-lg border border-border bg-card px-2 text-sm"
            >
              {creators.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <span className="ml-auto text-sm font-semibold">{creator.name}</span>
          )}
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
            <span className="text-xs font-semibold">{t('creatorDashboard.codeLabel')} {creator.referral_code}</span>
            <button type="button" onClick={copyLink} className="ml-auto flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-semibold">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? t('creatorDashboard.linkCopied') : t('creatorDashboard.copyLink')}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: MousePointerClick, label: t('creatorDashboard.trackedClicks'), value: clicks.length },
            { icon: ShoppingBag, label: t('creatorDashboard.conversions'), value: conversions.length },
            { icon: Coins, label: t('creatorDashboard.commissions'), value: format(earnings) },
            { icon: Eye, label: t('creatorDashboard.publishedContents'), value: contents.length },
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
            <Plus className="h-3.5 w-3.5" /> {t('creatorDashboard.newContent')}
          </button>
        </div>

        {showForm && (
          <form onSubmit={publish} className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <select value={draft.product_id} onChange={(e) => setDraft({ ...draft, product_id: e.target.value })} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">{t('creatorDashboard.optionalProduct')}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.title} — {format(p.price_usd)}</option>
              ))}
            </select>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={t('creatorDashboard.contentTitle')} required className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />
            <textarea value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} rows={2} placeholder={t('creatorDashboard.caption')} className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
            <input value={draft.media_url} onChange={(e) => setDraft({ ...draft, media_url: e.target.value })} placeholder={t('creatorDashboard.mediaUrl')} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />
            <button type="submit" disabled={saving} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {saving ? t('creatorDashboard.publishing') : t('creatorDashboard.publish')}
            </button>
          </form>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-bold">{t('creatorDashboard.myContents')}</h2>
          <div className="grid gap-2 md:grid-cols-3">
            {contents.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="relative aspect-video w-full bg-secondary">
                  <Image src={c.thumbnail_url || c.media_url} alt={c.title} className="h-full w-full object-cover" />
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-1 text-sm font-medium">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {compactNumber(c.likes_count || 0)} {t('creatorDashboard.likes')} · {compactNumber(c.views_count || 0)} {t('creatorDashboard.views')} · {c.product_title || t('creatorDashboard.noProduct')}
                  </p>
                </div>
              </div>
            ))}
            {!contents.length && (
              <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground md:col-span-3">
                {t('creatorDashboard.noContent')}
              </p>
            )}
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground">{t('creatorDashboard.commissionInfo')}</p>
      </>
    </DashboardShell>
  );
});