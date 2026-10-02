import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { X, LayoutGrid, Compass, ShoppingBag, User, Heart, MessageCircle, Bell, Store, ShieldCheck, LogOut } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/AuthContext';

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
  const { user } = useAuth();

  // Close drawer when route changes
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  if (!isOpen) return null;

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
          className={`flex items-center gap-3 rounded-xl px-4 py-4 text-base font-medium transition-colors ${
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

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card shadow-xl md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label={t('nav.menu')}
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <span className="text-base font-semibold">{t('nav.menu')}</span>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t('nav.close')}
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

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
                                                        onClick={() => {
                                                          // We need to get logout from auth context
                                                          // For now, use the base44 logout directly
                                                          import('@/api/base44Client').then(({ base44 }) => {
                                                            base44.auth.logout(window.location.href);
                                                          });
                                                          onClose();
                                                        }}
                                                        className="flex w-full items-center gap-3 rounded-xl px-4 py-4 text-base font-medium text-destructive hover:bg-secondary transition-colors text-left"
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
      </aside>
    </>
  );
}