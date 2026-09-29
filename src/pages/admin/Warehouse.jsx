import React, { useState } from 'react';
import DashboardNav from '@/components/DashboardNav';
import PickPackQueue from '@/components/warehouse/PickPackQueue';
import ReceivingPanel from '@/components/warehouse/ReceivingPanel';
import OriginReceivingPanel from '@/components/warehouse/OriginReceivingPanel';
import { useTranslation } from 'react-i18next';
import { ADMIN_LINKS } from '@/lib/navLinks';

export default function Warehouse() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('pick');
  const tabs = [['pick', t('warehouse.pick')], ['receive', t('warehouse.receive')], ['intl', t('originReceiving.tab')]];
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-5 md:px-6">
      <DashboardNav title={t('warehouse.title')} links={ADMIN_LINKS} />
      <div className="flex gap-2">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${tab === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>{l}</button>
        ))}
      </div>
      {tab === 'pick' && <PickPackQueue />}
      {tab === 'receive' && <ReceivingPanel />}
      {tab === 'intl' && <OriginReceivingPanel />}
    </div>
  );
}