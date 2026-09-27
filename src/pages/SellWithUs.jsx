import React from 'react';
import { Link } from 'react-router-dom';
import { Store, BadgeCheck, Truck, Coins, Users, PackageCheck } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';

const BENEFITS = [
  { icon: Coins, title: 'Commission claire', text: '10 % par défaut sur vos ventes, sans abonnement ni frais d’ouverture de boutique.' },
  { icon: Truck, title: 'Logistique intégrée', text: 'Nos transporteurs partenaires prennent en charge la collecte et la livraison dans les villes desservies.' },
  { icon: PackageCheck, title: 'Import fournisseur', text: 'Importez un catalogue international en quelques clics et suivez chaque référence fournisseur.' },
  { icon: Users, title: 'Créateurs affiliés', text: 'Des créateurs congolais promeuvent vos produits et touchent une commission sur chaque vente.' },
];

const STEPS = [
  { title: '1. Créer votre compte', text: 'Inscrivez-vous avec votre numéro de téléphone et l’adresse e-mail de votre activité.' },
  { title: '2. Vérifier votre identité', text: 'Fournissez une pièce d’identité, le nom de la boutique, la ville et un contact joignable.' },
  { title: '3. Mettre en ligne vos produits', text: 'Photos, prix, stock et délai de préparation. Notre équipe relit les fiches avant publication.' },
  { title: '4. Vendre et être payé', text: 'Les ventes créditent votre portefeuille, libéré après confirmation de livraison. Retrait par mobile money.' },
];

export default function SellWithUs() {
  return (
    <InfoPage
      icon={Store}
      title="Vendre sur Congo Commerce"
      subtitle="Rejoignez la marketplace pensée pour les vendeurs et créateurs congolais : boutique en ligne, logistique et paiements mobile money réunis."
    >
      <section className="grid gap-3 md:grid-cols-2">
        {BENEFITS.map((b) => (
          <div key={b.title} className="rounded-2xl border border-border bg-card p-4">
            <b.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-bold">{b.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b.text}</p>
          </div>
        ))}
      </section>

      <InfoSection title="Le processus de vérification">
        <div className="space-y-2">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-foreground">{s.title}</p>
              <p className="mt-1">{s.text}</p>
            </div>
          ))}
        </div>
      </InfoSection>

      <InfoSection title="Prérequis">
        <ul className="space-y-1.5">
          <li>• Une activité déclarée ou un registre de commerce (RCCM) pour les boutiques professionnelles.</li>
          <li>• Un numéro mobile money actif au nom du titulaire du compte.</li>
          <li>• Une adresse de stock ou de préparation dans une ville desservie.</li>
          <li>• Des produits conformes à la réglementation congolaise : pas de contrefaçon, ni d’articles interdits.</li>
        </ul>
      </InfoSection>

      <InfoSection title="Commissions & paiements">
        <p>
          La commission plateforme est prélevée sur chaque vente livrée. Elle couvre l’hébergement de la boutique, le
          paiement mobile money, la protection acheteur et l’arbitrage des litiges. Les fonds sont libérés sur votre
          portefeuille après confirmation de la livraison, puis retirables par mobile money ou virement.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/seller" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground">
            <BadgeCheck className="h-4 w-4" /> Créer ma boutique
          </Link>
          <Link to="/contact" className="rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-foreground">
            Parler à un conseiller
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}