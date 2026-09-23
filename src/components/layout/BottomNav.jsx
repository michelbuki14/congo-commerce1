import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/lib/cart';

const ITEMS = [
  { label: 'Accueil', path: '/', icon: Home },
  { label: 'Découvrir', path: '/discover', icon: Compass },
  { label: 'Catégories', path: '/categories', icon: LayoutGrid },
  { label: 'Panier', path: '/cart', icon: ShoppingBag, badge: true },
  { label: 'Profil', path: '/profile', icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const { count } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              {item.badge && count > 0 && (
                <span className="absolute right-[22%] top-0.5 min-w-[16px] rounded-full bg-primary px-1 text-[9px] leading-4 text-primary-foreground">
                  {count}
                </span>
              )}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}