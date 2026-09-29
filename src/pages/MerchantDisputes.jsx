import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquareWarning, Paperclip, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import { fetchSellerDisputes } from '@/lib/customerAccount';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { formatUSD } from '@/lib/format';

const OPEN_STATUSES = ['open', 'investigating', 'escalated'];

export default function MerchantDisputes() {
  const { t } = useTranslation();
  const TYPE_LABELS = {
    not_received: t('merchantDisputes.typeNotReceived'),
    wrong_product: t('merchantDisputes.typeWrongProduct'),
    damaged: t('merchantDisputes.typeDamaged'),
    not_as_described: t('merchantDisputes.typeNotAsDescribed'),
    missing_item: t('merchantDisputes.typeMissingItem'),
    payment_issue: t('merchantDisputes.typePaymentIssue'),
  };
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [user, setUser] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState('');
  const [reply, setReply] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!seller && !user) return;
    Promise.all([
      seller ? fetchSellerDisputes() : [],
      user ? base44.entities.Dispute.filter({ tenant_owner_email: user.email }, '-created_date', 100).catch(() => []) : [],
      base44.entities.SupportTicket.list('-created_date', 100).catch(() => []),
    ])
      .then(([byName, byTenant, threads]) => {
        const merged = [...byName, ...byTenant].reduce((acc, d) => (acc.some((x) => x.id === d.id) ? acc : [...acc, d]), []);
        setDisputes(merged);
        setTickets(threads);
      })
      .finally(() => setLoading(false));
  }, [seller, user]);

  const responseFor = (dispute) => tickets.find((tx) => String(tx.subject || '').includes(dispute.order_number));

  const open = disputes.filter((d) => OPEN_STATUSES.includes(String(d.status || '')));

  const send = async (dispute) => {
    if (!reply.trim()) {
      setError(t('merchantDisputes.replyRequired'));
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      let fileUri = '';
      if (file) {
        const uploaded = await base44.integrations.Core.UploadPrivateFile({ file });
        fileUri = uploaded.file_uri;
      }
      const ticket = await base44.entities.SupportTicket.create({
        ticket_number: `MED-${Date.now().toString(36).toUpperCase()}`,
        subject: `Réponse vendeur — litige ${dispute.order_number}`,
        category: 'order',
        status: 'open',
        priority: 'high',
        order_number: dispute.order_number,
        customer_name: dispute.customer_name || '',
        customer_phone: dispute.customer_phone || '',
        assigned_to: 'mediation',
        messages: [{
          author: 'seller',
          body: `${seller?.name ? `${seller.name} — ` : ''}${reply.trim()}`,
          at: new Date().toISOString(),
          file_uri: fileUri || undefined,
          attachment_name: file?.name || undefined,
        }],
      });
      setTickets((prev) => [ticket, ...prev]);
      setReply('');
      setFile(null);
      setOpenId('');
      setNotice(t('merchantDisputes.replySent', { number: dispute.order_number }));
    } catch (e) {
      setError(e?.message || t('merchantDisputes.sendFailed'));
    } finally {
      setBusy(false);
    }
  };

  const totals = useMemo(() => ({
    amount: open.reduce((sum, d) => sum + (Number(d.amount_usd) || 0), 0),
    awaiting: disputes.filter((d) => !responseFor(d)).length,
  }), [disputes, tickets]);

  if (loadingSeller || loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title={t('merchantDisputes.title')}
        subtitle={t('merchantDisputes.subtitle')}
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label={t('merchantDisputes.statOpen')} value={open.length} tone={open.length ? 'warn' : 'good'} />
        <StatCard label={t('merchantDisputes.statStake')} value={formatUSD(totals.amount)} hint={t('merchantDisputes.hintOngoing')} />
        <StatCard label={t('merchantDisputes.statAwaiting')} value={totals.awaiting} hint={t('merchantDisputes.hintYourTurn')} tone={totals.awaiting ? 'warn' : 'good'} />
        <StatCard label={t('merchantDisputes.statTotal')} value={disputes.length} hint={t('merchantDisputes.hintHistory')} />
      </div>

      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-900">{notice}</p> : null}

      {disputes.length ? (
        <div className="space-y-2.5">
          {disputes.map((d) => {
            const response = responseFor(d);
            const isOpen = openId === d.id;
            return (
              <div key={d.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{d.order_number}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {TYPE_LABELS[d.type] || d.type} · {d.customer_name || t('merchantDisputes.customerFallback')} · {formatUSD(d.amount_usd)} · {t('merchantDisputes.openedOn', { date: new Date(d.created_date).toLocaleDateString('fr-FR') })}
                    </p>
                    {d.description ? <p className="mt-1.5 max-w-2xl text-xs text-muted-foreground">{d.description}</p> : null}
                  </div>
                  <StatusBadge status={String(d.status || '').toUpperCase()} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {response ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-900">
                      {t('merchantDisputes.responseSent', { ticket: response.ticket_number })}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-900">
                      {t('merchantDisputes.awaitingYou')}
                    </span>
                  )}
                  {d.proof_of_delivery ? (
                    <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold">{t('merchantDisputes.proofOnFile')}</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => { setOpenId(isOpen ? '' : d.id); setReply(''); setFile(null); setError(''); }}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[11px] font-semibold"
                  >
                    <MessageSquareWarning className="h-3.5 w-3.5" /> {isOpen ? t('merchantDisputes.close') : t('merchantDisputes.replyProof')}
                  </button>
                </div>

                {isOpen ? (
                  <div className="mt-3 space-y-2.5 rounded-xl bg-secondary/50 p-3">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={3}
                      placeholder={t('merchantDisputes.replyPlaceholder')}
                      className="w-full rounded-xl border border-input bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold">
                        <Paperclip className="h-3.5 w-3.5" /> {file ? file.name : t('merchantDisputes.attachProof')}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => send(d)}
                        className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" /> {busy ? t('merchantDisputes.sending') : t('merchantDisputes.sendToMediation')}
                      </button>
                      {error ? <span className="text-[11px] text-destructive">{error}</span> : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {t('merchantDisputes.privacyNote')}
                    </p>
                  </div>
                ) : null}

                {d.admin_notes ? (
                  <p className="mt-3 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
                    {t('merchantDisputes.mediationNote', { notes: d.admin_notes })}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          {t('merchantDisputes.emptyText')}
        </p>
      )}
    </div>
  );
}