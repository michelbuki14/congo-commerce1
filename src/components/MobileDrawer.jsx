import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { X, LayoutGrid, Compass, ShoppingBag, User, Heart, MessageCircle, Bell, Store, ShieldCheck, LogOut } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/AuthContext';
import {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
} from '@/components/ui/drawer';

const PRIMARY_ITEMS = [
  { key: 'nav.home', path: '/', icon: LayoutGrid },
  { key: 'nav.discover', path: '/discover', icon: Compass },
  { key: 'nav.categories', path: '/categories', icon: LayoutGrid },
];

const USER_ITEMS = [
  { key: 'nav.profile', path: '/profile', icon: User },
  { key: 'nav.wishlist', path: '/wishlist', icon: Heart },
  { key: 'nav.messages', path: '/messages', icon: MessageCircle },
  { key: 'nav.notifications', path: '/notifications', icon: Bell },
];

const SELLER_ITEMS = [
  { key: 'nav.sellerSpace', path: '/seller', icon: Store },
];

const ADMIN_ITEMS = [
  { key: 'nav.admin', path: '/admin', icon: ShieldCheck },
];

const GUEST_ITEMS = [
  { key: 'nav.login', path: '/login', icon: User },
  { key: 'nav.register', path: '/register', icon: User },
];

export default function MobileDrawer({ isOpen, onClose }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { count } = useCart();
  const { user, logout } = useAuth();

  // P0 M-02: Remove useEffect that closes on every route change
  // Now we only close on explicit link clicks via onClick={onClose}
  // This prevents the drawer flicker when navigating internally

  const getActive = (item) => item.path === '/' ? window.location.pathname === '/' : window.location.pathname.startsWith(item.path);

  const renderItems = (items, showBadge = false) => items.map((item) => {
      const Icon = item.icon;
      const active = getActive(item);

      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={onClose}
          aria-current={active ? 'page' : undefined}
          // P0 M-06: Add press feedback on mobile
          className={`flex items-center gap-3 rounded-xl px-4 py-4 text-base font-medium transition-colors active:scale-[0.98] active:bg-accent duration-75 ease-out ${
            active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
          }`}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
          <span>{t(item.key)}</span>
          {showBadge && item.path === '/cart' && count > 0 && (
            <span className="ml-auto min-w-[20px] rounded-full bg-primary px-2 text-[11px] font-bold leading-5 text-primary-foreground">
              {count}
            </span>
          )}
        </Link>
      );
    });

  if (!isOpen) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerPortal>
        <DrawerOverlay className="bg-black/50" onClick={onClose} />
        <DrawerContent className="max-w-md w-full rounded-t-[16px] border-l-0 border-r-0 border-b-0 bg-card/95 backdrop-blur-xl shadow-xl">
          <DrawerHeader className="flex h-16 items-center justify-between border-b border-border px-4 sm:text-left">
            <div className="text-base font-semibold">{t('nav.menu')}</div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
              aria-label={t('nav.close')}
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </DrawerHeader>

          <nav className="flex-1 overflow-y-auto p-4 space-y-6" aria-label={t('nav.menu')}>
            {/* Primary Navigation */}
            <section aria-label={t('nav.primary')}>
              <h3 className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('nav.primary')}
              </h3>
              <div className="space-y-3">
                {renderItems(PRIMARY_ITEMS)}
              </div>
            </section>

            {/* Cart */}
            <section aria-label={t('nav.cart')}>
              <div className="space-y-3">
                {renderItems([{ key: 'nav.cart', path: '/cart', icon: ShoppingBag }], true)}
              </div>
            </section>

            {/* User Account */}
            <section aria-label={t('nav.account')}>
              <h3 className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('nav.account')}
              </h3>
              <div className="space-y-3">
                {user ? (
                  <>
                    {renderItems(USER_ITEMS)}
                    {user.role === 'seller' && renderItems(SELLER_ITEMS)}
                    {user.role === 'admin' && renderItems(ADMIN_ITEMS)}
                    <button
                      type="button"
                      onClick={() => { logout(); onClose(); }}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-4 text-base font-medium text-destructive hover:bg-secondary transition-colors text-left active:bg-accent active:scale-[0.98] duration-75"
                    >
                      <LogOut className="h-6 w-6" aria-hidden="true" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </>
                ) : (
                  renderItems(GUEST_ITEMS)
                )}
              </div>
            </section>
          </nav>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}