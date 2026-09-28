import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AssistantComposer({ onSend, disabled }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  };

  return (
    <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('assistantComposer.placeholder')}
        className="h-10 flex-1 rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label={t('assistantComposer.send')}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}