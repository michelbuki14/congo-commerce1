import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import LegalFooter from '@/components/legal/LegalFooter';
import { applyTenantBranding, clearTenantBranding, resolveTenantByHost } from '@/lib/tenancy';

export default function AppLayout() {
  // White label: a visitor arriving on a tenant's verified domain sees that
  // tenant's colours. Everything else keeps the platform theme.
  useEffect(() => {
    let alive = true;
    resolveTenantByHost()
      .then((tenant) => { if (alive && tenant) applyTenantBranding(tenant); })
      .catch(() => {});
    return () => {
      alive = false;
      clearTenantBranding();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
      <TopBar />
      <main className="mx-auto w-full min-w-0 max-w-6xl px-3 py-5 md:px-6 md:py-7">
        <Outlet />
        <LegalFooter />
      </main>
      <BottomNav />
    </div>
  );
}