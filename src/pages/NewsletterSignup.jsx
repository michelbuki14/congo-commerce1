import React from 'react';
import { Mail } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import ToggleRow from '@/components/settings/ToggleRow';
import useUserPrefs from '@/lib/useUserPrefs';

const TYPES = [
  { id: 'weekly_deals', label: 'Bons plans de la semaine', hint: 'Un e-mail par semaine' },
  { id: 'flash_sales', label: 'Ventes flash', hint: 'Dès qu\'une vente démarre' },
  { id: 'new_sellers', label: 'Nouvelles boutiques', hint: 'Vendeurs récemment vérifiés' },
  { id: 'creator_picks', label: 'Sélections des créateurs', hint: 'Coups de cœur de nos créateurs' },
];
const DEFAULTS = { subscribed: false, weekly_deals: true, flash_sales: false, new_sellers: false, creator_picks: false };

export default function NewsletterSignup() {
  const { value, save, saving } = useUserPrefs('newsletter_prefs', DEFAULTS);
  if (!value) return <div className="mx-auto h-64 max-w-3xl animate-pulse rounded-2xl bg-secondary" />;

  return (
    <InfoPage icon={Mail} title="Newsletter" subtitle="Gérez vos abonnements e-mail. Vous pouvez vous désabonner à tout moment.">
      <InfoSection title="Abonnement">
        <ToggleRow label="Recevoir la newsletter Congo Commerce" checked={value.subscribed} disabled={saving} onChange={(on) => save({ ...value, subscribed: on })} />
      </InfoSection>
      <InfoSection title="Types de contenus">
        <div className={`divide-y divide-border ${value.subscribed ? '' : 'opacity-50'}`}>
          {TYPES.map((t) => (
            <ToggleRow key={t.id} label={t.label} hint={t.hint} checked={value[t.id]} disabled={saving || !value.subscribed} onChange={(on) => save({ ...value, [t.id]: on })} />
          ))}
        </div>
      </InfoSection>
    </InfoPage>
  );
}