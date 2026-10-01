import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gavel } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import DisputeCaseCard from '@/components/disputes/DisputeCaseCard';
import { OPEN_STATUSES, threadFor } from '@/lib/disputeResolution';
import { fetchSellerDisputes, fetchSellerThreads } from '@/lib/customerAccount';
import { formatUSD } from '@/lib/format';

export default function DisputeResolution() {
  const { t } = useTranslation();
  const TABS = [
    { id: 'open', label: t('disputeResolution.tabOpen') },
    { id: 'resolved', label: t('disputeResolution.tabResolved') },
    { id: 'all', label: t('disputeResolution.tabAll') },
  ];
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [actor, setActor] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('open');

  const isAdmin = String(actor?.role || '') === 'admin';

  useEffect(() => {
    base44.auth.me().then(setActor).catch(() => setActor(null));
  }, []);

  const load = useCallback(async () => {
    if (!actor) return;
    const [cases, threads] = await Promise.all([
      isAdmin
        ? base44.entities.Dispute.list('-created_date', 100).catch(() => [])
        : fetchSellerDisputes(),
      isAdmin
        ? base44.entities.SupportTicket.list('-created_date', 100).catch(() => [])
        : fetchSellerThreads(),
    ]);
    setDisputes(cases);
    setTickets(threads);
    setLoading(false);
  }, [actor, isAdmin, seller]);

  useEffect(() => {
    load();
  }, [load]);

  const mergeTicket = (ticket) => {
    setTickets((prev) => (prev.some((tx) => tx.id === ticket.id) ? prev.map((tx) => (tx.id === ticket.id ? ticket : tx)) : [ticket, ...prev]));
  };

  const open = disputes.filter((d) => OPEN_STATUSES.includes(String(d.status || '')));
  const atStake = open.reduce((sum, d) => sum + (Number(d.amount_usd) || 0), 0);
  const awaiting = open.filter((d) => !threadFor(tickets, d)).length;
  const visible = disputes.filter((d) => {
    const isOpen = OPEN_STATUSES.includes(String(d.status || ''));
    if (tab === 'open') return isOpen;
    if (tab === 'resolved') return !isOpen;
    return true;
  });

  if (loadingSeller || loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title={t('disputeResolution.title')}
        subtitle={isAdmin
          ? t('disputeResolution.subtitleAdmin')
          : t('disputeResolution.subtitleSeller')}
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label={t('disputeResolution.statOpen')} value={open.length} tone={open.length ? 'warn' : 'good'} />
        <StatCard label={t('disputeResolution.statStake')} value={formatUSD(atStake)} hint={t('disputeResolution.hintOpenCases')} />
        <StatCard label={t('disputeResolution.statAwaiting')} value={awaiting} hint={t('disputeResolution.hintNoThread')} tone={awaiting ? 'warn' : 'good'} />
        <StatCard label={t('disputeResolution.statResolved')} value={disputes.length - open.length} hint={t('disputeResolution.hintHistory')} />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tx) => (
          <button
            key={tx.id}
            type="button"
            onClick={() => setTab(tx.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === tx.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            {tx.label}
          </button>
        ))}
      </div>

      {!isAdmin ? (
        <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
          {t('disputeResolution.sellerNotice')}
        </p>
      ) : null}

      {visible.length ? (
        <div className="space-y-2.5">
          {visible.map((d) => (
            <DisputeCaseCard
              key={d.id}
              dispute={d}
              ticket={threadFor(tickets, d)}
              isAdmin={isAdmin}
              actor={actor}
              onChanged={load}
              onMessage={mergeTicket}
            />
          ))}
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          <Gavel className="h-4 w-4" /> {t('disputeResolution.emptyFilter')}
        </p>
      )}
    </div>
  );
}