import React from 'react';
import { Bell } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import ToggleRow from '@/components/settings/ToggleRow';
import useUserPrefs from '@/lib/useUserPrefs';

const TOPICS = [
  { id: 'orders', label: 'Commandes' },
  { id: 'shipping', label: 'Suivi de livraison' },
  { id: 'promotions', label: 'Promotions' },
];
const CHANNELS = [
  { id: 'email', label: 'E-mail' },
  { id: 'sms', label: 'SMS' },
  { id: 'push', label: 'Notifications dans l\'app' },
];
const DEFAULTS = {
  orders: { email: true, sms: true, push: true },
  shipping: { email: true, sms: true, push: true },
  promotions: { email: false, sms: false, push: true },
};

export default function NotificationSettings() {
  const { value, save, saving } = useUserPrefs('notification_prefs', DEFAULTS);
  if (!value) return <div className="mx-auto h-64 max-w-3xl animate-pulse rounded-2xl bg-secondary" />;

  const toggle = (topic, channel, on) =>
    save({ ...value, [topic]: { ...(value[topic] || {}), [channel]: on } });

  return (
    <InfoPage icon={Bell} title="Préférences de notification" subtitle="Choisissez comment être prévenu. Chaque changement est enregistré immédiatement.">
      {TOPICS.map((t) => (
        <InfoSection key={t.id} title={t.label}>
          <div className="divide-y divide-border">
            {CHANNELS.map((c) => (
              <ToggleRow key={c.id} label={c.label} checked={value[t.id]?.[c.id]} disabled={saving} onChange={(on) => toggle(t.id, c.id, on)} />
            ))}
          </div>
        </InfoSection>
      ))}
    </InfoPage>
  );
}