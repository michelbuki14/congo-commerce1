import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Compass, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/lib/cart';

const ITEMS = [
  { key: 'nav.home', path: '/', icon: Home },
  { key: 'nav.discover', path: '/discover', icon: Compass },
  { key: 'nav.categories', path: '/categories', icon: LayoutGrid },
  { key: 'nav.cart', path: '/cart', icon: ShoppingBag, badge: true },
  { key: 'nav.profile', path: '/profile', icon: User },
];

export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const { count } = useCart();

  return (
    // Apple Design §12 — translucent material surface with depth
    // P0 M-04: Add safe-area inset for iOS home indicator
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-card/80 backdrop-blur-xl md:hidden pb-[env(safe-area-inset-bottom)]" aria-label="Navigation principale">
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            // Apple Design §1 — respond on pointer-down, not release
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              aria-label={t(item.key)}
              className={`relative flex h-12 flex-col items-center justify-center gap-1 px-2 text-[10px] font-medium transition-transform duration-75 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
              onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
              onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              {item.badge && count > 0 && (
                // Apple Design §11 — subtle scale pulse for badge updates
                <span className="absolute right-2 top-1 min-w-[18px] rounded-full bg-primary px-1 text-[9px] leading-5 text-primary-foreground animate-badge-pulse">
                  {count}
                </span>
              )}
              <span className="sr-only">{t(item.key)}</span>
              {t(item.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}