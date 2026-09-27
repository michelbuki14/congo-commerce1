import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';

const STEPS = [
  {
    title: '1. Signalez dans les 7 jours',
    text: 'Ouvrez un litige depuis votre espace dès que vous constatez le problème, et au plus tard 7 jours après la réception du colis.',
  },
  {
    title: '2. Rassemblez les preuves',
    text: 'Photos de l’article, du colis et de l’étiquette, échanges avec le vendeur : ces éléments accélèrent l’arbitrage.',
  },
  {
    title: '3. Nous arbitrons sous 48 h',
    text: 'Notre équipe contacte le vendeur et le transporteur, puis vous informe de la décision et du montant retenu.',
  },
  {
    title: '4. Remboursement ou remplacement',
    text: 'Le remboursement est crédité sur votre portefeuille Congo Commerce ou sur votre moyen de paiement mobile money.',
  },
];

export default function BuyerProtection() {
  return (
    <InfoPage
      icon={ShieldCheck}
      title="Protection acheteur"
      subtitle="Ce que nous couvrons, comment ouvrir un litige et les règles de retour et de remboursement applicables en République démocratique du Congo."
    >
      <InfoSection title="Ce qui est couvert">
        <ul className="space-y-1.5">
          <li>• Article non reçu dans le délai annoncé : remboursement intégral après enquête transporteur.</li>
          <li>• Mauvais article ou article manquant dans le colis : remplacement ou remboursement.</li>
          <li>• Article endommagé : remboursement partiel ou total selon les preuves fournies.</li>
          <li>• Article très différent de la description : remboursement intégral.</li>
          <li>• Paiement mobile money débité sans commande enregistrée : régularisation ou remboursement.</li>
        </ul>
      </InfoSection>

      <InfoSection title="Ouvrir un litige">
        <div className="space-y-2">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-foreground">{s.title}</p>
              <p className="mt-1">{s.text}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/disputes" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            Ouvrir un litige
          </Link>
          <Link to="/track" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            Suivre une commande
          </Link>
        </div>
      </InfoSection>

      <InfoSection title="Retours & remboursements en RDC">
        <ul className="space-y-1.5">
          <li>• Délai d’ouverture : 7 jours après la réception, 14 jours pour les articles importés.</li>
          <li>• Les retours sont gratuits lorsque le problème vient du vendeur ou du transporteur.</li>
          <li>• En cas de changement d’avis, les frais de retour sont à la charge de l’acheteur et l’article doit être non utilisé.</li>
          <li>• Le remboursement intervient sous 3 à 7 jours ouvrés après validation du retour.</li>
          <li>• Les produits d’hygiène ouverts, les denrées périssables et les articles personnalisés ne sont pas repris.</li>
        </ul>
      </InfoSection>

      <InfoSection title="Après la décision">
        <p>
          Un litige clos peut être rouvert une fois si un nouvel élément est apporté. En cas de désaccord persistant,
          écrivez au support : un responsable examine le dossier manuellement.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/returns" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            Demander un retour
          </Link>
          <Link to="/help-center" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            Centre d’aide
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}