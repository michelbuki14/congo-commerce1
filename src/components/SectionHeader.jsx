import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function SectionHeader({ title, subtitle, to, linkLabel = 'Tout voir' }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-bold tracking-tight md:text-lg">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary">
          {linkLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}