import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import { getCompanyConfig } from '@/lib/config';

export default function TermsOfService() {
  const c = getCompanyConfig();
  const operator = c.legal_name || 'Congo Commerce';

  return (
    <InfoPage
      icon={FileText}
      title="Conditions d'utilisation"
      subtitle="Les règles qui encadrent l'utilisation de la plateforme par les acheteurs, les vendeurs et les créateurs affiliés en République démocratique du Congo."
    >
      <InfoSection title="1. Objet et acceptation">
        <p>
          Les présentes conditions régissent l'accès et l'utilisation de la place de marché {operator}. En créant un compte,
          en passant une commande ou en publiant une fiche produit, vous acceptez sans réserve l'intégralité de ces
          conditions ainsi que les <Link to="/platform-guidelines" className="font-semibold text-primary">règles de la communauté</Link>.
        </p>
      </InfoSection>

      <InfoSection title="2. Rôle de la plateforme">
        <p>
          {operator} met à disposition une infrastructure technique : catalogue, paiement mobile money, logistique et
          arbitrage. La vente est conclue directement entre le vendeur et l'acheteur ; la plateforme n'est pas le vendeur
          des articles proposés, sauf mention contraire explicite sur la fiche produit.
        </p>
      </InfoSection>

      <InfoSection title="3. Comptes et accès">
        <p>
          Vous êtes responsable de l'exactitude des informations transmises (nom, téléphone, adresse, coordonnées mobile
          money) et de la confidentialité de vos identifiants. Un compte vendeur suppose la vérification de l'identité du
          responsable et de l'adresse de préparation des commandes.
        </p>
      </InfoSection>

      <InfoSection title="4. Commandes, prix et taxes">
        <p>
          Les prix sont affichés en dollars américains et convertis en francs congolais au taux appliqué au moment du
          paiement. Les montants incluent la TVA au taux légal en vigueur (16 %), présentée en ligne distincte sur la
          commande et la facture. Une commande n'est définitive qu'après confirmation du paiement ou acceptation du paiement
          à la livraison.
        </p>
      </InfoSection>

      <InfoSection title="5. Paiement">
        <p>
          Les paiements s'effectuent par mobile money (Airtel Money, Orange Money, M-Pesa) ou en espèces à la livraison
          lorsque l'option est proposée. Toute référence de paiement communiquée doit correspondre à la commande : une
          transaction non rattachée peut retarder la préparation du colis.
        </p>
      </InfoSection>

      <InfoSection title="6. Livraison et retrait">
        <p>
          Les délais annoncés sont estimatifs et dépendent du transporteur partenaire et de la zone desservie. En cas de
          retrait en point relais, le colis est conservé sept jours ; passé ce délai, il est retourné au vendeur et les frais
          de retour peuvent être retenus.
        </p>
      </InfoSection>

      <InfoSection title="7. Obligations des vendeurs">
        <p>
          Le vendeur garantit la licéité, la conformité et la disponibilité des produits publiés, respecte les délais de
          préparation annoncés et reverse la commission plateforme sur chaque vente livrée. Les produits contrefaits,
          dangereux ou interdits entraînent le retrait des fiches et la suspension du compte.
        </p>
      </InfoSection>

      <InfoSection title="8. Retours, remboursements et litiges">
        <p>
          L'acheteur peut ouvrir un retour ou un litige dans les sept jours suivant la réception. L'équipe arbitre le dossier
          entre les parties et peut prononcer un remboursement, un remplacement ou un rejet motivé. Les remboursements sont
          crédités sur le portefeuille de l'acheteur ou sur son compte mobile money.
        </p>
      </InfoSection>

      <InfoSection title="9. Responsabilité">
        <p>
          La plateforme ne peut être tenue responsable des retards dus à un cas de force majeure, à une indisponibilité des
          réseaux de télécommunication ou des services de mobile money, ni des dommages résultant d'une utilisation
          contraire aux présentes conditions.
        </p>
      </InfoSection>

      <InfoSection title="10. Propriété intellectuelle">
        <p>
          Les marques, logos et contenus de la plateforme restent la propriété de leurs titulaires. Le vendeur garantit
          détenir les droits sur les visuels et descriptions qu'il publie et autorise leur diffusion sur la plateforme et
          ses canaux de promotion.
        </p>
      </InfoSection>

      <InfoSection title="11. Données personnelles">
        <p>
          Les données collectées servent à traiter les commandes, sécuriser les paiements et améliorer le service,
          conformément à la <Link to="/confidentialite" className="font-semibold text-primary">politique de confidentialité</Link> et à la
          législation congolaise applicable. Vous pouvez demander l'accès, la rectification ou la suppression de vos données
          depuis vos <Link to="/privacy-settings" className="font-semibold text-primary">paramètres de confidentialité</Link>.
        </p>
      </InfoSection>

      <InfoSection title="12. Droit applicable">
        <p>
          Les présentes conditions sont soumises au droit congolais. En cas de différend non résolu à l'amiable, les
          tribunaux compétents de Kinshasa seront saisis. Ces conditions peuvent être modifiées : la version applicable est
          celle publiée au jour de la commande.
        </p>
      </InfoSection>
    </InfoPage>
  );
}