import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatUSD } from '@/lib/format';

export default function SalesTrend({ data }) {
  const hasSales = data.some(day => day.orders > 0);
  return <section className="min-w-0 rounded-2xl border border-border bg-card p-4">
    <h2 className="text-sm font-bold">Ventes quotidiennes</h2>
    <p className="mt-1 text-xs text-muted-foreground">Montant des commandes payées, par date de création · USD</p>
    {hasSales ? <div className="mt-5 h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="day" fontSize={11} minTickGap={25} />
          <YAxis fontSize={11} width={56} tickFormatter={n => `$${n}`} />
          <Tooltip formatter={n => [formatUSD(n), 'Ventes']} labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''} />
          <Area dataKey="revenue" type="monotone" stroke="hsl(var(--primary))" fill="hsl(var(--accent))" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div> : <p className="mt-6 text-sm text-muted-foreground">Aucune vente payée sur cette période.</p>}
  </section>;
}