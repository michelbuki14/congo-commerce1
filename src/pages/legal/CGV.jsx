import React from 'react';
import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '@/components/legal/LegalPage';
import { useTranslation } from 'react-i18next';
import { getCompanyConfig, getTaxConfig } from '@/lib/config';

export default function CGV() {
  const { t } = useTranslation();
  const c = getCompanyConfig();
  const tax = getTaxConfig();
  const rate = tax.enabled === false ? 0 : Number(tax.vat_rate) || 0;

  return (
    <LegalPage
      title={t('cgv.title')}
      subtitle={t('cgv.subtitle', { shop: c.trade_name || 'Congo Commerce' })}
    >
      <LegalSection title={t('cgv.s1')}>
        <p>
          Les présentes conditions régissent les ventes conclues sur la plateforme entre, d'une part,{' '}
          {c.legal_name || 'Congo Commerce'}, exploitant de la place de marché, et, d'autre part, tout acheteur
          consommateur. Toute commande implique leur acceptation sans réserve.
        </p>
        <p>
          La plateforme met en relation des vendeurs locaux et des fournisseurs internationaux. Une même
          commande peut être répartie en plusieurs expéditions, chacune traitée par le vendeur ou le fournisseur
          concerné, tout en restant suivie sous un numéro de commande unique.
        </p>
      </LegalSection>

      <LegalSection title={t('cgv.s2')}>
        <p>
          Les produits sont décrits et illustrés par les vendeurs, sous leur responsabilité. Les photographies
          ont une valeur indicative et n'entrent pas dans le champ contractuel.
        </p>
        <p>
          La disponibilité est confirmée au moment de la commande. En cas d'indisponibilité constatée après
          commande, l'acheteur est informé et remboursé de l'article concerné.
        </p>
      </LegalSection>

      <LegalSection title={t('cgv.s3')}>
        <p>
          Les prix sont affichés en dollars américains (USD), toutes taxes comprises. Le montant en francs
          congolais (CDF) est fourni à titre indicatif au taux de conversion appliqué au moment de la commande.
        </p>
        {rate > 0 ? (
          <p>
            Les prix incluent la taxe sur la valeur ajoutée au taux de {rate} %. Le détail hors taxes et le
            montant de TVA figurent sur la facture émise pour chaque commande.
          </p>
        ) : (
          <p>
            La plateforme n'applique pas la TVA à ce jour. Le détail des montants figure sur la facture émise
            pour chaque commande.
          </p>
        )}
        <p>
          Les frais de livraison sont indiqués avant validation du paiement. La livraison est offerte au-delà du
          seuil affiché dans le panier.
        </p>
      </LegalSection>

      <LegalSection title={t('cgv.s4')}>
        <p>
          La commande est validée après acceptation des présentes conditions et de la politique de
          confidentialité. Un accusé de réception reprenant le détail de la commande est affiché immédiatement
          après validation et une notification est enregistrée dans l'espace client.
        </p>
        <p>
          L'acheteur s'engage à fournir des coordonnées exactes et complètes. Une adresse ou un numéro erroné
          peut entraîner l'échec de la livraison, sans remboursement des frais engagés.
        </p>
      </LegalSection>

      <LegalSection title={t('cgv.s5')}>
        <p>
          Le paiement s'effectue par mobile money (M-Pesa, Airtel Money, Orange Money), par carte bancaire ou à
          la livraison selon les options proposées au moment de la commande.
        </p>
        <p>
          Le paiement à la livraison est disponible dans les zones desservies, dans la limite du montant autorisé
          pour ce mode de règlement. En cas d'échec du paiement en ligne, la commande n'est pas confirmée et
          aucun montant n'est prélevé.
        </p>
        <p>
          Une facture est émise pour chaque commande payée et reste accessible depuis l'espace client.
        </p>
      </LegalSection>

      <LegalSection title={t('cgv.s6')}>
        <p>
          La livraison est assurée à domicile ou en point de retrait, dans les villes desservies indiquées au
          moment de la commande. Les délais estimés sont affichés par produit et confirmés au suivi de commande.
        </p>
        <p>
          Pour un retrait en point de retrait, l'acheteur reçoit un code à présenter au livreur. Le colis est
          conservé au point de retrait pendant la durée indiquée ; passé ce délai, il peut être retourné au
          vendeur.
        </p>
        <p>
          Les retards liés à des événements extérieurs (intempéries, blocages, formalités douanières pour les
          importations) n'ouvrent pas droit à indemnité, mais l'acheteur est informé et peut demander
          l'annulation de la commande non expédiée.
        </p>
      </LegalSection>

      <LegalSection title={t('cgv.s7')}>
        <p>
          L'acheteur dispose de sept (7) jours à compter de la réception pour demander un retour, depuis la page
          « Retours » de son espace client, pour tout article non utilisé, complet, dans son emballage d'origine.
        </p>
        <p>
          Les demandes sont également recevables au-delà de ce délai lorsque le produit reçu ne correspond pas à
          la description, est endommagé, incomplet ou jamais livré. Une photo du produit peut être demandée comme
          justificatif.
        </p>
        <p>
          Ne sont pas repris : les produits d'hygiène et de beauté ouverts, les denrées périssables, les articles
          personnalisés et les cartes ou codes à usage unique.
        </p>
        <p>
          Après acceptation, le remboursement est effectué sur le portefeuille de l'acheteur ou par le moyen de
          paiement d'origine, dans un délai de quatorze (14) jours. Les frais de retour sont à la charge de
          l'acheteur, sauf lorsque le produit livré est erroné ou défectueux.
        </p>
      </LegalSection>

      <LegalSection title={t('cgv.s8')}>
        <p>
          En cas de désaccord avec un vendeur, l'acheteur peut ouvrir un litige depuis son espace client. La
          plateforme instruit le dossier et peut prononcer un remboursement ou un dédommagement.
        </p>
        <p>
          Le paiement dû au vendeur est retenu jusqu'à la livraison effective. À défaut de résolution amiable,
          écrivez à {c.email || 'notre service client'} avant toute action contentieuse.
        </p>
      </LegalSection>

      <LegalSection title={t('cgv.s9')}>
        <p>
          Le traitement des données personnelles est décrit dans la{' '}
          <Link to="/confidentialite" className="font-semibold text-primary">
            politique de confidentialité
          </Link>
          , qui précise les finalités, les durées de conservation et les modalités d'exercice de vos droits.
        </p>
      </LegalSection>

      <LegalSection title={t('cgv.s10')}>
        <p>
          Les présentes conditions sont soumises au droit congolais. En cas de litige non résolu à l'amiable, les
          juridictions de Kinshasa sont compétentes, sans préjudice des règles protectrices applicables aux
          consommateurs.
        </p>
      </LegalSection>
    </LegalPage>
  );
}