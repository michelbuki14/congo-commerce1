import React, { useState } from 'react';
import { Loader2, ShieldQuestion } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FIELD_DEFS = [
  { key: 'amount_usd', placeholder: '500' },
  { key: 'customer_phone', placeholder: '+243…' },
  { key: 'customer_email', placeholder: 'client@exemple.cd' },
  { key: 'session_id', placeholder: 'sess-…' },
  { key: 'coupon_code', placeholder: 'PROMO10' },
  { key: 'affiliate_code', placeholder: 'AFF-…' },
];

export default function FraudRiskSimulator({ onSimulate }) {
  const { t } = useTranslation();
  const FIELDS = FIELD_DEFS.map((f) => ({ ...f, label: t(`fraudRiskSimulator.field_${f.key}`) }));
  const [form, setForm] = useState({ amount_usd: '', customer_phone: '', customer_email: '', session_id: '', coupon_code: '', affiliate_code: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      setResult(
        await onSimulate({
          amountUsd: Number(form.amount_usd) || 0,
          phone: form.customer_phone,
          sessionId: form.session_id,
          couponCode: form.coupon_code,
          affiliateCode: form.affiliate_code,
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <ShieldQuestion className="h-4 w-4 text-primary" /> {t('fraudRiskSimulator.title')}
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t('fraudRiskSimulator.subtitle')}
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="text-[11px] font-semibold">
            {f.label}
            <input
              value={form[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="mt-0.5 block h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldQuestion className="h-3.5 w-3.5" />}
        {busy ? t('fraudRiskSimulator.evaluating') : t('fraudRiskSimulator.evaluate')}
      </button>

      {result && (
        <div className="rounded-xl border border-border p-3">
          <p className="text-sm font-semibold">
            {t('fraudRiskSimulator.resultLine', { score: result.score, level: result.level, action: result.action === 'block' ? t('fraudRiskSimulator.actionBlock') : t('fraudRiskSimulator.actionReview') })}
          </p>
          <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
            {result.signals.map((s, i) => (
              <li key={i}>{t('fraudRiskSimulator.signalLine', { label: s.label, value: s.value, threshold: s.threshold, points: s.points })}</li>
            ))}
            {!result.signals.length && <li>{t('fraudRiskSimulator.noSignals')}</li>}
          </ul>
        </div>
      )}
    </section>
  );
}