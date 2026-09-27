import React from 'react';
import { Sparkles } from 'lucide-react';
import AssistantChat from '@/components/assistant/AssistantChat';

export default function Assistant() {
  return (
    <div className="space-y-4 pb-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold md:text-xl">
          <Sparkles className="h-5 w-5 text-primary" /> Assistant d'achat
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Décrivez ce que vous cherchez : l'assistant explore le catalogue et vous recommande les articles adaptés à
          votre profil.
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}