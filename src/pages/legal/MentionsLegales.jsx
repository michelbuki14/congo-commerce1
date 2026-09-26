import React from 'react';
import LegalPage, { LegalSection, LegalRow } from '@/components/legal/LegalPage';
import { getCompanyConfig } from '@/lib/config';

export default function MentionsLegales() {
  const c = getCompanyConfig();

  return (
    <LegalPage
      title="Mentions légales"
      subtitle="Informations relatives à l'éditeur de la plateforme Congo Commerce."
    >
      <LegalSection title="Éditeur de la plateforme">
        <LegalRow label="Dénomination sociale" value={c.legal_name} />
        <LegalRow label="Nom commercial" value={c.trade_name} />
        <LegalRow label="Forme juridique" value={c.legal_form} />
        <LegalRow label="RCCM" value={c.rccm} />
        <LegalRow label="NIF (identifiant fiscal)" value={c.nif} />
        <LegalRow label="Numéro de TVA" value={c.vat_number} />
        <LegalRow label="Capital social" value={c.capital} />
        <LegalRow label="Siège social" value={[c.address, c.city, c.country].filter(Boolean).join(', ')} />
        <LegalRow label="Email" value={c.email} />
        <LegalRow label="Téléphone" value={c.phone} />
      </LegalSection>

      <LegalSection title="Directeur de la publication">
        <p>{c.publisher || 'Le représentant légal de la société, joignable aux coordonnées ci-dessus.'}</p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          La plateforme est hébergée sur une infrastructure cloud. Les coordonnées de l'hébergeur sont les
          suivantes :
        </p>
        <LegalRow label="Hébergeur" value={c.host_name} />
        <LegalRow label="Adresse" value={c.host_address} />
        <LegalRow label="Contact" value={c.host_contact} />
      </LegalSection>

      <LegalSection title="Activité">
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

      <LegalSection title="Propriété intellectuelle">
        <p>
          La marque, les logos, l'interface et l'ensemble des contenus de la plateforme sont protégés. Toute
          reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable est interdite.
        </p>
        <p>
          Les visuels et descriptifs produits publiés par les vendeurs restent leur propriété ; ils garantissent
          détenir les droits nécessaires à leur diffusion.
        </p>
      </LegalSection>

      <LegalSection title="Signalement">
        <p>
          Pour signaler un contenu illicite, un produit contrefait ou un comportement frauduleux, écrivez à{' '}
          {c.email || 'notre service client'} en précisant le numéro de commande ou l'adresse de la page
          concernée.
        </p>
      </LegalSection>
    </LegalPage>
  );
}