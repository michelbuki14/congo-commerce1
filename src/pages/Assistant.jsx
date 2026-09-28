import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AssistantChat from '@/components/assistant/AssistantChat';

export default function Assistant() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 pb-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold md:text-xl">
          <Sparkles className="h-5 w-5 text-primary" /> {t('assistant.title')}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('assistant.subtitle')}
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}