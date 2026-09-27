import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Trash2 } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import { Switch } from '@/components/ui/switch';
import { getPrivacyPreferences, savePrivacyPreferences, clearLocalSession } from '@/lib/session';

const TOGGLES = [
  {
    key: 'personalized_tracking',
    label: 'Recommandations personnalisées',
    text: 'Utiliser mon historique de navigation et mes commandes pour adapter les produits mis en avant.',
  },
  {
    key: 'anonymous_analytics',
    label: 'Statistiques d’usage anonymes',
    text: 'Enregistrer des événements de navigation (ajout au panier, paiement entamé) pour mesurer la qualité du service.',
  },
  {
    key: 'share_with_partners',
    label: 'Partage avec les vendeurs',
    text: 'Transmettre au vendeur concerné les informations nécessaires au traitement de ma commande.',
  },
  {
    key: 'marketing_emails',
    label: 'Offres et nouveautés',
    text: 'Recevoir par e-mail ou SMS les promotions, ventes flash et arrivages de mes boutiques suivies.',
  },
];

export default function PrivacySettings() {
  const [prefs, setPrefs] = useState(getPrivacyPreferences());
  const [cleared, setCleared] = useState(false);

  const update = (key, value) => setPrefs(savePrivacyPreferences({ [key]: value }));

  return (
    <InfoPage
      icon={ShieldCheck}
      title="Paramètres de confidentialité"
      subtitle="Choisissez ce que vous partagez avec Congo Commerce et nos partenaires. Vos choix s’appliquent immédiatement sur cet appareil."
    >
      <InfoSection title="Préférences">
        <div className="space-y-2">
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <p className="text-xs font-semibold text-foreground">{t.label}</p>
                <p className="mt-1">{t.text}</p>
              </div>
              <Switch
                checked={!!prefs[t.key]}
                onCheckedChange={(value) => update(t.key, value)}
                aria-label={t.label}
              />
            </div>
          ))}
        </div>
        <p className="pt-1">
          Désactiver les statistiques d’usage n’empêche pas le fonctionnement de la boutique : seules les mesures
          anonymes cessent d’être enregistrées.
        </p>
      </InfoSection>

      <InfoSection title="Données stockées sur cet appareil">
        <p>
          Panier, favoris, boutiques suivies, historique de commande et préférences sont conservés localement pour
          accélérer la navigation. Vous pouvez les effacer à tout moment.
        </p>
        {cleared ? (
          <p className="text-emerald-600">Données locales effacées. Les préférences ont été réinitialisées.</p>
        ) : (
          <button
            type="button"
            onClick={() => {
              clearLocalSession();
              setPrefs(getPrivacyPreferences());
              setCleared(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-destructive px-4 py-2 text-xs font-semibold text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Effacer les données de cet appareil
          </button>
        )}
      </InfoSection>

      <InfoSection title="Vos droits">
        <p>
          Vous pouvez demander l’accès, la rectification, la suppression ou la limitation du traitement de vos données
          personnelles à tout moment depuis la page Confidentialité &amp; données.
        </p>
        <Link
          to="/confidentialite"
          className="inline-block rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground"
        >
          Exercer mes droits
        </Link>
      </InfoSection>
    </InfoPage>
  );
}