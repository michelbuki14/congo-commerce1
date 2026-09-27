import React from 'react';
import { Link } from 'react-router-dom';
import { getCompanyConfig } from '@/lib/config';

const LINKS = [
  { to: '/about', label: 'À propos' },
  { to: '/contact', label: 'Contact' },
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/cgv', label: 'Conditions générales de vente' },
  { to: '/terms-of-service', label: 'Conditions d’utilisation' },
  { to: '/platform-guidelines', label: 'Règles de la communauté' },
  { to: '/confidentialite', label: 'Confidentialité & données' },
];

const RESOURCE_LINKS = [
  { to: '/help-center', label: 'Centre d’aide' },
  { to: '/faq', label: 'FAQ' },
  { to: '/shipping-info', label: 'Livraison & zones' },
  { to: '/buyer-protection', label: 'Protection acheteur' },
  { to: '/order-history', label: 'Mes commandes' },
  { to: '/my-wallet', label: 'Mon portefeuille' },
  { to: '/referral-program', label: 'Parrainage' },
  { to: '/creator-showcase', label: 'Créateurs' },
  { to: '/sell-with-us', label: 'Vendre avec nous' },
  { to: '/payout-requests', label: 'Demandes de retrait' },
  { to: '/privacy-settings', label: 'Paramètres de confidentialité' },
  { to: '/order-tracking', label: 'Suivi de livraison' },
  { to: '/dispute-center', label: 'Litiges & remboursements' },
  { to: '/support-tickets', label: 'Tickets support' },
  { to: '/pickup-points', label: 'Points de retrait' },
  { to: '/shipping-calculator', label: 'Calculateur de livraison' },
  { to: '/seller-application', label: 'Devenir vendeur' },
];

export default function LegalFooter() {
  const c = getCompanyConfig();
  return (
    <footer className="mt-8 border-t border-border pt-4 pb-2 text-[11px] text-muted-foreground">
      <div className="space-y-1.5">
        {[LINKS, RESOURCE_LINKS].map((group, i) => (
          <div key={i} className="flex flex-wrap gap-x-4 gap-y-1.5">
            {group.map((l) => (
              <Link key={l.to} to={l.to} className="font-medium hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-2 leading-relaxed">
        {c.legal_name || 'Congo Commerce'} · RCCM {c.rccm || '—'} · NIF {c.nif || '—'} ·{' '}
        {[c.address, c.city, c.country].filter(Boolean).join(', ')}
      </p>
    </footer>
  );
}