import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, MousePointerClick, ShoppingBag, Coins, Share2, BadgeCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import { useCurrency } from '@/lib/currency';

const STEPS = [
  { title: '1. Rejoignez le programme', text: 'Créez votre compte créateur et recevez un code de parrainage unique.' },
  { title: '2. Partagez votre code', text: 'Publiez vos vidéos produits sur WhatsApp, Instagram ou TikTok en y joignant votre code.' },
  { title: '3. Touchez vos commissions', text: 'Chaque commande passée avec votre code vous crédite une commission dans votre portefeuille.' },
];

export default function ReferralProgram() {
  const { format } = useCurrency();
  const [creator, setCreator] = useState(null);
  const [stats, setStats] = useState({ clicks: 0, conversions: 0, earned: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      if (me?.email) {
        const rows = await base44.entities.Creator.filter({ email: me.email }).catch(() => []);
        const found = rows[0] || null;
        setCreator(found);
        if (found) {
          const clicks = await base44.entities.AffiliateClick.filter({ creator_id: found.id }, '-created_date', 200).catch(() => []);
          setStats({
            clicks: clicks.length,
            conversions: clicks.filter((c) => c.converted).length,
            earned: clicks.reduce((s, c) => s + (Number(c.commission_usd) || 0), 0),
          });
        }
      }
      setLoading(false);
    })();
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(creator.referral_code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <InfoPage
      icon={Gift}
      title="Programme de parrainage"
      subtitle="Partagez votre code, faites découvrir les produits de la marketplace et touchez une commission sur chaque vente attribuée."
    >
      <InfoSection title="Comment ça marche">
        <div className="space-y-2">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-foreground">{s.title}</p>
              <p className="mt-1">{s.text}</p>
            </div>
          ))}
        </div>
      </InfoSection>

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
      ) : creator ? (
        <InfoSection title="Mes performances">
          <div className="flex flex-wrap items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">{creator.name}</span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold">{creator.referral_code}</span>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-foreground"
            >
              <Share2 className="h-3.5 w-3.5" /> {copied ? 'Code copié' : 'Copier le code'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="rounded-xl bg-secondary/60 p-3">
              <MousePointerClick className="h-4 w-4 text-primary" />
              <p className="mt-1 text-lg font-bold text-foreground">{stats.clicks}</p>
              <p className="text-[11px]">Clics attribués</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <p className="mt-1 text-lg font-bold text-foreground">{stats.conversions}</p>
              <p className="text-[11px]">Ventes converties</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <Coins className="h-4 w-4 text-primary" />
              <p className="mt-1 text-lg font-bold text-foreground">{format(stats.earned)}</p>
              <p className="text-[11px]">Commissions</p>
            </div>
          </div>
          <p className="pt-1">
            Taux de commission par défaut : {creator.commission_rate || 8} % du montant de la commande. Les commissions
            sont créditées après confirmation de la livraison, puis retirables par mobile money.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link to="/creator" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              Espace créateur
            </Link>
            <Link to="/payout-requests" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
              Retirer mes commissions
            </Link>
          </div>
        </InfoSection>
      ) : (
        <InfoSection title="Devenir créateur affilié">
          <p>
            Aucun compte créateur n’est encore relié à votre adresse e-mail. Créez votre espace pour obtenir un code,
            publier vos contenus et suivre vos commissions en temps réel.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link to="/creator" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              Rejoindre le programme
            </Link>
            <Link to="/referral" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
              J’ai un code créateur
            </Link>
          </div>
        </InfoSection>
      )}

      <InfoSection title="Bon à savoir">
        <ul className="space-y-1.5">
          <li>• L’attribution est enregistrée sur l’appareil de l’acheteur pendant 30 jours après le premier clic.</li>
          <li>• Les commandes annulées ou remboursées ne génèrent pas de commission.</li>
          <li>• Le suivi est automatique : aucune déclaration manuelle n’est nécessaire.</li>
        </ul>
        <Link to="/creator-showcase" className="inline-block rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
          Voir les créateurs à l’honneur
        </Link>
      </InfoSection>
    </InfoPage>
  );
}