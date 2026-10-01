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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur md:hidden shadow-sm" aria-label="Navigation principale">
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              aria-label={t(item.key)}
              className={`relative flex h-12 flex-col items-center justify-center gap-1 px-2 text-[10px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              {item.badge && count > 0 && (
                <span className="absolute right-2 top-1 min-w-[18px] rounded-full bg-primary px-1 text-[9px] leading-5 text-primary-foreground">
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