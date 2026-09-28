import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Headphones, ShieldCheck, Send, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ShoppingAssistant from '@/components/ShoppingAssistant';
import { getProfile } from '@/lib/session';

export default function Support() {
  const { t } = useTranslation();
  const FAQ = [
    {
      q: t('support.faq1q'),
      a: t('support.faq1a'),
    },
    {
      q: t('support.faq2q'),
      a: t('support.faq2a'),
    },
    {
      q: t('support.faq3q'),
      a: t('support.faq3a'),
    },
    {
      q: t('support.faq4q'),
      a: t('support.faq4a'),
    },
    {
      q: t('support.faq5q'),
      a: t('support.faq5a'),
    },
  ];
  const profile = getProfile();
  const [form, setForm] = useState({ name: profile.name || '', phone: profile.phone || '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setSending(true);
    try {
      await base44.entities.Notification.create({
        title: `Message support : ${form.subject || 'Sans objet'}`,
        message: `${form.name || 'Client'} (${form.phone || 'sans téléphone'}) — ${form.message}`,
        type: 'system',
        audience: 'admin',
        is_demo: true,
      });
      setSent(true);
      setForm({ ...form, subject: '', message: '' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="flex items-center gap-2 text-lg font-bold md:text-xl">
        <Headphones className="h-5 w-5 text-primary" /> {t('support.title')}
      </h1>

      <ShoppingAssistant />

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t('support.faqTitle')}</h2>
        {FAQ.map((item) => (
          <details key={item.q} className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-semibold">{item.q}</summary>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </section>

      <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck className="h-4 w-4 text-primary" /> {t('support.rulesTitle')}
        </h2>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>{t('support.rule1')}</li>
          <li>{t('support.rule2')}</li>
          <li>{t('support.rule3')}</li>
          <li>{t('support.rule4')}</li>
          <li>{t('support.rule5')}</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t('support.contactTitle')}</h2>
        {sent ? (
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {t('support.sentText')}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('support.namePh')}
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t('support.phonePh')}
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder={t('support.subjectPh')}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              placeholder={t('support.messagePh')}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm"
            />
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> {sending ? t('support.sending') : t('support.send')}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
