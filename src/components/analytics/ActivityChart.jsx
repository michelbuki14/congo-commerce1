import React from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';

/** Daily active users over the reporting window. */
export default function ActivityChart({ data }) {
  const { t } = useTranslation();
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold">{t('activityChart.title')}</h2>
      <p className="text-[11px] text-muted-foreground">{t('activityChart.subtitle')}</p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="day" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="actifs" stroke="#e4572e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}