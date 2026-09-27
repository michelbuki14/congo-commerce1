import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, LifeBuoy, ShieldCheck } from 'lucide-react';
import { getCompanyConfig, loadPlatformConfig } from '@/lib/config';

export default function Contact() {
  const [company, setCompany] = useState(getCompanyConfig());

  useEffect(() => {
    loadPlatformConfig().then((cfg) => setCompany(cfg.company));
  }, []);

  const email = company.email || 'contact@congo-commerce.cd';

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="font-heading text-2xl font-bold md:text-3xl">Contact</h1>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Une question sur une commande, un produit, votre boutique ou votre partenariat ? Notre équipe vous répond
        du lundi au samedi.
      </p>

      <div className="space-y-2">
        <a
          href={`mailto:${email}`}
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-secondary"
        >
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <span>
            <span className="block text-sm font-semibold">Écrire un e-mail</span>
            <span className="block text-xs text-muted-foreground">{email}</span>
          </span>
        </a>

        <Link
          to="/support"
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-secondary"
        >
          <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <span>
            <span className="block text-sm font-semibold">Centre d'aide</span>
            <span className="block text-xs text-muted-foreground">
              Suivi de commande, retours, litiges et questions fréquentes.
            </span>
          </span>
        </Link>

        <Link
          to="/confidentialite"
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-secondary"
        >
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <span>
            <span className="block text-sm font-semibold">Droits sur vos données</span>
            <span className="block text-xs text-muted-foreground">
              Demander l'accès, la rectification ou la suppression de vos données.
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}