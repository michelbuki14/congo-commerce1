import React from 'react';
import { Link } from 'react-router-dom';
import {
  LifeBuoy,
  HelpCircle,
  Truck,
  RotateCcw,
  ShieldCheck,
  MapPin,
  Search,
  Store,
  Banknote,
  Headphones,
} from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';

const TOPICS = [
  { icon: Search, title: 'Suivre une commande', text: 'Statut, transporteur et étapes de livraison.', to: '/track' },
  { icon: Truck, title: 'Livraison & zones', text: 'Villes desservies, délais et points relais.', to: '/shipping-info' },
  { icon: RotateCcw, title: 'Retours & remboursements', text: 'Ouvrir une demande de retour.', to: '/returns' },
  { icon: ShieldCheck, title: 'Protection acheteur', text: 'Litiges, garanties et arbitrage.', to: '/buyer-protection' },
  { icon: HelpCircle, title: 'Questions fréquentes', text: 'Réponses rapides sur paiement et livraison.', to: '/faq' },
  { icon: MapPin, title: 'Points de retrait', text: 'Adresses, horaires et frais réduits.', to: '/shipping-info' },
  { icon: Store, title: 'Devenir vendeur', text: 'Vérification, prérequis et commissions.', to: '/sell-with-us' },
  { icon: Banknote, title: 'Retraits & portefeuille', text: 'Soldes, écritures et demandes de retrait.', to: '/payout-requests' },
];

export default function HelpCenter() {
  return (
    <InfoPage
      icon={LifeBuoy}
      title="Centre d’aide"
      subtitle="Guides, démarches et assistance : tout ce qu’il faut pour acheter, vendre et se faire livrer sereinement en RDC."
    >
      <section className="grid gap-3 md:grid-cols-2">
        {TOPICS.map((t) => (
          <Link key={t.title} to={t.to} className="rounded-2xl border border-border bg-card p-4 hover:border-primary/40">
            <t.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-bold">{t.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.text}</p>
          </Link>
        ))}
      </section>

      <InfoSection title="Assistance humaine">
        <p>
          Vous ne trouvez pas votre réponse ? Envoyez-nous votre demande depuis la page support : notre équipe répond
          dans les 24 h ouvrées, par téléphone ou par e-mail.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to="/support"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            <Headphones className="h-4 w-4" /> Contacter le support
          </Link>
          <Link to="/faq" className="rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-foreground">
            Voir la FAQ
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}