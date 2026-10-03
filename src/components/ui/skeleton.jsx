import React from 'react';

function SkeletonRect({ className = '', ...props }) {
  return (
    <div
      className={`relative overflow-hidden rounded bg-muted animate-pulse ${className}`}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent animate-[shimmer_1.5s_infinite]" />
    </div>
  );
}

function SkeletonCircle({ className = '', ...props }) {
  return (
    <div
      className={`relative overflow-hidden rounded-full bg-muted animate-pulse ${className}`}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent animate-[shimmer_1.5s_infinite]" />
    </div>
  );
}

function SkeletonText({ lines = 3, className = '', ...props }) {
  return (
    <div className={`space-y-2 ${className}`} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonRect
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className = '', ...props }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 space-y-4 ${className}`} {...props}>
      <SkeletonCircle className="h-12 w-12" />
      <SkeletonText lines={2} />
      <SkeletonRect className="h-8 w-1/3" />
    </div>
  );
}

function SkeletonProductCard({ className = '', ...props }) {
  return (
    <div className={`group flex flex-col rounded-xl border border-border bg-card overflow-hidden ${className}`} {...props}>
      <SkeletonRect className="aspect-square w-full" />
      <div className="flex-1 p-4 space-y-3">
        <SkeletonText lines={2} />
        <SkeletonRect className="h-6 w-1/2" />
        <SkeletonText lines={1} />
      </div>
    </div>
  );
}

function SkeletonTableRow({ columns = 4, className = '', ...props }) {
  return (
    <div className={`flex gap-4 p-4 ${className}`} {...props}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonRect
          key={i}
          className="h-4 flex-1"
          style={{ width: i === 0 ? '40%' : '20%' }}
        />
      ))}
    </div>
  );
}

function SkeletonDashboard({ className = '', ...props }) {
  return (
    <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-4 ${className}`} {...props}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-3">
          <SkeletonText lines={1} />
          <SkeletonRect className="h-12 w-1/2" />
          <SkeletonText lines={1} />
        </div>
      ))}
    </div>
  );
}

function SkeletonProfile({ className = '', ...props }) {
  return (
    <div className={`space-y-6 ${className}`} {...props}>
      <div className="flex items-center gap-4">
        <SkeletonCircle className="h-20 w-20" />
        <div className="space-y-2">
          <SkeletonRect className="h-6 w-48" />
          <SkeletonRect className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <SkeletonText lines={1} />
            <SkeletonRect className="h-8 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonOrderList({ className = '', ...props }) {
  return (
    <div className={`space-y-4 ${className}`} {...props}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <SkeletonText lines={1} />
            <SkeletonRect className="h-8 w-24" />
          </div>
          <div className="mt-3 flex gap-4">
            <SkeletonRect className="h-4 w-32" />
            <SkeletonRect className="h-4 w-24" />
          </div>
        </div>
      )}
    </div>
  );
}

export {
  SkeletonRect,
  SkeletonCircle,
  SkeletonText,
  SkeletonCard,
  SkeletonProductCard,
  SkeletonTableRow,
  SkeletonDashboard,
  SkeletonProfile,
  SkeletonOrderList,
};