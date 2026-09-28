import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import ToggleRow from '@/components/settings/ToggleRow';
import useUserPrefs from '@/lib/useUserPrefs';

const DEFAULTS = {
  orders: { email: true, sms: true, push: true },
  shipping: { email: true, sms: true, push: true },
  promotions: { email: false, sms: false, push: true },
};

export default function NotificationSettings() {
  const { t } = useTranslation();
  const TOPICS = [
    { id: 'orders', label: t('notificationSettings.topicOrders') },
    { id: 'shipping', label: t('notificationSettings.topicShipping') },
    { id: 'promotions', label: t('notificationSettings.topicPromotions') },
  ];
  const CHANNELS = [
    { id: 'email', label: t('notificationSettings.channelEmail') },
    { id: 'sms', label: t('notificationSettings.channelSms') },
    { id: 'push', label: t('notificationSettings.channelPush') },
  ];
  const { value, save, saving } = useUserPrefs('notification_prefs', DEFAULTS);
  if (!value) return <div className="mx-auto h-64 max-w-3xl animate-pulse rounded-2xl bg-secondary" />;

  const toggle = (topic, channel, on) =>
    save({ ...value, [topic]: { ...(value[topic] || {}), [channel]: on } });

  return (
    <InfoPage icon={Bell} title={t('notificationSettings.title')} subtitle={t('notificationSettings.subtitle')}>
      {TOPICS.map((tx) => (
        <InfoSection key={tx.id} title={tx.label}>
          <div className="divide-y divide-border">
            {CHANNELS.map((c) => (
              <ToggleRow key={c.id} label={c.label} checked={value[tx.id]?.[c.id]} disabled={saving} onChange={(on) => toggle(tx.id, c.id, on)} />
            ))}
          </div>
        </InfoSection>
      ))}
    </InfoPage>
  );
}
