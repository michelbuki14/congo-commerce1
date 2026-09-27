import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';

const GROUPS = [
  {
    title: 'Livraison & réception',
    items: [
      {
        q: 'Combien de temps prend une livraison ?',
        a: '2 à 4 jours à Kinshasa pour les articles locaux, 4 à 8 jours dans les autres villes desservies. Les articles importés arrivent sous 12 à 25 jours, avec numéro de suivi.',
      },
      {
        q: 'Quels sont les frais de livraison ?',
        a: 'Ils dépendent de votre ville et sont affichés avant le paiement. Le retrait en point relais coûte moins cher que la livraison à domicile.',
      },
      {
        q: 'Puis-je retirer ma commande en point relais ?',
        a: 'Oui. À l’étape du paiement, choisissez « Point de retrait » et sélectionnez le point le plus proche. Un code de retrait vous est communiqué.',
      },
      {
        q: 'Comment suivre ma commande ?',
        a: 'Depuis la page de suivi, saisissez votre numéro de commande (CC-…). Chaque étape de la livraison y est enregistrée par le transporteur.',
      },
    ],
  },
  {
    title: 'Paiement mobile money',
    items: [
      {
        q: 'Quels moyens de paiement acceptez-vous ?',
        a: 'M-Pesa, Airtel Money, Orange Money, carte bancaire (Visa / Mastercard) et paiement à la livraison dans les villes desservies.',
      },
      {
        q: 'Comment se passe un paiement M-Pesa ou Airtel Money ?',
        a: 'Après avoir validé votre commande, une demande de paiement est envoyée sur le numéro indiqué. Confirmez-la avec votre code secret : la commande est enregistrée dès la validation.',
      },
      {
        q: 'Que se passe-t-il si mon paiement échoue ?',
        a: 'La commande reste en attente et aucune somme n’est prélevée. Vous pouvez relancer le paiement depuis la page de suivi ou choisir un autre moyen.',
      },
      {
        q: 'Les frais d’importation sont-ils inclus ?',
        a: 'Oui. Le prix affiché inclut le transport international, les frais d’importation estimés et la logistique locale. Aucun supplément n’est demandé à la livraison.',
      },
    ],
  },
  {
    title: 'Marketplace & règles en RDC',
    items: [
      {
        q: 'Comment fonctionne la protection acheteur ?',
        a: 'Si votre article n’arrive pas, est endommagé ou ne correspond pas à la description, ouvrez un litige dans les 7 jours suivant la réception. Notre équipe arbitre et peut rembourser tout ou partie de la commande.',
      },
      {
        q: 'Les vendeurs sont-ils vérifiés ?',
        a: 'Chaque boutique est validée par notre équipe (pièce d’identité, coordonnées, activité) avant publication. Les vendeurs vérifiés portent un badge sur leur boutique.',
      },
      {
        q: 'La TVA est-elle appliquée ?',
        a: 'Oui, la TVA de 16 % apparaît sur une ligne distincte de votre facture lorsque la réglementation l’exige.',
      },
      {
        q: 'Comment exercer mes droits sur mes données ?',
        a: 'Rendez-vous sur la page Confidentialité & données pour demander l’accès, la rectification ou la suppression de vos informations.',
      },
    ],
  },
];

export default function Faq() {
  return (
    <InfoPage
      icon={HelpCircle}
      title="Questions fréquentes"
      subtitle="Livraison, paiement mobile money et règles de la marketplace congolaise : les réponses aux questions les plus posées."
    >
      {GROUPS.map((group) => (
        <InfoSection key={group.title} title={group.title}>
          {group.items.map((item) => (
            <details key={item.q} className="rounded-xl border border-border p-3">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">{item.q}</summary>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </InfoSection>
      ))}

      <InfoSection title="Encore une question ?">
        <p>
          Le centre d’aide regroupe nos guides, ou écrivez-nous directement : notre équipe répond dans les 24 h ouvrées.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/help-center" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            Centre d’aide
          </Link>
          <Link to="/support" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            Contacter le support
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}