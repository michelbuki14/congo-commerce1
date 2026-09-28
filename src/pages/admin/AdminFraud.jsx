import React, { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, ListChecks, SlidersHorizontal, FlaskConical } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import FraudReviewQueue from '@/components/fraud/FraudReviewQueue';
import FraudRuleEditor from '@/components/fraud/FraudRuleEditor';
import FraudRiskSimulator from '@/components/fraud/FraudRiskSimulator';
import { evaluateRisk, loadFraudRules, reviewFraudEvent, saveFraudRule } from '@/lib/fraud';
import { useTranslation } from 'react-i18next';

const TAB_DEFS = [
  { id: 'queue', icon: ListChecks },
  { id: 'rules', icon: SlidersHorizontal },
  { id: 'simulate', icon: FlaskConical },
];

export default function AdminFraud() {
  const { t } = useTranslation();
  const TABS = TAB_DEFS.map((tx) => ({ ...tx, label: t(`adminFraud.tab_${tx.id}`) }));
  const [tab, setTab] = useState('queue');
  const [events, setEvents] = useState([]);
  const [rules, setRules] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [reviewer, setReviewer] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      if (me?.email) setReviewer(me.email);
      const [rows, ruleRows] = await Promise.all([
        base44.entities.FraudEvent.list('-created_date', 100).catch(() => []),
        loadFraudRules(),
      ]);
      setEvents(rows);
      setRules(ruleRows);
      setLoading(false);
    })();
  }, []);

  const handleReview = async (event, status) => {
    setBusyId(event.id);
    try {
      const updated = await reviewFraudEvent(event, status, { reviewer });
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, ...updated } : e)));
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveRule = async (rule) => {
    setSavingId(rule.id || rule.code);
    try {
      const saved = await saveFraudRule(rule);
      setRules((prev) => {
        const exists = prev.some((r) => r.id === saved.id);
        return exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved];
      });
      setDrafts((prev) => ({ ...prev, [saved.id]: {} }));
    } finally {
      setSavingId(null);
    }
  };

  const open = events.filter((e) => ['open', 'reviewing'].includes(e.status));
  const severe = events.filter((e) => ['high', 'critical'].includes(e.risk_level));
  const blocked = events.filter((e) => e.status === 'blocked');
  const cleared = events.filter((e) => e.status === 'cleared');

  if (loading) {
    return (
      <div className="space-y-3 pb-8">
        <div className="h-9 w-64 animate-pulse rounded-full bg-secondary" />
        <div className="h-24 animate-pulse rounded-2xl bg-secondary" />
        <div className="h-64 animate-pulse rounded-2xl bg-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('adminFraud.title')} links={ADMIN_LINKS} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: ListChecks, label: t('adminFraud.kpiQueue'), value: open.length },
          { icon: ShieldAlert, label: t('adminFraud.kpiSevere'), value: severe.length },
          { icon: ShieldCheck, label: t('adminFraud.kpiCleared'), value: cleared.length },
          { icon: ShieldAlert, label: t('adminFraud.kpiBlocked'), value: blocked.length },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3.5">
            <k.icon className="h-4 w-4 text-primary" />
            <p className="mt-1.5 text-lg font-bold">{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((tx) => (
          <button
            key={tx.id}
            type="button"
            onClick={() => setTab(tx.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
              tab === tx.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
            }`}
          >
            <tx.icon className="h-3.5 w-3.5" /> {tx.label}
          </button>
        ))}
      </div>

      {tab === 'queue' && <FraudReviewQueue events={events} busyId={busyId} onReview={handleReview} />}

      {tab === 'rules' && (
        <FraudRuleEditor
          rules={rules}
          drafts={drafts}
          savingId={savingId}
          onDraft={(id, value) => setDrafts((prev) => ({ ...prev, [id]: value }))}
          onSave={handleSaveRule}
        />
      )}

      {tab === 'simulate' && <FraudRiskSimulator onSimulate={evaluateRisk} />}

      <p className="text-[11px] text-muted-foreground">
        {t('adminFraud.footnote')}
      </p>
    </div>
  );
}