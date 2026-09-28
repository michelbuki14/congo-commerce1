import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import { getCompanyConfig } from '@/lib/config';

export default function TermsOfService() {
  const { t } = useTranslation();
  const c = getCompanyConfig();
  const operator = c.legal_name || 'Congo Commerce';

  return (
    <InfoPage
      icon={FileText}
      title={t('termsOfService.title')}
      subtitle={t('termsOfService.subtitle')}
    >
      <InfoSection title={t('termsOfService.s1')}>
        <p>
          {t('termsOfService.p1a', { operator })}{' '}
          <Link to="/platform-guidelines" className="font-semibold text-primary">{t('termsOfService.linkGuidelines')}</Link>
          {t('termsOfService.p1b')}
        </p>
      </InfoSection>

      <InfoSection title={t('termsOfService.s2')}>
        <p>
          {t('termsOfService.p2', { operator })}
        </p>
      </InfoSection>

      <InfoSection title={t('termsOfService.s3')}>
        <p>
          {t('termsOfService.p3')}
        </p>
      </InfoSection>

      <InfoSection title={t('termsOfService.s4')}>
        <p>
          {t('termsOfService.p4')}
        </p>
      </InfoSection>

      <InfoSection title={t('termsOfService.s5')}>
        <p>
          {t('termsOfService.p5')}
        </p>
      </InfoSection>

      <InfoSection title={t('termsOfService.s6')}>
        <p>
          {t('termsOfService.p6')}
        </p>
      </InfoSection>

      <InfoSection title={t('termsOfService.s7')}>
        <p>
          {t('termsOfService.p7')}
        </p>
      </InfoSection>

      <InfoSection title={t('termsOfService.s8')}>
        <p>
          {t('termsOfService.p8')}
        </p>
      </InfoSection>

      <InfoSection title={t('termsOfService.s9')}>
        <p>
          {t('termsOfService.p9')}
        </p>
      </InfoSection>

      <InfoSection title={t('termsOfService.s10')}>
        <p>
          {t('termsOfService.p10')}
        </p>
      </InfoSection>

      <InfoSection title={t('termsOfService.s11')}>
        <p>
          {t('termsOfService.p11a')}{' '}
          <Link to="/confidentialite" className="font-semibold text-primary">{t('termsOfService.linkPrivacy')}</Link>
          {t('termsOfService.p11b')}{' '}
          <Link to="/privacy-settings" className="font-semibold text-primary">{t('termsOfService.linkPrivacySettings')}</Link>
          {t('termsOfService.p11c')}
        </p>
      </InfoSection>

      <InfoSection title={t('termsOfService.s12')}>
        <p>
          {t('termsOfService.p12')}
        </p>
      </InfoSection>
    </InfoPage>
  );
}