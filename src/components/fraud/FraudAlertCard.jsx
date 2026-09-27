import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const LEVEL = { critical: 'bg-red-600 text-white', high: 'bg-red-100 text-red-900', medium: 'bg-amber-100 text-amber-900', low: 'bg-secondary' };

export default function FraudAlertCard({ event: e, onDecide }) {
  const [notes, setNotes] = useState(e.notes || '');
  const [busy, setBusy] = useState(false);
  const decide = async (status) => { setBusy(true); await onDecide(status, notes); setBusy(false); };
  const open = ['open', 'reviewing'].includes(e.status);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-bold uppercase ${LEVEL[e.risk_level]}`}>{e.risk_level} · {e.risk_score}</span>
        <span className="font-bold">{e.order_number || 'Sans commande'}</span>
        <span className="text-muted-foreground">{new Date(e.created_date).toLocaleString('fr-FR')}</span>
        <span className="ml-auto font-semibold">{(e.amount_usd || 0).toFixed(2)} $</span>
      </div>
      <p className="mt-2 text-xs">{e.customer_name || 'Client inconnu'} · {e.customer_phone || '—'} · {e.customer_email || '—'}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {(e.signals || []).map((s, i) => <li key={i} className="rounded-md bg-secondary px-2 py-0.5 text-[11px]">{s.label || s.code} {s.score ? `(+${s.score})` : ''}</li>)}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">Action recommandée : {e.recommended_action === 'block' ? 'bloquer' : 'examiner'} · statut : {e.status}{e.reviewed_by ? ` · revu par ${e.reviewed_by}` : ''}</p>
      {open && (
        <>
          <Textarea className="mt-2 text-xs" rows={2} placeholder="Notes d'examen" value={notes} onChange={(ev) => setNotes(ev.target.value)} />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => decide('cleared')}>Légitime</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => decide('confirmed')}>Fraude confirmée</Button>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => decide('blocked')}>Bloquer</Button>
          </div>
        </>
      )}
    </div>
  );
}