import React from 'react';
import { NavLink } from 'react-router-dom';

export default function DashboardNav({ title, links }) {
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold md:text-xl">{title}</h1>
      <nav className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}