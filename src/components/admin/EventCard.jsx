import React, { memo } from 'react';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EVENT_LABELS } from '@/lib/events';
import { formatDateTime } from '@/lib/format';

const SEVERITY_STYLES = {
  info: 'bg-secondary text-foreground',
  warning: 'bg-amber-100 text-amber-900',
  critical: 'bg-red-100 text-red-900',
};

const ACTION_ICONS = {
  done: CheckCircle2,
  failed: XCircle,
  skipped: Circle,
};

export default memo(function EventCard({ event }) {
  const { t } = useTranslation();
  const SEVERITY_LABELS = { info: t('eventCard.severityInfo'), warning: t('eventCard.severityWarning'), critical: t('eventCard.severityCritical') };
  const STATUS_LABELS = { received: t('eventCard.statusReceived'), handled: t('eventCard.statusHandled'), failed: t('eventCard.statusFailed') };
  const actions = event.actions || [];
  const failed = event.status === 'failed';

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold">{t(EVENT_LABELS[event.name] || 'eventLog.unknown')}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {event.reference || event.source || '—'} · {event.actor_email || t('eventCard.system')} · {formatDateTime(event.created_date)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEVERITY_STYLES[event.severity] || 'bg-secondary'}`}>
            {SEVERITY_LABELS[event.severity] || event.severity}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${failed ? 'bg-red-100 text-red-900' : 'bg-emerald-100 text-emerald-900'}`}>
            {STATUS_LABELS[event.status] || event.status}
          </span>
        </div>
      </div>

      {event.description && <p className="mt-2 text-xs text-muted-foreground">{event.description}</p>}

      {!!actions.length && (
        <ul className="mt-2.5 space-y-1">
          {actions.map((action, index) => {
            const Icon = ACTION_ICONS[action.status] || Circle;
            return (
              <li key={`${action.type}-${index}`} className="flex items-start gap-1.5 text-[11px]">
                <Icon
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                    action.status === 'done' ? 'text-emerald-600' : action.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                />
                <span className={action.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}>
                  {action.label}
                  {action.detail && action.status === 'failed' ? ` — ${action.detail}` : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});