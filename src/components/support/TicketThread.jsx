import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, User, Headphones } from 'lucide-react';
import { replyToTicket } from '@/lib/customerAccount';
import { getProfile } from '@/lib/session';
import { formatDateTime } from '@/lib/format';

export default memo(function TicketThread({ ticket, onReplied }) {
  const { t } = useTranslation();
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
      const updated = await replyToTicket({ ticketId: ticket.id, message: reply.trim(), phone: getProfile().phone || '' });
      setReply('');
      onReplied(updated);
    } catch {
      setError(t('ticketThread.sendFailed'));
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
                {mine ? m.name || t('ticketThread.you') : m.name || t('ticketThread.supportName')}
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
          placeholder={t('ticketThread.replyPh')}
          className="min-h-[44px] flex-1 rounded-lg border border-border bg-background p-2.5 text-xs"
        />
        <button
          type="submit"
          disabled={sending || !reply.trim()}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" /> {sending ? t('ticketThread.sending') : t('ticketThread.send')}
        </button>
      </form>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
});