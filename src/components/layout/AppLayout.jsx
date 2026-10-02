import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import LegalFooter from '@/components/legal/LegalFooter';
import { applyTenantBranding, clearTenantBranding, resolveTenantByHost } from '@/lib/tenancy';
import BackButton from '@/components/BackButton';

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

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
    <div className="min-h-screen bg-background pb-8 md:pb-8">
      <TopBar />
      <main className="mx-auto w-full min-w-0 max-w-6xl px-3 py-5 md:px-6 md:py-7">
        <BackButton fallback="/" className="mb-4 md:hidden" />
        <AnimatePresence>
          <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <Outlet />
          </motion.div>
        </AnimatePresence>
        <LegalFooter />
      </main>
    </div>
  );
}
