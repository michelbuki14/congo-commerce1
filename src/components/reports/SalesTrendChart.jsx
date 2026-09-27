import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function SalesTrendChart({ data }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={11} />
          <YAxis fontSize={11} width={40} />
          <Tooltip formatter={(v, n) => [n === 'sales' ? `${v.toFixed(2)} $` : v, n === 'sales' ? 'Ventes' : 'Commandes']} />
          <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}