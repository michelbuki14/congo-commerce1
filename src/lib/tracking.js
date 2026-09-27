import { base44 } from '@/api/base44Client';
import { getPrivacyPreferences, getSessionId } from '@/lib/session';

/**
 * Records a commerce event. The platform analytics call feeds the marketing
 * KPI counters; the stored row feeds the in-app marketing dashboard. The row
 * is skipped when the visitor has opted out of anonymous usage statistics.
 */
export function trackEvent(name, properties = {}) {
  base44.analytics.track({ eventName: name });
  if (!getPrivacyPreferences().anonymous_analytics) return;
  base44.entities.AnalyticsEvent.create({
    name,
    session_id: getSessionId(),
    product_id: properties.product_id || '',
    path: window.location.pathname,
    value_usd: Number(properties.value_usd) || 0,
  }).catch(() => {});
}