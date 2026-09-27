import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import OpsHeader from '@/components/ops/OpsHeader';
import { Button } from '@/components/ui/button';
import PickupPointForm from '@/components/pickup/PickupPointForm';
import PickupHandover from '@/components/pickup/PickupHandover';
import { formatUSD } from '@/lib/format';

export default function PickupManager() {
  const [points, setPoints] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async () => {
    const [p, o] = await Promise.all([
      base44.entities.PickupPoint.list('city', 200),
      base44.entities.Order.filter({ delivery_method: 'pickup_point' }, '-created_date', 200),
    ]);
    setPoints(p);
    setOrders(o.filter((x) => !['DELIVERED', 'CANCELLED'].includes(x.status)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (data) => {
    if (editing?.id) await base44.entities.PickupPoint.update(editing.id, data);
    else await base44.entities.PickupPoint.create({ ...data, active: true });
    setEditing(null);
    load();
  };

  const toggle = async (p) => {
    await base44.entities.PickupPoint.update(p.id, { active: !p.active });
    load();
  };

  const release = async (order) => {
    const cod = order.payment_provider === 'cod';
    await base44.entities.Order.update(order.id, { status: 'DELIVERED', ...(cod ? { payment_status: 'PAID' } : {}) });
    await base44.entities.AuditLog.create({ action: 'pickup.released', actor: 'admin', entity: 'Order', entity_id: order.id, reference: order.order_number, severity: 'info', details: { pickup_point: order.pickup_point_name } });
    setMessage(`Colis ${order.order_number} remis au client.`);
    load();
  };

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Chargement…</p>;
  const waiting = (id) => orders.filter((o) => o.pickup_point_id === id).length;

  return (
    <div className="space-y-5">
      <DashboardNav title="Administration" links={ADMIN_LINKS} />
      <OpsHeader title="Points de retrait" subtitle="Gérez le réseau de points relais et remettez les colis contre le code client.">
        <Button onClick={() => setEditing({})}>Nouveau point</Button>
      </OpsHeader>
      {editing && <PickupPointForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
      <div className="grid gap-3 md:grid-cols-2">
        {points.map((p) => (
          <div key={p.id} className={`rounded-2xl border border-border bg-card p-4 ${p.active ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">{p.name}</p>
                <p className="text-xs text-muted-foreground">{[p.commune, p.city].filter(Boolean).join(', ')} · {p.hours}</p>
                <p className="text-xs text-muted-foreground">{p.address} {p.phone && `· ${p.phone}`}</p>
              </div>
              <span className="text-sm font-semibold">{formatUSD(p.fee_usd || 0)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-semibold">{waiting(p.id)} colis en attente</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Modifier</Button>
                <Button size="sm" variant="outline" onClick={() => toggle(p)}>{p.active ? 'Désactiver' : 'Activer'}</Button>
              </div>
            </div>
          </div>
        ))}
        {!points.length && <p className="text-sm text-muted-foreground">Aucun point de retrait.</p>}
      </div>
      <section className="space-y-2">
        <h2 className="text-sm font-bold">Colis à remettre ({orders.length})</h2>
        {message && <p className="text-xs font-semibold text-emerald-700">{message}</p>}
        {orders.map((o) => <PickupHandover key={o.id} order={o} onRelease={release} />)}
        {!orders.length && <p className="text-sm text-muted-foreground">Aucun colis en attente.</p>}
      </section>
    </div>
  );
}