import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Trash2 } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import { Switch } from '@/components/ui/switch';
import { getPrivacyPreferences, savePrivacyPreferences, clearLocalSession } from '@/lib/session';

export default function PrivacySettings() {
  const { t } = useTranslation();
  const TOGGLES = [
    {
      key: 'personalized_tracking',
      label: t('privacySettings.toggleReco'),
      text: t('privacySettings.toggleRecoText'),
    },
    {
      key: 'anonymous_analytics',
      label: t('privacySettings.toggleAnalytics'),
      text: t('privacySettings.toggleAnalyticsText'),
    },
    {
      key: 'share_with_partners',
      label: t('privacySettings.toggleShare'),
      text: t('privacySettings.toggleShareText'),
    },
    {
      key: 'marketing_emails',
      label: t('privacySettings.toggleMarketing'),
      text: t('privacySettings.toggleMarketingText'),
    },
  ];
  const [prefs, setPrefs] = useState(getPrivacyPreferences());
  const [cleared, setCleared] = useState(false);

  const update = (key, value) => setPrefs(savePrivacyPreferences({ [key]: value }));

  return (
    <InfoPage
      icon={ShieldCheck}
      title={t('privacySettings.title')}
      subtitle={t('privacySettings.subtitle')}
    >
      <InfoSection title={t('privacySettings.prefsTitle')}>
        <div className="space-y-2">
          {TOGGLES.map((tx) => (
            <div key={tx.key} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <p className="text-xs font-semibold text-foreground">{tx.label}</p>
                <p className="mt-1">{tx.text}</p>
              </div>
              <Switch
                checked={!!prefs[tx.key]}
                onCheckedChange={(value) => update(tx.key, value)}
                aria-label={tx.label}
              />
            </div>
          ))}
        </div>
        <p className="pt-1">
          {t('privacySettings.analyticsNote')}
        </p>
      </InfoSection>

      <InfoSection title={t('privacySettings.storedTitle')}>
        <p>
          {t('privacySettings.storedText')}
        </p>
        {cleared ? (
          <p className="text-emerald-600">{t('privacySettings.clearedText')}</p>
        ) : (
          <button
            type="button"
            onClick={() => {
              clearLocalSession();
              setPrefs(getPrivacyPreferences());
              setCleared(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-destructive px-4 py-2 text-xs font-semibold text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> {t('privacySettings.clearData')}
          </button>
        )}
      </InfoSection>

      <InfoSection title={t('privacySettings.accountTitle')}>
        <p>
          {t('privacySettings.accountText')}
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t('privacySettings.deleteConfirm'))) {
              // TODO: Implement actual account deletion API call
              alert(t('privacySettings.deleteSuccess'));
              window.location.href = '/';
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-destructive px-4 py-2 text-xs font-semibold text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" /> {t('privacySettings.deleteAccount')}
        </button>
      </InfoSection>

      <InfoSection title={t('privacySettings.rightsTitle')}>
        <p>
          {t('privacySettings.rightsText')}
        </p>
        <Link
          to="/confidentialite"
          className="inline-block rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground"
        >
          {t('privacySettings.exerciseRights')}
        </Link>
      </InfoSection>
    </InfoPage>
  );
}