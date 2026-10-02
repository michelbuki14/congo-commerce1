import React, { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';

const LEVEL = { critical: 'bg-red-600 text-white', high: 'bg-red-100 text-red-900', medium: 'bg-amber-100 text-amber-900', low: 'bg-secondary' };

export default memo(function FraudAlertCard({ event: e, onDecide }) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState(e.notes || '');
  const [busy, setBusy] = useState(false);
  const decide = async (status) => { setBusy(true); await onDecide(status, notes); setBusy(false); };
  const open = ['open', 'reviewing'].includes(e.status);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-bold uppercase ${LEVEL[e.risk_level]}`}>{e.risk_level} · {e.risk_score}</span>
        <span className="font-bold">{e.order_number || t('fraudAlertCard.noOrder')}</span>
        <span className="text-muted-foreground">{new Date(e.created_date).toLocaleString('fr-FR')}</span>
        <span className="ml-auto font-semibold">{(e.amount_usd || 0).toFixed(2)} $</span>
      </div>
      <p className="mt-2 text-xs">{e.customer_name || t('fraudAlertCard.unknownCustomer')} · {e.customer_phone || '—'} · {e.customer_email || '—'}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {(e.signals || []).map((s, i) => <li key={i} className="rounded-md bg-secondary px-2 py-0.5 text-[11px]">{s.label || s.code} {s.score ? `(+${s.score})` : ''}</li>)}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">{t('fraudAlertCard.recommended', { action: e.recommended_action === 'block' ? t('fraudAlertCard.block') : t('fraudAlertCard.review'), status: e.status })}{e.reviewed_by ? t('fraudAlertCard.reviewedBy', { by: e.reviewed_by }) : ''}</p>
      {open && (
        <>
          <Textarea className="mt-2 text-xs" rows={2} placeholder={t('fraudAlertCard.notesPlaceholder')} value={notes} onChange={(ev) => setNotes(ev.target.value)} />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => decide('cleared')}>{t('fraudAlertCard.legit')}</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => decide('confirmed')}>{t('fraudAlertCard.confirmed')}</Button>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => decide('blocked')}>{t('fraudAlertCard.blockAction')}</Button>
          </div>
        </>
      )}
    </div>
  );
});