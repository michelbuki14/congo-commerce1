import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Heart, Bell, Store, ShieldCheck, MessageCircle } from 'lucide-react';
import CurrencyToggle from '@/components/CurrencyToggle';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/lib/AuthContext';

const LINKS = [
  ['/wishlist', 'nav.wishlist', Heart], ['/messages', 'nav.messages', MessageCircle],
  ['/notifications', 'nav.notifications', Bell], ['/seller', 'nav.sellerSpace', Store],
];
export default function HeaderActions({ count }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
      <CurrencyToggle className="hidden sm:inline-flex" />
      <LanguageToggle className="hidden max-w-40 sm:block" />
      <div className="hidden items-center lg:flex">
        {LINKS.map(([to, key, Icon]) => (
          <Link key={to} to={to} aria-label={t(key)} title={t(key)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary">
            <Icon className="h-5 w-5" />
          </Link>
        ))}
        {user?.role === 'admin' && <Link to="/backoffice" aria-label={t('nav.admin')} title={t('nav.admin')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary"><ShieldCheck className="h-5 w-5" /></Link>}
      </div>
      <Link to="/cart" aria-label={`${t('nav.cart')} (${count})`} className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary/50 hover:bg-secondary">
        <ShoppingBag className="h-5 w-5" />
        {count > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-5 text-primary-foreground">{count}</span>}
      </Link>
    </div>
  );
}