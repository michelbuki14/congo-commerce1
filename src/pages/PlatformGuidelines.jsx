import React from 'react';
import { Link } from 'react-router-dom';
import { ScrollText, ShieldCheck, Ban, Store, Users, Megaphone, AlertTriangle } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';

const PROHIBITED = [
  'Armes, munitions et objets dangereux',
  'Médicaments non autorisés et produits pharmaceutiques sans agrément',
  'Stupéfiants et substances illicites',
  'Contrefaçons, copies de marques et faux documents',
  'Espèces protégées, ivoire et produits d’origine animale interdits',
  'Contenus illégaux, haineux ou portant atteinte à la personne',
  'Données personnelles, comptes et services financiers revendus',
];

export default function PlatformGuidelines() {
  return (
    <InfoPage
      icon={ScrollText}
      title="Règles de la communauté"
      subtitle="Ce que nous attendons des vendeurs, des acheteurs et des créateurs pour garder une place de marché sûre, honnête et transparente en RDC."
    >
      <InfoSection title="Notre engagement">
        <p>
          Nous voulons que chaque commande soit prévisible : produits conformes, prix réels, délais tenus et recours
          possible en cas de problème. Ces règles s'appliquent à tous les comptes, sans exception, et sont appliquées de
          façon progressive et documentée.
        </p>
      </InfoSection>

      <InfoSection title="Règles pour les vendeurs">
        <ul className="space-y-1.5">
          <li>• Publier des produits licites, disponibles et conformes aux photos et descriptions.</li>
          <li>• Afficher un prix total clair, sans frais cachés ajoutés après la commande.</li>
          <li>• Tenir les délais de préparation annoncés et informer en cas de rupture.</li>
          <li>• Répondre aux questions des acheteurs sous 24 h ouvrées.</li>
          <li>• Ne jamais demander à un client de payer en dehors de la plateforme pour contourner la commission.</li>
          <li>• Respecter la décision d'arbitrage en cas de litige.</li>
        </ul>
      </InfoSection>

      <InfoSection title="Produits interdits">
        <div className="flex items-start gap-2">
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <ul className="space-y-1.5">
            {PROHIBITED.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </div>
      </InfoSection>

      <InfoSection title="Règles pour les acheteurs">
        <ul className="space-y-1.5">
          <li>• Fournir un nom, un téléphone et une adresse exacts pour permettre la livraison.</li>
          <li>• Régler la commande ou se présenter au retrait dans les délais convenus.</li>
          <li>• Signaler un problème réel : les fausses déclarations entraînent la suspension du compte.</li>
          <li>• Traiter les vendeurs et livreurs avec respect, y compris lors d'un désaccord.</li>
        </ul>
      </InfoSection>

      <InfoSection title="Règles pour les créateurs affiliés">
        <ul className="space-y-1.5">
          <li>• Annoncer clairement qu'un lien est affilié et ne pas promettre de résultat mensonger.</li>
          <li>• Ne pas créer de faux avis, de fausses commandes ni de trafic artificiel.</li>
          <li>• Ne pas utiliser de contenus d'autrui sans autorisation.</li>
          <li>• Respecter la commission annoncée et les règles de confidentialité sur les données clients.</li>
        </ul>
      </InfoSection>

      <InfoSection title="Protection acheteur">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-1.5">
            <p>• Les fonds d'une vente sont libérés au vendeur après confirmation de la livraison.</p>
            <p>• Un litige ou un retour peut être ouvert dans les 7 jours suivant la réception.</p>
            <p>• L'équipe d'arbitrage répond sous 48 h et peut prononcer remboursement, remplacement ou rejet motivé.</p>
            <p>• Les remboursements sont crédités sur votre portefeuille ou votre compte mobile money.</p>
            <p>
              Détail complet sur la <Link to="/buyer-protection" className="font-semibold text-primary">protection acheteur</Link>.
            </p>
          </div>
        </div>
      </InfoSection>

      <InfoSection title="Sanctions et application">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1.5">
            <p>Selon la gravité et la répétition, nous appliquons :</p>
            <p>1. Un avertissement écrit avec un délai de mise en conformité.</p>
            <p>2. Le retrait des fiches produits concernées.</p>
            <p>3. La suspension temporaire du compte et le gel des retraits en cours d'examen.</p>
            <p>4. La fermeture définitive du compte en cas de fraude, contrefaçon ou danger pour les clients.</p>
          </div>
        </div>
      </InfoSection>

      <InfoSection title="Signaler un problème">
        <p>
          Signalez une fiche, un comportement ou un paiement suspect : chaque signalement est examiné par l'équipe de
          confiance et de sécurité.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/support-tickets" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            <Megaphone className="h-3.5 w-3.5" /> Ouvrir un ticket
          </Link>
          <Link to="/dispute-center" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            Centre de litiges
          </Link>
          <Link to="/seller-application" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            <Store className="h-3.5 w-3.5" /> Devenir vendeur
          </Link>
          <Link to="/terms-of-service" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            <Users className="h-3.5 w-3.5" /> Conditions d'utilisation
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}