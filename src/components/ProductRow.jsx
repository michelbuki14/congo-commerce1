import React from 'react';
import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton';

export default function ProductRow({ products, loading, skeletonCount = 4 }) {
  if (loading) {
    return (
      <div className="flex gap-2.5 overflow-hidden md:gap-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="w-[46%] shrink-0 sm:w-[32%] md:w-[23%]">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    );
  }
  if (!products?.length) return null;

  return (
    <div className="-mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 pb-1 md:-mx-0 md:gap-4 md:px-0">
      {products.map((p) => (
        <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[32%] md:w-[23%]">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}