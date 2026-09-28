import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function SectionHeader({ title, subtitle, to, linkLabel = 'Tout voir' }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight md:text-xl">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-accent">
          {linkLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}