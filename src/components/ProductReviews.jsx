import React, { useEffect, useState } from 'react';
import { Star, BadgeCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RatingStars from './RatingStars';
import { getProfile } from '@/lib/session';
import { timeAgo } from '@/lib/format';

export default function ProductReviews({ product, onChanged }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [name, setName] = useState(getProfile().name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const rows = await base44.entities.Review.filter({ product_id: product.id, status: 'published' }, '-created_date', 30);
    setReviews(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await base44.entities.Review.create({
        product_id: product.id,
        product_title: product.title,
        seller_id: product.seller_id || '',
        customer_name: name || 'Client Congo Commerce',
        rating,
        comment,
        verified_purchase: true,
      });
      const all = await base44.entities.Review.filter({ product_id: product.id, status: 'published' }, '-created_date', 100);
      const avg = all.length ? Math.round((all.reduce((s, r) => s + (r.rating || 0), 0) / all.length) * 10) / 10 : 0;
      const updated = await base44.entities.Product.update(product.id, { rating: avg, reviews_count: all.length });
      onChanged?.(updated);
      setReviews(all);
      setComment('');
      setOpen(false);
    } catch (err) {
      setError("Impossible d'enregistrer votre avis pour le moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Avis clients ({reviews.length})</h2>
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-primary">
          {open ? 'Annuler' : 'Écrire un avis'}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Votre note</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} étoiles`}>
                  <Star className={`h-6 w-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`} />
                </button>
              ))}
            </div>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre nom"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Qualité, taille, délai de livraison…"
            className="w-full rounded-lg border border-border bg-background p-3 text-sm"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? 'Envoi…' : 'Publier mon avis'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : reviews.length ? (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1 text-sm font-semibold">
                  {r.customer_name}
                  {r.verified_purchase && <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />}
                </p>
                <span className="text-[11px] text-muted-foreground">{timeAgo(r.created_date)}</span>
              </div>
              <RatingStars rating={r.rating} />
              {r.comment && <p className="mt-1.5 text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
          Aucun avis pour cet article. Soyez le premier à donner votre avis.
        </p>
      )}
    </section>
  );
}