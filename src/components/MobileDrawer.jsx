import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { X, LayoutGrid, Compass, ShoppingBag, User, Heart, MessageCircle, Bell, Store, ShieldCheck } from 'lucide-react';
import { useCart } from '@/lib/cart';

const ITEMS = [
  { key: 'nav.home', path: '/', icon: LayoutGrid },
  { key: 'nav.discover', path: '/discover', icon: Compass },
  { key: 'nav.categories', path: '/categories', icon: LayoutGrid },
  { key: 'nav.cart', path: '/cart', icon: ShoppingBag, badge: true },
  { key: 'nav.profile', path: '/profile', icon: User },
  { key: 'nav.wishlist', path: '/wishlist', icon: Heart },
  { key: 'nav.messages', path: '/messages', icon: MessageCircle },
  { key: 'nav.notifications', path: '/notifications', icon: Bell },
  { key: 'nav.sellerSpace', path: '/seller', icon: Store },
  { key: 'nav.admin', path: '/admin', icon: ShieldCheck },
];

export default function MobileDrawer({ isOpen, onClose }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { count } = useCart();

  // Close drawer when route changes
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-card shadow-xl md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.menu')}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-semibold">{t('nav.menu')}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('nav.close')}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2" aria-label={t('nav.menu')}>
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.path === '/' ? window.location.pathname === '/' : window.location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{t(item.key)}</span>
                {item.badge && (
                  <span className="ml-auto min-w-[18px] rounded-full bg-primary px-1.5 text-[11px] font-bold leading-5 text-primary-foreground">
                    {/* Badge count would need cart context here, omitted for brevity */}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}