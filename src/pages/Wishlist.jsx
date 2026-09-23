import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ProductGrid from '@/components/ProductGrid';
import EmptyState from '@/components/EmptyState';
import { getWishlist } from '@/lib/session';

export default function Wishlist() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getWishlist();
    if (!ids.length) {
      setLoading(false);
      return;
    }
    Promise.all(ids.map((id) => base44.entities.Product.get(id).catch(() => null)))
      .then((rows) => setProducts(rows.filter(Boolean)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4 pb-6">
      <h1 className="text-lg font-bold md:text-xl">Mes favoris</h1>
      <ProductGrid
        products={products}
        loading={loading}
        emptyState={
          <EmptyState
            icon={Heart}
            title="Aucun favori"
            description="Touchez le cœur sur un article pour le retrouver ici, même avec une connexion faible."
            actionTo="/"
            actionLabel="Explorer les produits"
          />
        }
      />
    </div>
  );
}