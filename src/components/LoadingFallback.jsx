import React from 'react';

export default function LoadingFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin"></div>
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}
