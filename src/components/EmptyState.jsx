import React from 'react';
import { Link } from 'react-router-dom';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({ icon: Icon = PackageOpen, title, description, actionLabel, actionTo }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <Icon className="mb-3 h-9 w-9 text-muted-foreground" />
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {actionTo && (
        <Link to={actionTo} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}