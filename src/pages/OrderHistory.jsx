import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, FileText, MapPin } from 'lucide-react';
import { fetchMyOrders } from '@/lib/customerAccount';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import { useCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/format';

export default function OrderHistory() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setOrders(await fetchMyOrders({ limit: 50 }));
      setLoading(false);
    })();
  }, []);

  return (<InfoPage
      icon={Package}
      title={t('orderHistory.title')}
      subtitle={t('orderHistory.subtitle')}
    >
      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
      ) : !orders.length ? (
        <EmptyState
          icon={Package}
          title={t('orderHistory.emptyTitle')}
          description={t('orderHistory.emptyText')}
          actionTo="/"
          actionLabel={t('orderHistory.emptyCta')}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{o.order_number}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(o.created_date)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={o.status} />
                  <span className="text-sm font-bold">{format(o.total_usd || 0)}</span>
                </div>
              </div>

              <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                <p>
                  {t('orderHistory.lineInfo', { count: o.items?.length || 0, method: o.payment_method || '—', status: o.payment_status || 'PENDING' })}
                </p>
                <p className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {o.delivery_method === 'pickup_point'
                    ? t('orderHistory.pickupLine', { where: o.pickup_point_name || o.city || '' })
                    : t('orderHistory.deliveryLine', { where: [o.address, o.city].filter(Boolean).join(', ') || t('orderHistory.addressTbc') })}
                </p>
              </div>

              {!!o.items?.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {o.items.slice(0, 4).map((it, i) => (
                    <span key={`${o.id}-${i}`} className="rounded-full bg-secondary px-2.5 py-1 text-[11px]">
                      {it.title} × {it.quantity}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to={`/order/${o.order_number}`}
                  className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground"
                >
                  {t('orderHistory.details')}
                </Link>
                <Link
                  to={`/invoice/${o.order_number}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground"
                >
                  <FileText className="h-3.5 w-3.5" /> {t('orderHistory.invoice')}
                </Link>
                <Link to="/track" className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
                  {t('orderHistory.track')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <InfoSection title={t('orderHistory.missingTitle')}>
        <p>
          {t('orderHistory.missingText')}
        </p>
        <Link to="/track" className="inline-block rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
          {t('orderHistory.searchByNumber')}
        </Link>
      </InfoSection>
    </InfoPage>
  );
}