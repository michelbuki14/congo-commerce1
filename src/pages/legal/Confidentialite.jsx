import React from 'react';
import { Link } from 'react-router-dom';
import LegalPage, { LegalSection, LegalRow } from '@/components/legal/LegalPage';
import { useTranslation } from 'react-i18next';
import DataRightsForm from '@/components/legal/DataRightsForm';
import { getCompanyConfig } from '@/lib/config';

export default function Confidentialite() {
  const { t } = useTranslation();
  const c = getCompanyConfig();

  return (
    <LegalPage
      title={t('confidentialite.title')}
      subtitle={t('confidentialite.subtitle')}
    >
      <LegalSection title={t('confidentialite.s1')}>
        <p>
          Le responsable du traitement des données collectées sur la plateforme est :
        </p>
        <LegalRow label={t('confidentialite.company')} value={c.legal_name} />
        <LegalRow label={t('confidentialite.hq')} value={[c.address, c.city, c.country].filter(Boolean).join(', ')} />
        <LegalRow label={t('confidentialite.dataContact')} value={c.data_contact || c.email} />
      </LegalSection>

      <LegalSection title={t('confidentialite.s2')}>
        <p>Nous collectons uniquement les données nécessaires au traitement de vos commandes :</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>identité : nom, prénom ;</li>
          <li>coordonnées : numéro de téléphone, adresse email, adresse de livraison, ville ;</li>
          <li>données de commande : articles, montants, mode de paiement, historique d'achats ;</li>
          <li>données techniques : identifiant de session, préférences d'affichage et de devise.</li>
        </ul>
        <p>
          Aucune donnée bancaire complète n'est stockée sur nos serveurs : les paiements sont traités par nos
          prestataires de paiement agréés.
        </p>
      </LegalSection>

      <LegalSection title={t('confidentialite.s3')}>
        <p>
          Vos données sont traitées pour exécuter la commande (préparation, expédition, livraison, service
          client), pour respecter nos obligations comptables et fiscales, et — uniquement avec votre accord
          explicite — pour vous adresser nos offres et nouveautés.
        </p>
        <p>
          Conformément au Code du numérique, le consentement est recueilli de manière libre, spécifique, éclairée
          et univoque. Lors de la commande, une case à cocher distincte recueille votre accord pour la
          prospection commerciale ; elle n'est jamais pré-cochée et son refus n'empêche pas l'achat.
        </p>
      </LegalSection>

      <LegalSection title={t('confidentialite.s4')}>
        <p>
          Les données de commande et les factures sont conservées dix (10) ans pour répondre à nos obligations
          comptables et fiscales. Les données de prospection sont conservées jusqu'à votre désinscription, puis
          trois (3) ans au maximum. Les données de session sont supprimées après douze (12) mois d'inactivité.
        </p>
      </LegalSection>

      <LegalSection title={t('confidentialite.s5')}>
        <p>
          Vos données sont accessibles à nos équipes internes, aux vendeurs et transporteurs strictement pour
          l'exécution de votre commande (nom, adresse et téléphone de livraison), à nos prestataires de paiement
          et à notre hébergeur technique. Elles ne sont jamais vendues.
        </p>
        <p>
          Lorsqu'un article est expédié par un fournisseur international, seules les informations nécessaires au
          dédouanement et à la livraison lui sont transmises.
        </p>
      </LegalSection>

      <LegalSection title={t('confidentialite.s6')}>
        <p>
          L'accès aux données est restreint par des règles d'habilitation : chaque utilisateur n'accède qu'aux
          enregistrements qui le concernent. Les échanges sont chiffrés et les opérations sensibles sont
          journalisées.
        </p>
      </LegalSection>

      <LegalSection title={t('confidentialite.s7')}>
        <p>
          Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et d'opposition au
          traitement de vos données, ainsi que du droit de retirer votre consentement à tout moment.
        </p>
        <p>
          Ces droits s'exercent gratuitement depuis le formulaire ci-dessous ou par email à{' '}
          {c.data_contact || c.email || 'notre service client'}. Une réponse vous est apportée dans un délai
          maximum de trente (30) jours.
        </p>
      </LegalSection>

      <DataRightsForm />

      <LegalSection title={t('confidentialite.s8')}>
        <p>
          La plateforme utilise un identifiant de session stocké sur votre appareil pour conserver votre panier et
          vos préférences. Vous pouvez le supprimer à tout moment depuis les réglages de votre navigateur ; le
          panier sera alors réinitialisé.
        </p>
      </LegalSection>

      <LegalSection title={t('confidentialite.s9')}>
        <p>
          Cette politique peut être mise à jour pour refléter une évolution de nos pratiques ou de la
          réglementation. La date de dernière mise à jour figure en haut de cette page. Les{' '}
          <Link to="/cgv" className="font-semibold text-primary">conditions générales de vente</Link> complètent
          les présentes.
        </p>
      </LegalSection>
    </LegalPage>
  );
}