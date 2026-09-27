import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Gavel, RotateCcw } from 'lucide-react';
import DisputePanel from '@/components/disputes/DisputePanel';
import RefundPanel from '@/components/disputes/RefundPanel';

const TABS = [
  { id: 'disputes', label: 'Litiges', icon: Gavel },
  { id: 'refunds', label: 'Remboursements', icon: RotateCcw },
];

export default function DisputeCenter() {
  const [tab, setTab] = useState('disputes');

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">Centre de litiges</h1>

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Ouvrez un dossier ici si un colis n'arrive pas, arrive abîmé ou ne correspond pas à la description. Notre équipe
          arbitre entre vous et le vendeur : remboursement sur votre portefeuille, remplacement ou renvoi selon la décision.
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold ${
              tab === t.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'disputes' ? <DisputePanel /> : <RefundPanel />}

      <p className="text-[11px] text-muted-foreground">
        Besoin d'aide pour constituer votre dossier ? Consultez la{' '}
        <Link to="/buyer-protection" className="font-semibold text-primary">protection acheteur</Link> ou écrivez-nous depuis{' '}
        <Link to="/support-tickets" className="font-semibold text-primary">mes tickets support</Link>.
      </p>
    </div>
  );
}