import React from 'react';
import { useTranslation } from 'react-i18next';
import DashboardNav from '@/components/DashboardNav';

/**
 * Shared wrapper for admin and seller dashboards.
 * Provides consistent vertical rhythm and the role-nav bar.
 * Does NOT force a KPI grid or hero layout — each page keeps its own body.
 */
export default function DashboardShell({ nav, title, children, className }) {
  const { t } = useTranslation();

  return (
    <div className={"space-y-5 pb-8" + (className ? " " + className : "")}>
      <DashboardNav title={title || t('dashboard.title')} links={nav} />
      {children}
    </div>
  );
}
