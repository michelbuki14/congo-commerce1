import React, { useEffect, useState } from 'react';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/EmptyState';
import { timeAgo } from '@/lib/format';

const TYPE_STYLES = {
  order: 'bg-sky-100 text-sky-900',
  promo: 'bg-amber-100 text-amber-900',
  payment: 'bg-emerald-100 text-emerald-900',
  social: 'bg-violet-100 text-violet-900',
  system: 'bg-secondary text-foreground',
};

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Notification.filter({ audience: 'customer' }, '-created_date', 40)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const markAll = async () => {
    const unread = items.filter((n) => !n.read);
    await Promise.all(unread.map((n) => base44.entities.Notification.update(n.id, { read: true }).catch(() => null)));
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markOne = async (n) => {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    await base44.entities.Notification.update(n.id, { read: true }).catch(() => null);
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold md:text-xl">Notifications</h1>
        {unreadCount > 0 && (
          <button type="button" onClick={markAll} className="flex items-center gap-1 text-xs font-semibold text-primary">
            <CheckCheck className="h-3.5 w-3.5" /> Tout marquer comme lu
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : items.length ? (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markOne(n)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left ${
                n.read ? 'border-border bg-card' : 'border-primary/30 bg-primary/5'
              }`}
            >
              {n.read ? <Bell className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_STYLES[n.type] || TYPE_STYLES.system}`}>
                    {n.type}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {timeAgo(n.created_date)}
                  {n.order_number ? ` · ${n.order_number}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon={Bell} title="Aucune notification" description="Vos alertes de commande et promotions apparaîtront ici." />
      )}
    </div>
  );
}