import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/lib/format';

const SEVERITY = {
  critical: 'bg-red-100 text-red-900',
  warning: 'bg-amber-100 text-amber-900',
  info: 'bg-sky-100 text-sky-900',
};

/** Recent failures worth acting on, newest first. */
export default function IncidentList({ incidents }) {
  const { t } = useTranslation();
  const SEVERITY_LABELS = { critical: t('incidentList.severityCritical'), warning: t('incidentList.severityWarning'), info: t('incidentList.severityInfo') };
  if (!incidents?.length) {
    return (
      <p className="flex items-center justify-center gap-2 px-4 py-6 text-center text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t('incidentList.empty')}
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {incidents.map((i) => (
        <div key={i.id} className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">{i.title}</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">{i.kind}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${SEVERITY[i.severity] || SEVERITY.warning}`}>
                {SEVERITY_LABELS[i.severity] || i.severity}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">{i.detail}</p>
          <p className="text-[11px] text-muted-foreground">{formatDateTime(i.at)}</p>
        </div>
      ))}
    </div>
  );
}