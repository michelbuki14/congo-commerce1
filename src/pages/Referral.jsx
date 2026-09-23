import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, MousePointerClick, ShoppingBag, Coins, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getReferralCode, setReferralCode, getSessionId } from '@/lib/session';
import { useCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/format';

export default function Referral() {
  const { format } = useCurrency();
  const [code, setCode] = useState(getReferralCode());
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');
  const [clicks, setClicks] = useState([]);
  const [creator, setCreator] = useState(null);

  const loadClicks = async (referralCode) => {
    if (!referralCode) return;
    const rows = await base44.entities.AffiliateClick.filter({ session_id: getSessionId(), referral_code: referralCode }, '-created_date', 30).catch(() => []);
    setClicks(rows);
  };

  useEffect(() => {
    (async () => {
      if (code) {
        await loadClicks(code);
        const rows = await base44.entities.Creator.filter({ referral_code: code }).catch(() => []);
        setCreator(rows[0] || null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activate = async () => {
    const value = input.trim().toUpperCase();
    if (!value) return;
    const rows = await base44.entities.Creator.filter({ referral_code: value }).catch(() => []);
    const found = rows[0];
    if (!found) {
      setMessage("Ce code n'existe pas. Vérifiez auprès du créateur.");
      return;
    }
    setReferralCode(value);
    setCode(value);
    setCreator(found);
    await loadClicks(value);
    setMessage(`Code ${value} activé — ${found.name} sera crédité sur vos achats.`);
  };

  const conversions = clicks.filter((c) => c.converted);
  const earned = conversions.reduce((s, c) => s + (c.commission_usd || 0), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">Parrainage & commissions</h1>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Gift className="h-4 w-4 text-primary" /> J'ai un code créateur
        </h2>
        <p className="text-xs text-muted-foreground">
          Activez le code d'un créateur pour soutenir sa boutique. Le suivi d'attribution est enregistré sur cet appareil.
        </p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="Ex : NADIA10"
            className="h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm uppercase"
          />
          <button type="button" onClick={activate} className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
            Activer
          </button>
        </div>
        {message && <p className="text-xs text-primary">{message}</p>}
        {code && (
          <p className="text-xs text-muted-foreground">
            Code actif : <span className="font-bold text-foreground">{code}</span>
            {creator ? ` · ${creator.name}` : ''}
          </p>
        )}
      </section>

      {!!clicks.length && (
        <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold">Mon activité d'affiliation</h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-secondary/60 p-3">
              <MousePointerClick className="h-4 w-4 text-primary" />
              <p className="mt-1 text-lg font-bold">{clicks.length}</p>
              <p className="text-[11px] text-muted-foreground">Clics suivis</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <p className="mt-1 text-lg font-bold">{conversions.length}</p>
              <p className="text-[11px] text-muted-foreground">Conversions</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <Coins className="h-4 w-4 text-primary" />
              <p className="mt-1 text-lg font-bold">{format(earned)}</p>
              <p className="text-[11px] text-muted-foreground">Commissions générées</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {clicks.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                <span>{c.converted ? `Commande ${c.order_number}` : 'Visite produit'}</span>
                <span className="text-muted-foreground">{formatDate(c.created_date)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2 rounded-2xl border border-primary/25 bg-primary/5 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="h-4 w-4 text-primary" /> Devenir créateur
        </h2>
        <p className="text-xs text-muted-foreground">
          Publiez des vidéos produits, obtenez un lien de suivi et touchez une commission sur chaque vente.
        </p>
        <Link to="/creator" className="inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Ouvrir l'espace créateur
        </Link>
      </section>
    </div>
  );
}