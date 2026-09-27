import React, { useState } from 'react';
import { Send, User, Headphones } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDateTime } from '@/lib/format';

export default function TicketThread({ ticket, onReplied }) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messages = ticket.messages || [];

  const send = async (e) => {
    e.preventDefault();
    setError('');
    if (!reply.trim()) return;
    setSending(true);
    try {
      const next = [...messages, { author: 'customer', name: ticket.customer_name || 'Client', body: reply.trim(), at: new Date().toISOString() }];
      const updated = await base44.entities.SupportTicket.update(ticket.id, { messages: next, status: 'open' });
      setReply('');
      onReplied(updated);
    } catch {
      setError("Le message n'a pas pu être envoyé. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {messages.map((m, i) => {
        const mine = m.author === 'customer';
        return (
          <div key={i} className={`flex gap-2 ${mine ? '' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${mine ? 'bg-secondary/60' : 'bg-primary/10'}`}>
              <p className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                {mine ? <User className="h-3 w-3" /> : <Headphones className="h-3 w-3" />}
                {mine ? m.name || 'Vous' : m.name || 'Support Congo Commerce'}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDateTime(m.at)}</p>
            </div>
          </div>
        );
      })}

      <form onSubmit={send} className="flex items-end gap-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={2}
          placeholder="Écrire au service client…"
          className="min-h-[44px] flex-1 rounded-lg border border-border bg-background p-2.5 text-xs"
        />
        <button
          type="submit"
          disabled={sending || !reply.trim()}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" /> {sending ? '…' : 'Envoyer'}
        </button>
      </form>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}