import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ChatWindow({ thread, role, senderName }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    base44.entities.ChatMessage.filter({ thread_id: thread.id }, 'created_date', 200).then(setMessages);
    return base44.entities.ChatMessage.subscribe((e) => {
      if (e.type === 'create' && e.data?.thread_id === thread.id) {
        setMessages((m) => (m.some((x) => x.id === e.id) ? m : [...m, e.data]));
      }
    });
  }, [thread.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const msg = await base44.entities.ChatMessage.create({ thread_id: thread.id, participants: thread.participants || [], sender_role: role, sender_name: senderName, body });
    await base44.entities.ChatThread.update(thread.id, { last_message: body.slice(0, 120), last_at: new Date().toISOString() });
    setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
    setText('');
    setSending(false);
  };

  return (
    <div className="flex h-[65vh] flex-col rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-3">
        <p className="text-sm font-bold">{thread.type === 'support' ? 'Support Congo Commerce' : role === 'customer' ? thread.seller_name : thread.customer_name}</p>
        {thread.subject && <p className="text-xs text-muted-foreground">{thread.subject}</p>}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {!messages.length && <p className="py-8 text-center text-xs text-muted-foreground">Aucun message. Écrivez le premier.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_role === role ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender_role === role ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
              <p className="text-[10px] font-semibold opacity-70">{m.sender_name}</p>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre message…" className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary" />
        <button type="submit" disabled={sending || !text.trim()} aria-label="Envoyer" className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}