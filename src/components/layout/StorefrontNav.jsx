import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/AuthContext';

const ALL_LINKS = [['/', 'nav.home'], ['/discover', 'nav.discover'], ['/categories', 'nav.categories'], ['/wishlist', 'nav.wishlist'], ['/messages', 'nav.messages'], ['/notifications', 'nav.notifications'], ['/seller', 'nav.sellerSpace'], ['/admin', 'nav.admin'], ['/profile', 'nav.profile']];

function filteredLinks(user, t) {
  const role = user?.role || 'user';
  return ALL_LINKS.filter(([to]) => {
    if (to === '/seller') return role === 'admin' || role === 'seller';
    if (to === '/admin') return role === 'admin';
    return true;
  });
}

export default function StorefrontNav() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const links = filteredLinks(user, t);
  return (
    <nav aria-label={t('nav.categories')} className="hidden border-t border-border/60 md:block">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6">
        {links.map(([to, key]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex min-h-11 shrink-0 items-center border-b-2 px-3 text-xs font-semibold ${isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t(key)}</NavLink>)}
      </div>
    </nav>
  );
}