import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, MapPin, Truck, UserPlus, UserCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import ProductGrid from '@/components/ProductGrid';
import RatingStars from '@/components/RatingStars';
import EmptyState from '@/components/EmptyState';
import { getFollowedIds, toggleFollowId } from '@/lib/session';
import { compactNumber } from '@/lib/format';

export default function Store() {
  const { slug } = useParams();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        let rows = await base44.entities.Seller.filter({ slug });
        if (!rows.length) rows = await base44.entities.Seller.filter({ id: slug }).catch(() => []);
        const found = rows[0];
        if (!found) {
          if (alive) setNotFound(true);
          return;
        }
        const items = await base44.entities.Product.filter({ seller_id: found.id, status: 'published' }, '-created_date', 100);
        if (!alive) return;
        setSeller(found);
        setProducts(items);
        setFollowing(getFollowedIds().includes(found.id));
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const toggleFollow = async () => {
    if (!seller) return;
    const next = toggleFollowId(seller.id);
    const nowFollowing = next.includes(seller.id);
    setFollowing(nowFollowing);
    const delta = nowFollowing ? 1 : -1;
    const updated = await base44.entities.Seller.update(seller.id, {
      followers_count: Math.max(0, (seller.followers_count || 0) + delta),
    }).catch(() => null);
    if (updated) setSeller(updated);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !seller) {
    return <EmptyState title="Boutique introuvable" description="Cette boutique n'existe plus ou a été suspendue." actionTo="/" actionLabel="Retour à l'accueil" />;
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="relative overflow-hidden rounded-2xl">
        <Image src={seller.banner_url} alt={seller.name} className="h-36 w-full object-cover md:h-52" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-background bg-secondary md:h-20 md:w-20">
            <Image src={seller.logo_url} alt={seller.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 pb-1 text-background">
            <p className="flex items-center gap-1 text-base font-bold md:text-xl">
              {seller.name}
              {seller.verified && <BadgeCheck className="h-5 w-5 text-sky-300" />}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] opacity-90">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {seller.city}, {seller.country}
              </span>
              <span>{compactNumber(seller.followers_count || 0)} abonnés</span>
              <span>{products.length} articles</span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleFollow}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ${
              following ? 'bg-background/90 text-foreground' : 'bg-primary text-primary-foreground'
            }`}
          >
            {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
            {following ? 'Suivi' : 'Suivre'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-semibold text-muted-foreground">Note boutique</p>
          <RatingStars rating={seller.rating || 0} count={seller.products_count || 0} size="md" />
        </div>
        <div className="rounded-xl border border-border bg-card p-3 md:col-span-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Truck className="h-3.5 w-3.5" /> Livraison & retrait
          </p>
          <p className="mt-0.5 text-sm">{seller.delivery_info || 'Livraison à Kinshasa sous 2 à 4 jours, retrait en point relais disponible.'}</p>
        </div>
      </div>

      {seller.description && (
        <section>
          <h2 className="mb-1.5 text-base font-bold">À propos</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{seller.description}</p>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-bold">Produits ({products.length})</h2>
        <ProductGrid
          products={products}
          emptyState={<EmptyState title="Aucun produit publié" description="Cette boutique n'a pas encore d'articles en ligne." />}
        />
      </section>
    </div>
  );
}