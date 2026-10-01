import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { BadgeCheck, Search, ShieldCheck } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import SellerRatingCard from '@/components/ratings/SellerRatingCard';
import { RATING_SORTS, buildSellerMetrics, marketplaceStats, sortMetrics } from '@/lib/vendorRatings';
import { fetchDisputeIndex } from '@/lib/customerAccount';

export default function VendorRatings() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('trust');
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const [sellers, reviews, disputes] = await Promise.all([
        base44.entities.Seller.filter({ status: 'active' }, 'name', 100).catch(() => []),
        base44.entities.Review.list('-created_date', 300).catch(() => []),
        fetchDisputeIndex(),
      ]);
      setMetrics(buildSellerMetrics({ sellers, reviews, disputes }));
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => marketplaceStats(metrics), [metrics]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term ? metrics.filter((m) => m.seller.name.toLowerCase().includes(term)) : metrics;
    return sortMetrics(filtered, sortBy);
  }, [metrics, query, sortBy]);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <InfoPage
      icon={BadgeCheck}
      title={t('vendorRatings.title')}
      subtitle={t('vendorRatings.subtitle')}
    >
      <InfoSection title={t('vendorRatings.marketTitle')}>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {[
            { label: t('vendorRatings.statShops'), value: stats.sellers },
            { label: t('vendorRatings.statVerified'), value: stats.verified },
            { label: t('vendorRatings.statAvg'), value: stats.avgRating ? stats.avgRating.toFixed(1) : '—' },
            { label: t('vendorRatings.statOpenDisputes'), value: stats.openDisputes },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-secondary/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className="mt-0.5 text-lg font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t('vendorRatings.marketLine', { reviews: stats.reviews, orders: stats.orders })}
        </p>
      </InfoSection>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('vendorRatings.searchPh')}
              className="h-11 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {RATING_SORTS.map((sort) => (
              <button
                key={sort.id}
                type="button"
                onClick={() => setSortBy(sort.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${sortBy === sort.id ? 'bg-primary text-primary-foreground' : 'border border-border bg-card'}`}
              >
                {t(sort.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {visible.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visible.map((row) => (
              <SellerRatingCard key={row.seller.id} metrics={row} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            {t('vendorRatings.noMatch')}
          </p>
        )}
      </section>

      <InfoSection title={t('vendorRatings.howTitle')}>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-1.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span><strong>{t('vendorRatings.howReviewsTitle')}</strong> {t('vendorRatings.howReviewsText')}</span>
          </li>
          <li>• <strong>{t('vendorRatings.howDisputesTitle')}</strong> {t('vendorRatings.howDisputesText')}</li>
          <li>• <strong>{t('vendorRatings.howVolumeTitle')}</strong> {t('vendorRatings.howVolumeText')}</li>
          <li>{t('vendorRatings.howNoReview')}</li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}