import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import AssistantMessage from '@/components/assistant/AssistantMessage';
import AssistantComposer from '@/components/assistant/AssistantComposer';
import { buildCustomerBrief } from '@/lib/assistantContext';

const AGENT_NAME = 'shopping_assistant';
const STORAGE_KEY = 'congo_commerce:assistant_conversation';

const readConversationId = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const saveConversationId = (id) => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage unavailable — the conversation still works for this visit */
  }
};

export default function AssistantChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const conversationRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;

    const open = async () => {
      const storedId = readConversationId();
      let conversation = storedId ? await base44.agents.getConversation(storedId).catch(() => null) : null;

      if (!conversation) {
        conversation = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: "Assistant d'achat", description: 'Recherche et recommandations produits' },
        });
        saveConversationId(conversation.id);
      }

      if (cancelled) return;
      conversationRef.current = conversation;
      const history = conversation.messages || [];
      setMessages(history);
      setStarted(history.length > 0);
      setLoading(false);
      unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
        setMessages(data.messages || []);
      });
    };

    open().catch(() => {
      if (cancelled) return;
      setError("L'assistant est momentanément indisponible. Réessayez dans un instant.");
      setLoading(false);
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ block: 'end' });
  }, [messages]);

  const send = async (text) => {
    const conversation = conversationRef.current;
    const body = text.trim();
    if (!conversation || !body || sending) return;

    setSending(true);
    setError('');
    try {
      let content = body;
      if (!started) {
        const brief = await buildCustomerBrief();
        if (brief) content = `${brief}\n\nDemande du client : ${body}`;
        setStarted(true);
      }
      await base44.agents.addMessage(conversation, { role: 'user', content });
    } catch {
      setError("Le message n'a pas pu être envoyé. Vérifiez votre connexion et réessayez.");
    } finally {
      setSending(false);
    }
  };

  const waiting = messages.length > 0 && messages[messages.length - 1].role === 'user';

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-background">
      <div className="min-h-[45vh] flex-1 space-y-3 overflow-y-auto p-4 md:max-h-[58vh]">
        {loading ? (
          <div className="space-y-3">
            <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-secondary" />
            <div className="h-20 w-3/4 animate-pulse rounded-2xl bg-secondary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-2 py-6 text-center">
            <p className="text-sm font-semibold">Bonjour, que cherchez-vous ?</p>
            <p className="mx-auto max-w-md text-xs text-muted-foreground">
              Exemples : « une robe pour un mariage à Kinshasa sous 40 USD », « un cadeau pour un enfant de 5 ans »,
              « un téléphone avec une bonne autonomie ».
            </p>
          </div>
        ) : (
          messages.map((message, index) => <AssistantMessage key={index} message={message} />)
        )}
        {waiting && <p className="text-xs text-muted-foreground">L'assistant réfléchit…</p>}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="border-t border-border px-4 py-2 text-xs font-medium text-destructive">{error}</p>
      )}

      <AssistantComposer onSend={send} disabled={loading || sending} />
    </div>
  );
}