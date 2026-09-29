import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';

const TYPE_IDS = ['access', 'rectification', 'deletion', 'opposition'];

export default function DataRightsForm() {
  const { t } = useTranslation();
  const TYPES = TYPE_IDS.map((id) => ({ id, label: t(`dataRightsForm.type_${id}`) }));
  const [form, setForm] = useState({ type: 'access', name: '', email: '', phone: '', details: '' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || (!form.email.trim() && !form.phone.trim())) {
      setError(t('dataRightsForm.errorContact'));
      return;
    }
    setSending(true);
    try {
      const requestNumber = `DD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`;
      await base44.entities.DataRequest.create({ ...form, request_number: requestNumber });
      await base44.entities.Notification.create({
        title: t('dataRightsForm.adminTitle', { ref: requestNumber }),
        message: t('dataRightsForm.adminMessage', { name: form.name, label: TYPES.find((tx) => tx.id === form.type)?.label || form.type }),
        type: 'system',
        audience: 'admin',
      });
      setDone(requestNumber);
    } catch {
      setError(t('dataRightsForm.errorSend'));
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <section id="droits" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
        <CheckCircle2 className="h-6 w-6 text-emerald-700" />
        <h2 className="mt-2 text-sm font-bold text-emerald-900">{t('dataRightsForm.doneTitle')}</h2>
        <p className="mt-1 text-xs text-emerald-900">
          {t('dataRightsForm.doneDesc', { ref: done })}
        </p>
      </section>
    );
  }

  return (
    <section id="droits" className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-bold">{t('dataRightsForm.title')}</h2>
      <p className="text-xs text-muted-foreground">
        {t('dataRightsForm.subtitle')}
      </p>
      {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">{error}</p>}
      <form onSubmit={submit} className="space-y-2.5">
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        >
          {TYPES.map((tx) => (
            <option key={tx.id} value={tx.id}>{tx.label}</option>
          ))}
        </select>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={t('dataRightsForm.namePlaceholder')}
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
        <div className="grid gap-2.5 md:grid-cols-2">
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={t('dataRightsForm.emailPlaceholder')}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder={t('dataRightsForm.phonePlaceholder')}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        <textarea
          value={form.details}
          onChange={(e) => setForm({ ...form, details: e.target.value })}
          rows={3}
          placeholder={t('dataRightsForm.detailsPlaceholder')}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm"
        />
        <button
          type="submit"
          disabled={sending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> {sending ? t('dataRightsForm.sending') : t('dataRightsForm.submit')}
        </button>
      </form>
    </section>
  );
}