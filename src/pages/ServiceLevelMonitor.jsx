import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, MessageSquare } from 'lucide-react';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import CourierPerformanceTable from '@/components/levels/CourierPerformanceTable';
import StatusBadge from '@/components/StatusBadge';
import { courierLevels, deliveryStats, fulfillmentStats, onTimeRate, supportStats } from '@/lib/serviceLevels';
import { formatDateTime } from '@/lib/format';

export default function ServiceLevelMonitor() {
  const [shipments, setShipments] = useState([]);
  const [fulfillments, setFulfillments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Shipment.list('-created_date', 500).catch(() => []),
      base44.entities.FulfillmentOrder.list('-created_date', 500).catch(() => []),
      base44.entities.SupportTicket.list('-created_date', 200).catch(() => []),
      base44.entities.Courier.list('name', 50).catch(() => []),
    ])
      .then(([s, f, t, c]) => {
        setShipments(s);
        setFulfillments(f);
        setTickets(t);
        setCouriers(c);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  const delivery = deliveryStats(shipments);
  const fulfillment = fulfillmentStats(fulfillments);
  const onTime = onTimeRate(fulfillments);
  const support = supportStats(tickets);
  const levels = courierLevels(shipments, couriers);

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title="Niveaux de service"
        subtitle="Délais réellement constatés : acheminement des colis, préparation des commandes et temps de réponse du support."
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard
          label="Délai de livraison"
          value={delivery.avg != null ? `${delivery.avg} j` : '—'}
          hint={delivery.count ? `${delivery.count} colis · médiane ${delivery.median} j` : 'aucun colis livré'}
        />
        <StatCard
          label="Latence de préparation"
          value={fulfillment.avg != null ? `${fulfillment.avg} j` : '—'}
          hint={fulfillment.count ? `${fulfillment.count} commande(s) livrée(s)` : 'aucune commande livrée'}
        />
        <StatCard
          label="1ʳᵉ réponse support"
          value={support.response.avg != null ? `${support.response.avg} h` : '—'}
          hint={support.response.count ? `${support.response.count} ticket(s) traité(s)` : 'aucune réponse enregistrée'}
          tone={support.response.avg != null && support.response.avg > 24 ? 'warn' : 'good'}
        />
        <StatCard
          label="Respect des délais"
          value={onTime ? `${Math.round(onTime.rate * 100)} %` : '—'}
          hint={onTime ? `${onTime.ok}/${onTime.count} dans les délais` : 'aucune date promise'}
          tone={onTime && onTime.rate < 0.8 ? 'warn' : 'good'}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-bold">Performance par partenaire</h2>
            <p className="text-[11px] text-muted-foreground">Délai moyen constaté comparé au délai promis par le transporteur.</p>
          </div>
          <span className="text-[11px] text-muted-foreground">{delivery.p90 != null ? `90ᵉ centile : ${delivery.p90} j` : ''}</span>
        </header>
        <CourierPerformanceTable rows={levels} />
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <div>
              <h2 className="text-sm font-bold">Tickets en attente</h2>
              <p className="text-[11px] text-muted-foreground">Objectif de première réponse : {support.slaHours} h.</p>
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${support.overdue ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
            {support.overdue} hors délai
          </span>
        </header>
        {support.open.length ? (
          <div className="divide-y divide-border">
            {support.open.slice(0, 8).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.subject}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.ticket_number || 'Ticket'} · ouvert depuis {t.ageHours < 24 ? `${Math.round(t.ageHours)} h` : `${Math.round(t.ageHours / 24)} j`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={t.priority} />
                  {t.ageHours > support.slaHours ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                      <Clock className="h-3.5 w-3.5" /> À traiter
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucun ticket en attente : le support est à jour.</p>
        )}
      </section>

      <p className="text-[11px] text-muted-foreground">
        Dernière analyse : {formatDateTime(new Date().toISOString())} · {shipments.length} expédition(s), {fulfillments.length} traitement(s)
        et {tickets.length} ticket(s) analysés.
      </p>
    </div>
  );
}