import React, { memo } from 'react';
import ChatWindow from '@/components/chat/ChatWindow';
import { formatDateTime } from '@/lib/format';
import { useTranslation } from 'react-i18next';

/** Two-pane inbox: thread list + active conversation. */
export default memo(function ChatInbox({ threads, activeId, onSelect, role, senderName, emptyText }) {
  const { t } = useTranslation();
  const active = threads.find((tx) => tx.id === activeId);
  const title = (tx) => (tx.type === 'support' ? t('chatInbox.support') : role === 'customer' ? tx.seller_name : tx.customer_name || t('chatInbox.client'));
  return (
    <div className="grid gap-3 md:grid-cols-[280px_1fr]">
      <div className={`space-y-2 ${active ? 'hidden md:block' : ''}`}>
        {!threads.length && <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyText}</p>}
        {threads.map((tx) => (
          <button key={tx.id} type="button" onClick={() => onSelect(tx.id)} className={`w-full rounded-2xl border p-3 text-left ${tx.id === activeId ? 'border-primary bg-secondary' : 'border-border bg-card'}`}>
            <p className="text-sm font-semibold">{title(tx)}</p>
            <p className="truncate text-xs text-muted-foreground">{tx.last_message || tx.subject || t('chatInbox.newConversation')}</p>
            {tx.last_at && <p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(tx.last_at)}</p>}
          </button>
        ))}
      </div>
      {active ? (
        <div>
          <button type="button" onClick={() => onSelect(null)} className="mb-2 text-xs font-semibold md:hidden">← {t('chatInbox.conversations')}</button>
          <ChatWindow thread={active} role={role} senderName={senderName} />
        </div>
      ) : (
        <div className="hidden items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground md:flex">{t('chatInbox.selectConversation')}</div>
      )}
    </div>
  );
});