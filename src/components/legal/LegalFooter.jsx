import React from 'react';
import { Link } from 'react-router-dom';
import { getCompanyConfig } from '@/lib/config';

const LINKS = [
  { to: '/about', label: 'À propos' },
  { to: '/contact', label: 'Contact' },
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/cgv', label: 'Conditions générales de vente' },
  { to: '/confidentialite', label: 'Confidentialité & données' },
];

export default function LegalFooter() {
  const c = getCompanyConfig();
  return (
    <footer className="mt-8 border-t border-border pt-4 pb-2 text-[11px] text-muted-foreground">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="font-medium hover:text-foreground">
            {l.label}
          </Link>
        ))}
      </div>
      <p className="mt-2 leading-relaxed">
        {c.legal_name || 'Congo Commerce'} · RCCM {c.rccm || '—'} · NIF {c.nif || '—'} ·{' '}
        {[c.address, c.city, c.country].filter(Boolean).join(', ')}
      </p>
    </footer>
  );
}