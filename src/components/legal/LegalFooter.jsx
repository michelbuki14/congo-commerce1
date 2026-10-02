import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCompanyConfig } from '@/lib/config';

const LINKS = [
  { to: '/about', key: 'footer.about' },
  { to: '/contact', key: 'footer.contact' },
  { to: '/mentions-legales', key: 'footer.legal' },
  { to: '/cgv', key: 'footer.cgv' },
  { to: '/terms-of-service', key: 'footer.terms' },
  { to: '/platform-guidelines', key: 'footer.guidelines' },
  { to: '/confidentialite', key: 'footer.privacy' },
];

const RESOURCE_LINKS = [
  { to: '/help-center', key: 'footer.help' },
  { to: '/faq', key: 'footer.faq' },
  { to: '/shipping-info', key: 'footer.shipping' },
  { to: '/buyer-protection', key: 'footer.protection' },
  { to: '/order-history', key: 'footer.orders' },
  { to: '/wallet', key: 'footer.wallet' },
  { to: '/customer-loyalty', key: 'footer.loyalty' },
  { to: '/referral-program', key: 'footer.referral' },
  { to: '/creator-showcase', key: 'footer.creators' },
  { to: '/sell-with-us', key: 'footer.sell' },
  { to: '/payout-requests', key: 'footer.payouts' },
  { to: '/privacy-settings', key: 'footer.privacySettings' },
  { to: '/order-tracking', key: 'footer.tracking' },
  { to: '/dispute-center', key: 'footer.disputes' },
  { to: '/returns', key: 'footer.returns' },
  { to: '/support-tickets', key: 'footer.tickets' },
  { to: '/pickup-points', key: 'footer.pickup' },
  { to: '/vendor-ratings', key: 'footer.ratings' },
  { to: '/shipping-calculator', key: 'footer.shipcalc' },
  { to: '/seller-application', key: 'footer.becomeSeller' },
  { to: '/pricing', key: 'footer.pricing' },
  { to: '/subscription-plans', key: 'footer.plans' },
];

export default function LegalFooter() {
  const { t } = useTranslation();
  const c = getCompanyConfig();
  return (
    <footer className="mt-8 border-t border-border pt-4 pb-2 text-[11px] text-muted-foreground">
      <div className="space-y-1.5">
        {[LINKS, RESOURCE_LINKS].map((group, i) => (
          <div key={i} className="flex flex-wrap gap-x-4 gap-y-1.5">
            {group.map((l) => (
              <Link key={l.to} to={l.to} className="font-medium hover:text-foreground">
                {t(l.key)}
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