import React from 'react';
import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton';

export default function ProductGrid({ products, loading, skeletonCount = 6, emptyState }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!products?.length) return emptyState || null;

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}