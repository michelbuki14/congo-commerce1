import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Banknote, MessageSquare, PackageCheck, Paperclip, Send, ShieldCheck, X } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DisputeProofUpload from '@/components/disputes/DisputeProofUpload';
import { formatUSD, formatDateTime } from '@/lib/format';
import {
  DISPUTE_TYPES,
  OPEN_STATUSES,
  RESOLUTIONS,
  RESOLUTION_LABELS,
  approveReplacement,
  refundCustomer,
  rejectClaim,
  sendCaseMessage,
  setDisputeStatus,
} from '@/lib/disputeResolution';

const AUTHOR_KEYS = { admin: 'disputeCase.mediation', seller: 'disputeCase.seller', customer: 'disputeCase.customer' };

export default memo(function DisputeCaseCard({ dispute, ticket, isAdmin, actor, onChanged, onMessage }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [resolution, setResolution] = useState('refund');
  const [file, setFile] = useState(null);
  const [note, setNote] = useState(dispute.admin_notes || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isOpen = OPEN_STATUSES.includes(String(dispute.status || ''));
  const messages = ticket?.messages || [];

  const run = async (action, successMessage) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
      await onChanged();
    } catch (e) {
      setError(e?.message || t('disputeCase.opFailed'));
    } finally {
      setBusy(false);
    }
  };

  const send = () => run(async () => {
    if (!body.trim()) throw new Error(t('disputeCase.writeFirst'));
    const created = await sendCaseMessage({
      dispute,
      ticket,
      body: body.trim(),
      file,
      author: isAdmin ? 'admin' : 'seller',
      actorName: actor?.name || actor?.email || '',
      resolution: isAdmin ? '' : resolution,
    });
    setBody('');
    setFile(null);
    onMessage(created);
  }, isAdmin ? t('disputeCase.msgAdded') : t('disputeCase.proposalSent'));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">{dispute.order_number}</p>
          <p className="text-[11px] text-muted-foreground">
            {t(DISPUTE_TYPES[dispute.type] || 'disputeType.unknown')} · {dispute.customer_name || t('disputeCase.customerFallback')}
            {dispute.customer_phone ? ` · ${dispute.customer_phone}` : ''} · {formatDateTime(dispute.created_date)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t('disputeCase.sellerLine', { name: dispute.seller_name || 'Congo Commerce', count: messages.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={dispute.priority} />
          <StatusBadge status={dispute.status} />
          <span className="text-sm font-bold">{formatUSD(dispute.amount_usd)}</span>
        </div>
      </div>

      {dispute.description ? (
        <p className="mt-2 rounded-lg bg-secondary/50 p-2.5 text-xs">{dispute.description}</p>
      ) : null}

      {dispute.proof_of_delivery ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700">
          <AlertTriangle className="h-3.5 w-3.5" /> {t('disputeCase.proofAttached', { date: formatDateTime(dispute.proof_uploaded_at) })}
          {dispute.proof_uploaded_by ? t('disputeCase.proofBy', { by: dispute.proof_uploaded_by }) : ''}
        </p>
      ) : null}

      {messages.length ? (
        <div className="mt-3 space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
          {messages.map((m, i) => (
            <div key={`${m.at || i}-${i}`} className="text-xs">
              <p className="font-semibold">
                {m.author ? t(AUTHOR_KEYS[m.author] || 'disputeCase.customer') : ''}
                {m.author_name ? ` · ${m.author_name}` : ''}
                <span className="ml-2 font-normal text-muted-foreground">{formatDateTime(m.at)}</span>
              </p>
              {m.resolution ? (
                <p className="text-[11px] font-semibold text-primary">{t('disputeCase.proposal', { text: RESOLUTION_LABELS[m.resolution] ? t(RESOLUTION_LABELS[m.resolution]) : m.resolution })}</p>
              ) : null}
              <p className="text-muted-foreground">{m.body}</p>
              {m.attachment_name ? (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Paperclip className="h-3 w-3" /> {m.attachment_name} {t('disputeCase.privateAttachment')}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {notice ? <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{notice}</p> : null}
      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-900">{error}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => { setOpen(!open); setError(''); }}
          className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold"
        >
          <MessageSquare className="h-3.5 w-3.5" /> {open ? t('disputeCase.closeCase') : t('disputeCase.openThread')}
        </button>
        {isAdmin && isOpen ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => refundCustomer({
                dispute,
                amount: dispute.amount_usd,
                note,
                reviewer: actor,
              }), t('disputeCase.refundDone', { amount: formatUSD(dispute.amount_usd) }))}
              className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
            >
              <Banknote className="h-3.5 w-3.5" /> {t('disputeCase.refundAction', { amount: formatUSD(dispute.amount_usd) })}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => approveReplacement({ dispute, note, reviewer: actor }), t('disputeCase.replacementDone'))}
              className="flex items-center gap-1.5 rounded-full bg-sky-100 px-3.5 py-1.5 text-xs font-semibold text-sky-900 disabled:opacity-50"
            >
              <PackageCheck className="h-3.5 w-3.5" /> {t('disputeCase.replacementAction')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => rejectClaim({ dispute, note, reviewer: actor }), t('disputeCase.rejectDone'))}
              className="flex items-center gap-1.5 rounded-full bg-red-100 px-3.5 py-1.5 text-xs font-semibold text-red-900 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> {t('disputeCase.rejectAction')}
            </button>
          </>
        ) : null}
        {isAdmin && isOpen && dispute.status !== 'investigating' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => setDisputeStatus({ dispute, status: 'investigating', note, reviewer: actor }), t('disputeCase.investigatingDone'))}
            className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {t('disputeCase.investigateAction')}
          </button>
        ) : null}
        {isAdmin && !isOpen ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => setDisputeStatus({ dispute, status: 'open', note, reviewer: actor }), t('disputeCase.reopenedDone'))}
            className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {t('disputeCase.reopenAction')}
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-3 space-y-2.5 rounded-xl bg-secondary/50 p-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder={isAdmin
              ? t('disputeCase.adminReplyPh')
              : t('disputeCase.sellerReplyPh')}
            className="w-full rounded-xl border border-input bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          {!isAdmin ? (
            <label className="block text-[11px] font-semibold">
              {t('disputeCase.proposedResolution')}
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-card px-2 text-xs"
              >
                {RESOLUTIONS.map((r) => <option key={r.id} value={r.id}>{t(r.labelKey)}</option>)}
              </select>
            </label>
          ) : null}
          {isAdmin ? (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('disputeCase.notePh')}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs"
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold">
              <Paperclip className="h-3.5 w-3.5" /> {file ? file.name : t('disputeCase.attachFile')}
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={send}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> {busy ? t('common.sending') : t('common.send')}
            </button>
            {isAdmin ? <DisputeProofUpload dispute={dispute} onUploaded={onChanged} /> : null}
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {isAdmin
              ? t('disputeCase.loggedNote')
              : t('disputeCase.privateNote')}
          </p>
        </div>
      ) : null}
    </div>
  );
});