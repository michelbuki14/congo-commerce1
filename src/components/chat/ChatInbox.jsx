import React from 'react';
import ChatWindow from '@/components/chat/ChatWindow';
import { formatDateTime } from '@/lib/format';

/** Two-pane inbox: thread list + active conversation. */
export default function ChatInbox({ threads, activeId, onSelect, role, senderName, emptyText }) {
  const active = threads.find((t) => t.id === activeId);
  const title = (t) => (t.type === 'support' ? 'Support' : role === 'customer' ? t.seller_name : t.customer_name || 'Client');
  return (
    <div className="grid gap-3 md:grid-cols-[280px_1fr]">
      <div className={`space-y-2 ${active ? 'hidden md:block' : ''}`}>
        {!threads.length && <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyText}</p>}
        {threads.map((t) => (
          <button key={t.id} type="button" onClick={() => onSelect(t.id)} className={`w-full rounded-2xl border p-3 text-left ${t.id === activeId ? 'border-primary bg-secondary' : 'border-border bg-card'}`}>
            <p className="text-sm font-semibold">{title(t)}</p>
            <p className="truncate text-xs text-muted-foreground">{t.last_message || t.subject || 'Nouvelle conversation'}</p>
            {t.last_at && <p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(t.last_at)}</p>}
          </button>
        ))}
      </div>
      {active ? (
        <div>
          <button type="button" onClick={() => onSelect(null)} className="mb-2 text-xs font-semibold md:hidden">← Conversations</button>
          <ChatWindow thread={active} role={role} senderName={senderName} />
        </div>
      ) : (
        <div className="hidden items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground md:flex">Sélectionnez une conversation</div>
      )}
    </div>
  );
}