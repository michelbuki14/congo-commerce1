import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StatusBadge from '@/components/StatusBadge';
import { formatUSD, formatDate } from '@/lib/format';
import { RETURN_REASONS } from '@/lib/returns';

/** One delivered order with its items, each selectable with its own reason. */
export default memo(function ReturnOrderCard({ order, eligibility, selection, onToggle, onReason }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{order.order_number}</p>
          <p className="text-[11px] text-muted-foreground">
            {formatDate(order.created_date)} · {formatUSD(order.total_usd)} · {t('returnOrderCard.itemsLine', { count: order.items?.length || 0 })}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {!eligibility.ok ? <p className="mt-1 text-[11px] text-amber-600">{eligibility.reason}</p> : null}

      <div className="mt-2 space-y-1.5">
        {(order.items || []).map((item, index) => {
          const key = `${order.id}::${index}`;
          const picked = selection[key];
          return (
            <div key={key} className={`rounded-lg border border-border p-2 ${eligibility.ok ? '' : 'opacity-60'}`}>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(picked)}
                  disabled={!eligibility.ok}
                  onChange={() => onToggle(key)}
                  className="h-4 w-4"
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.title}</span>
                <span className="text-[11px] text-muted-foreground">
                  ×{item.quantity} · {formatUSD(item.line_total_usd)}
                </span>
              </label>
              {picked ? (
                <div className="mt-2 pl-7">
                  <label className="block text-[11px] font-semibold">
                    {t('returnOrderCard.reasonForItem')}
                    <select
                      value={picked.reason}
                      onChange={(e) => onReason(key, e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-xs"
                    >
                      {RETURN_REASONS.map((r) => <option key={r.id} value={r.id}>{t(r.labelKey)}</option>)}
                    </select>
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!eligibility.ok ? (
        <Link to="/support" className="mt-2 inline-block text-[11px] font-semibold text-primary">
          {t('returnOrderCard.notReceivedTicket')}
        </Link>
      ) : null}
    </div>
  );
});
