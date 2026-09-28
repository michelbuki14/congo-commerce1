import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { shoppingAssistant } from '@/lib/ai';

export default function ShoppingAssistant() {
  const { t } = useTranslation();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setAnswer('');
    try {
      const catalog = await base44.entities.Product.filter({ status: 'published' }, '-sold_count', 25);
      const result = await shoppingAssistant({ question: q, catalog });
      setAnswer(result);
    } catch {
      setAnswer(t('shoppingAssistant.unavailable'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold">{t('shoppingAssistant.title')}</p>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {t('shoppingAssistant.subtitle')}
      </p>
      <form onSubmit={ask} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('shoppingAssistant.placeholder')}
          className="h-10 flex-1 rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          aria-label={t('shoppingAssistant.send')}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      {loading && <p className="mt-3 text-xs text-muted-foreground">{t('shoppingAssistant.searching')}</p>}
      {answer && <p className="mt-3 rounded-xl bg-card p-3 text-xs leading-relaxed">{answer}</p>}
      <Link to="/assistant" className="mt-3 inline-block text-xs font-semibold underline">
        {t('shoppingAssistant.openAssistant')}
      </Link>
    </div>
  );
}