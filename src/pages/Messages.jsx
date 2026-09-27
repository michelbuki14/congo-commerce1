import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getSessionId, getProfile } from '@/lib/session';
import ChatInbox from '@/components/chat/ChatInbox';

export default function Messages() {
  const session = getSessionId();
  const name = getProfile().name || 'Client';
  const [threads, setThreads] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [target, setTarget] = useState('support');

  const load = () => base44.entities.ChatThread.filter({ customer_session: session }, '-updated_date', 50).then(setThreads);
  useEffect(() => {
    load();
    base44.entities.Seller.filter({ status: 'active' }, 'name', 200).then(setSellers);
  }, []);

  const start = async () => {
    const existing = threads.find((t) => (target === 'support' ? t.type === 'support' : t.seller_id === target));
    if (existing) return setActiveId(existing.id);
    const seller = sellers.find((s) => s.id === target);
    const t = await base44.entities.ChatThread.create(
      seller
        ? { type: 'seller', seller_id: seller.id, seller_name: seller.name, customer_session: session, customer_name: name }
        : { type: 'support', subject: 'Assistance', customer_session: session, customer_name: name }
    );
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-5 md:px-6">
      <h1 className="text-xl font-bold">Messages</h1>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3">
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-10 flex-1 rounded-full border border-border bg-background px-3 text-sm">
          <option value="support">Support Congo Commerce</option>
          {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="button" onClick={start} className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Écrire</button>
      </div>
      <ChatInbox threads={threads} activeId={activeId} onSelect={setActiveId} role="customer" senderName={name} emptyText="Aucune conversation pour l'instant." />
    </div>
  );
}