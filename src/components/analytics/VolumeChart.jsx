import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatUSD } from '@/lib/format';
import { useTranslation } from 'react-i18next';

/** Transaction volume per day, in USD. */
export default function VolumeChart({ data }) {
  const { t } = useTranslation();
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold">{t('volumeChart.title')}</h2>
      <p className="text-[11px] text-muted-foreground">{t('volumeChart.subtitle')}</p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="day" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip formatter={(value) => formatUSD(value)} />
            <Bar dataKey="volume" fill="#111111" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}