import React, { useEffect, useState } from 'react';
import { Star, BadgeCheck, PackageCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RatingStars from './RatingStars';
import { getProfile, getSessionId } from '@/lib/session';
import { timeAgo } from '@/lib/format';

/** Only an order that actually reached the customer unlocks a review. */
const RECEIVED_STATUSES = ['DELIVERED'];

export default function ProductReviews({ product, onChanged }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [name, setName] = useState(getProfile().name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [entitlement, setEntitlement] = useState({ loading: true, order: null, alreadyReviewed: false });

  const load = async () => {
    const rows = await base44.entities.Review.filter({ product_id: product.id, status: 'published' }, '-created_date', 30);
    setReviews(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // The right to review is read from this device's own orders — never assumed.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const sessionId = getSessionId();
      const [orders, mine] = await Promise.all([
        base44.entities.Order.filter({ session_id: sessionId }, '-created_date', 50).catch(() => []),
        base44.entities.Review.filter({ product_id: product.id, session_id: sessionId }).catch(() => []),
      ]);
      if (cancelled) return;
      const received = orders.find(
        (o) => RECEIVED_STATUSES.includes(o.status) && (o.items || []).some((i) => i.product_id === product.id),
      );
      setEntitlement({ loading: false, order: received || null, alreadyReviewed: mine.length > 0 });
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (saving || !entitlement.order) return;
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
        session_id: getSessionId(),
        order_number: entitlement.order.order_number,
        verified_purchase: true,
      });
      const all = await base44.entities.Review.filter({ product_id: product.id, status: 'published' }, '-created_date', 100);
      const avg = all.length ? Math.round((all.reduce((s, r) => s + (r.rating || 0), 0) / all.length) * 10) / 10 : 0;
      const updated = await base44.entities.Product.update(product.id, { rating: avg, reviews_count: all.length });
      onChanged?.(updated);
      setReviews(all);
      setComment('');
      setOpen(false);
      setEntitlement((prev) => ({ ...prev, alreadyReviewed: true }));
    } catch (err) {
      setError("Impossible d'enregistrer votre avis pour le moment.");
    } finally {
      setSaving(false);
    }
  };

  const canReview = !entitlement.loading && !!entitlement.order && !entitlement.alreadyReviewed;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Avis clients ({reviews.length})</h2>
        {canReview && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-primary">
            {open ? 'Annuler' : 'Écrire un avis'}
          </button>
        )}
      </div>

      {!entitlement.loading && !canReview && (
        <p className="flex items-center gap-1.5 rounded-xl border border-dashed border-border bg-card p-3 text-xs text-muted-foreground">
          <PackageCheck className="h-3.5 w-3.5 shrink-0" />
          {entitlement.alreadyReviewed
            ? 'Vous avez déjà publié un avis sur cet article.'
            : 'Seuls les clients ayant reçu cet article peuvent publier un avis.'}
        </p>
      )}

      {open && canReview && (
        <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">
            Achat vérifié — commande {entitlement.order.order_number}
          </p>
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
                  {r.verified_purchase && r.order_number && <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />}
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
          {canReview ? 'Aucun avis pour cet article. Soyez le premier à donner votre avis.' : 'Aucun avis pour cet article.'}
        </p>
      )}
    </section>
  );
}