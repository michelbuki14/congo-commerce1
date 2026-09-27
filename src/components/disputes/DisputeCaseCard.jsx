import React, { useState } from 'react';
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

const AUTHOR_LABELS = { admin: 'Médiation', seller: 'Vendeur', customer: 'Client' };

export default function DisputeCaseCard({ dispute, ticket, isAdmin, actor, onChanged, onMessage }) {
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
      setError(e?.message || "L'opération a échoué. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const send = () => run(async () => {
    if (!body.trim()) throw new Error('Écrivez votre message avant de l’envoyer.');
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
  }, isAdmin ? 'Message ajouté au dossier.' : 'Votre proposition est transmise à la médiation.');

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">{dispute.order_number}</p>
          <p className="text-[11px] text-muted-foreground">
            {DISPUTE_TYPES[dispute.type] || dispute.type} · {dispute.customer_name || 'client'}
            {dispute.customer_phone ? ` · ${dispute.customer_phone}` : ''} · {formatDateTime(dispute.created_date)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Vendeur : {dispute.seller_name || 'Congo Commerce'} · {messages.length} message(s) au dossier
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
          <AlertTriangle className="h-3.5 w-3.5" /> Preuve de livraison jointe le {formatDateTime(dispute.proof_uploaded_at)}
          {dispute.proof_uploaded_by ? ` par ${dispute.proof_uploaded_by}` : ''}
        </p>
      ) : null}

      {messages.length ? (
        <div className="mt-3 space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
          {messages.map((m, i) => (
            <div key={`${m.at || i}-${i}`} className="text-xs">
              <p className="font-semibold">
                {AUTHOR_LABELS[m.author] || m.author || 'Message'}
                {m.author_name ? ` · ${m.author_name}` : ''}
                <span className="ml-2 font-normal text-muted-foreground">{formatDateTime(m.at)}</span>
              </p>
              {m.resolution ? (
                <p className="text-[11px] font-semibold text-primary">Proposition : {RESOLUTION_LABELS[m.resolution] || m.resolution}</p>
              ) : null}
              <p className="text-muted-foreground">{m.body}</p>
              {m.attachment_name ? (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Paperclip className="h-3 w-3" /> {m.attachment_name} (pièce privée, visible par la médiation)
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
          <MessageSquare className="h-3.5 w-3.5" /> {open ? 'Fermer le dossier' : 'Communiquer & traiter'}
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
              }), `Remboursement de ${formatUSD(dispute.amount_usd)} exécuté.`)}
              className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
            >
              <Banknote className="h-3.5 w-3.5" /> Rembourser {formatUSD(dispute.amount_usd)}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => approveReplacement({ dispute, note, reviewer: actor }), 'Remplacement approuvé, le vendeur est notifié.')}
              className="flex items-center gap-1.5 rounded-full bg-sky-100 px-3.5 py-1.5 text-xs font-semibold text-sky-900 disabled:opacity-50"
            >
              <PackageCheck className="h-3.5 w-3.5" /> Remplacement
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => rejectClaim({ dispute, note, reviewer: actor }), 'Demande rejetée, le client est informé.')}
              className="flex items-center gap-1.5 rounded-full bg-red-100 px-3.5 py-1.5 text-xs font-semibold text-red-900 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Rejeter
            </button>
          </>
        ) : null}
        {isAdmin && isOpen && dispute.status !== 'investigating' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => setDisputeStatus({ dispute, status: 'investigating', note, reviewer: actor }), 'Dossier mis en enquête.')}
            className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Mettre en enquête
          </button>
        ) : null}
        {isAdmin && !isOpen ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => setDisputeStatus({ dispute, status: 'open', note, reviewer: actor }), 'Dossier rouvert.')}
            className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Rouvrir
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
              ? 'Réponse au client ou au vendeur : décision, pièces demandées, étapes suivantes…'
              : 'Votre version des faits, votre proposition de résolution, le suivi d’expédition…'}
            className="w-full rounded-xl border border-input bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          {!isAdmin ? (
            <label className="block text-[11px] font-semibold">
              Résolution proposée
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-card px-2 text-xs"
              >
                {RESOLUTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </label>
          ) : null}
          {isAdmin ? (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Décision et notes d'arbitrage (enregistrées avec le litige)"
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-xs"
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold">
              <Paperclip className="h-3.5 w-3.5" /> {file ? file.name : 'Joindre une pièce'}
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={send}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> {busy ? 'Envoi…' : 'Envoyer'}
            </button>
            {isAdmin ? <DisputeProofUpload dispute={dispute} onUploaded={onChanged} /> : null}
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {isAdmin
              ? 'Le dossier est journalisé : chaque décision est tracée dans le journal de sécurité.'
              : 'Vos pièces sont stockées en privé et ne sont visibles que par l’équipe de médiation.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}