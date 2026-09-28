import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import StatCard from '@/components/ops/StatCard';
import { ADMIN_LINKS } from '@/lib/navLinks';
import SupplierHealthCard, { feedHealth } from '@/components/suppliers/SupplierHealthCard';

export default function SupplierPortal() {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState(null);
  const [checks, setChecks] = useState({});
  const [checking, setChecking] = useState(null);
  const load = () => base44.entities.Supplier.list('name', 200).then(setSuppliers);
  useEffect(() => { load(); }, []);

  const verify = async (s) => {
    setChecking(s.id);
    const products = await base44.entities.Product.filter({ supplier_id: s.id }, '-updated_date', 500);
    const withRef = products.filter((p) => p.external_product_id).length;
    const stale = s.last_sync_at ? (Date.now() - new Date(s.last_sync_at)) / 36e5 > 72 : true;
    setChecks({ ...checks, [s.id]: [
      [s.enabled, s.enabled ? t('supplierPortal.checkActive') : t('supplierPortal.checkInactive')],
      [s.adapter !== 'manual', s.adapter === 'manual' ? t('supplierPortal.checkManual') : t('supplierPortal.checkConnector', { adapter: s.adapter })],
      [!s.is_mock, s.is_mock ? t('supplierPortal.checkDemo') : t('supplierPortal.checkReal')],
      [!stale, stale ? t('supplierPortal.checkStale') : t('supplierPortal.checkFresh')],
      [products.length > 0, t('supplierPortal.checkProducts', { count: products.length, ref: withRef })],
    ] });
    setChecking(null);
  };
  const toggle = async (s, on) => { await base44.entities.Supplier.update(s.id, { enabled: on }); load(); };

  const healthy = (suppliers || []).filter((s) => feedHealth(s)[0] === 'Sain').length;
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
      <DashboardNav title={t('supplierPortal.title')} links={ADMIN_LINKS} />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t('supplierPortal.statSuppliers')} value={suppliers?.length ?? '–'} />
        <StatCard label={t('supplierPortal.statActive')} value={(suppliers || []).filter((s) => s.enabled).length} />
        <StatCard label={t('supplierPortal.statHealthy')} value={healthy} tone={healthy ? 'good' : 'warning'} />
      </div>
      <p className="text-xs text-muted-foreground">{t('supplierPortal.hint')}</p>
      {!suppliers ? <div className="h-40 animate-pulse rounded-2xl bg-secondary" /> : suppliers.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('supplierPortal.empty')}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {suppliers.map((s) => (
            <SupplierHealthCard key={s.id} supplier={s} check={checks[s.id]} checking={checking === s.id} onCheck={() => verify(s)} onToggle={(on) => toggle(s, on)} />
          ))}
        </div>
      )}
    </div>
  );
}