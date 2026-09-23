import React from 'react';

export default function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-square w-full animate-pulse bg-secondary" />
      <div className="space-y-2 p-2.5">
        <div className="h-3 w-4/5 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
        <div className="h-4 w-2/5 animate-pulse rounded bg-secondary" />
      </div>
    </div>
  );
}