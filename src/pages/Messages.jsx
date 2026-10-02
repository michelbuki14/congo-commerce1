import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { getSessionId, getProfile } from '@/lib/session';
import ChatInbox from '@/components/chat/ChatInbox';

export default function Messages() {
  const { t } = useTranslation();
  const session = getSessionId();
  const name = getProfile().name || 'Client';
  const [threads, setThreads] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [target, setTarget] = useState('support');

  const [email, setEmail] = useState('');
  useEffect(() => {
    base44.auth.me().then((u) => {
      setEmail(u.email);
      base44.entities.ChatThread.filter({ customer_email: u.email }, '-updated_date', 50).then(setThreads);
    });
    base44.entities.Seller.filter({ status: 'active' }, 'name', 200).then(setSellers);
  }, []);

  const start = async () => {
    const existing = threads.find((th) => (target === 'support' ? th.type === 'support' : th.seller_id === target));
    if (existing) return setActiveId(existing.id);
    const seller = sellers.find((s) => s.id === target);
    const base = { customer_session: session, customer_name: name, customer_email: email };
    const thread = await base44.entities.ChatThread.create(
      seller
        ? { ...base, type: 'seller', seller_id: seller.id, seller_name: seller.name, participants: [...new Set([email, seller.email, seller.tenant_owner_email].filter(Boolean))] }
        : { ...base, type: 'support', subject: 'Assistance', participants: [email] }
    );
    setThreads((prev) => [thread, ...prev]);
    setActiveId(thread.id);
  };

  return (<div className="mx-auto max-w-6xl space-y-4 px-3 py-5 md:px-6">
      <h1 className="text-xl font-bold">{t('messages.title')}</h1>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3">
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-10 flex-1 rounded-full border border-border bg-background px-3 text-sm">
          <option value="support">{t('messages.supportOption')}</option>
          {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="button" onClick={start} className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">{t('messages.write')}</button>
      </div>
      <ChatInbox threads={threads} activeId={activeId} onSelect={setActiveId} role="customer" senderName={name} emptyText={t('messages.emptyText')} />
    </div>
  );
}
