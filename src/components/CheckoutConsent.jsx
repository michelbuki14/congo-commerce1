import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function CheckoutConsent({ value, onChange }) {
  return (
    <section className="space-y-2.5 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <ShieldCheck className="h-4 w-4 text-primary" /> Vos données et vos droits
      </h2>
      <label className="flex items-start gap-2.5 text-xs">
        <input
          type="checkbox"
          checked={value.terms}
          onChange={(e) => onChange({ ...value, terms: e.target.checked })}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="text-muted-foreground">
          J'accepte les{' '}
          <Link to="/cgv" className="font-semibold text-primary">
            conditions générales de vente
          </Link>{' '}
          et je consens au traitement de mes données pour le traitement de ma commande, conformément à la{' '}
          <Link to="/confidentialite" className="font-semibold text-primary">
            politique de confidentialité
          </Link>
          . <span className="font-bold text-destructive">*</span>
        </span>
      </label>
      <label className="flex items-start gap-2.5 text-xs">
        <input
          type="checkbox"
          checked={value.marketing}
          onChange={(e) => onChange({ ...value, marketing: e.target.checked })}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="text-muted-foreground">
          J'accepte de recevoir les offres et nouveautés par SMS ou email. Facultatif — vous pouvez retirer votre
          accord à tout moment.
        </span>
      </label>
    </section>
  );
}