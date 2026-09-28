import React from 'react';
import LegalPage, { LegalSection, LegalRow } from '@/components/legal/LegalPage';
import { useTranslation } from 'react-i18next';
import { getCompanyConfig } from '@/lib/config';

export default function MentionsLegales() {
  const { t } = useTranslation();
  const c = getCompanyConfig();

  return (
    <LegalPage
      title={t('mentionsLegales.title')}
      subtitle={t('mentionsLegales.subtitle')}
    >
      <LegalSection title={t('mentionsLegales.sectionEditor')}>
        <LegalRow label={t('mentionsLegales.legalName')} value={c.legal_name} />
        <LegalRow label={t('mentionsLegales.tradeName')} value={c.trade_name} />
        <LegalRow label={t('mentionsLegales.legalForm')} value={c.legal_form} />
        <LegalRow label="RCCM" value={c.rccm} />
        <LegalRow label={t('mentionsLegales.nif')} value={c.nif} />
        <LegalRow label={t('mentionsLegales.vatNumber')} value={c.vat_number} />
        <LegalRow label={t('mentionsLegales.capital')} value={c.capital} />
        <LegalRow label={t('mentionsLegales.hq')} value={[c.address, c.city, c.country].filter(Boolean).join(', ')} />
        <LegalRow label={t('mentionsLegales.email')} value={c.email} />
        <LegalRow label={t('mentionsLegales.phone')} value={c.phone} />
      </LegalSection>

      <LegalSection title={t('mentionsLegales.sectionPublisher')}>
        <p>{c.publisher || 'Le représentant légal de la société, joignable aux coordonnées ci-dessus.'}</p>
      </LegalSection>

      <LegalSection title={t('mentionsLegales.sectionHosting')}>
        <p>
          La plateforme est hébergée sur une infrastructure cloud. Les coordonnées de l'hébergeur sont les
          suivantes :
        </p>
        <LegalRow label={t('mentionsLegales.host')} value={c.host_name} />
        <LegalRow label={t('mentionsLegales.hostAddress')} value={c.host_address} />
        <LegalRow label={t('mentionsLegales.hostContact')} value={c.host_contact} />
      </LegalSection>

      <LegalSection title={t('mentionsLegales.sectionActivity')}>
        <p>
          {c.trade_name || 'Congo Commerce'} exploite une place de marché en ligne permettant à des vendeurs
          établis en République Démocratique du Congo et à des fournisseurs internationaux de proposer des
          produits à des acheteurs, avec livraison à domicile ou en point de retrait.
        </p>
        <p>
          La plateforme agit comme intermédiaire technique entre les vendeurs et les acheteurs. Chaque vendeur
          reste responsable de la conformité des produits qu'il met en vente.
        </p>
      </LegalSection>

      <LegalSection title={t('mentionsLegales.sectionIp')}>
        <p>
          La marque, les logos, l'interface et l'ensemble des contenus de la plateforme sont protégés. Toute
          reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable est interdite.
        </p>
        <p>
          Les visuels et descriptifs produits publiés par les vendeurs restent leur propriété ; ils garantissent
          détenir les droits nécessaires à leur diffusion.
        </p>
      </LegalSection>

      <LegalSection title={t('mentionsLegales.sectionReport')}>
        <p>
          Pour signaler un contenu illicite, un produit contrefait ou un comportement frauduleux, écrivez à{' '}
          {c.email || 'notre service client'} en précisant le numéro de commande ou l'adresse de la page
          concernée.
        </p>
      </LegalSection>
    </LegalPage>
  );
}