import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity } from 'lucide-react';
import FeedItem from '@/components/feed/FeedItem';

const TABS = [['all', 'Tout'], ['purchase', 'Achats'], ['review', 'Avis'], ['trending', 'Tendances']];

// Privacy: only a first name + initial is ever shown, and purchases are only
// listed for customers who opted in to marketing at checkout.
const anon = (name) => {
  const [first = 'Un client', last = ''] = String(name || '').trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first;
};
const ago = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export default function ActivityFeed() {
  const [items, setItems] = useState(null);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    Promise.all([
      base44.entities.Order.filter({ consent_marketing: true, is_demo: false }, '-created_date', 20),
      base44.entities.Review.filter({ status: 'published' }, '-created_date', 20),
      base44.entities.Product.filter({ status: 'published' }, '-sold_count', 8),
    ]).then(([orders, reviews, products]) => {
      const purchases = orders.filter((o) => o.items?.length).map((o) => ({
        id: `o${o.id}`, type: 'purchase', date: o.created_date,
        text: `${anon(o.customer_name)}${o.city ? ` à ${o.city}` : ''} a acheté ${o.items[0].title || 'un article'}${o.items.length > 1 ? ` et ${o.items.length - 1} autre(s)` : ''}`,
        meta: ago(o.created_date), link: o.items[0].slug ? `/product/${o.items[0].slug}` : null,
      }));
      const revs = reviews.map((r) => ({
        id: `r${r.id}`, type: 'review', date: r.created_date,
        text: `${anon(r.customer_name)} a donné ${r.rating}/5 à ${r.product_title || 'un produit'}`,
        quote: r.comment, meta: `${ago(r.created_date)}${r.verified_purchase ? ' · Achat vérifié' : ''}`,
      }));
      const trend = products.map((p) => ({
        id: `p${p.id}`, type: 'trending', date: p.updated_date,
        text: `${p.title} est tendance`, meta: `${p.sold_count || 0} vendus · ${p.price_usd} $`, link: `/product/${p.slug}`,
      }));
      setItems([...purchases, ...revs].sort((a, b) => new Date(b.date) - new Date(a.date)).concat(trend));
    });
  }, []);

  const shown = (items || []).filter((i) => tab === 'all' || i.type === tab);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-5 pb-24">
      <h1 className="flex items-center gap-2 text-lg font-bold"><Activity className="h-5 w-5" /> Activité de la communauté</h1>
      <div className="flex gap-2 overflow-x-auto">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${tab === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>{l}</button>
        ))}
      </div>
      {!items ? <div className="h-60 animate-pulse rounded-2xl bg-secondary" /> : shown.length === 0 ? (
        <p className="text-xs text-muted-foreground">Rien à afficher pour l'instant.</p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {shown.map((i) => <FeedItem key={i.id} item={i} />)}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">Seuls un prénom et une initiale sont affichés. Les achats n'apparaissent que pour les clients ayant accepté la communication marketing.</p>
    </div>
  );
}