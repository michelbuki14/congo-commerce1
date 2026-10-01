import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ShoppingBag, Heart, Bell, Store, ShieldCheck, MessageCircle } from 'lucide-react';
import { useCart } from '@/lib/cart';
import CurrencyToggle from '@/components/CurrencyToggle';
import LanguageToggle from '@/components/LanguageToggle';
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import MobileDrawer from '@/components/MobileDrawer';

export default function TopBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { count } = useCart();
  const [term, setTerm] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur pt-[env(safe-area-inset-top)]">
              <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Ouvrir le menu"
            aria-expanded={false}
            aria-controls="mobile-drawer"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

<div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-3 py-2.5 md:px-6">
        <Link to="/" className="flex shrink-0 items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md" aria-label="Congo Commerce — accueil">
          <BrandLogo />
        </Link>

        <form onSubmit={submit} className="relative flex-1" role="search">
          <label htmlFor="site-search" className="sr-only">
            {t('nav.searchPlaceholder')}
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="site-search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t('nav.searchPlaceholder')}
            className="h-11 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>

        <CurrencyToggle className="hidden sm:inline-flex" />
        <LanguageToggle className="hidden h-11 sm:block" />
          <ThemeToggle className="hidden sm:inline-flex" />

        <div className="flex items-center gap-1">
          <Link to="/wishlist" aria-label={t('nav.wishlist')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Heart className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link to="/messages" aria-label={t('nav.messages')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary sm:flex focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link to="/notifications" aria-label={t('nav.notifications')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary sm:flex focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link to="/seller" aria-label={t('nav.sellerSpace')} className="hidden h-11 w-11 items-center justify-center rounded-full hover:bg-secondary md:flex focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Store className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link to="/admin" aria-label={t('nav.admin')} className="hidden h-11 w-11 items-center justify-center rounded-full hover:bg-secondary md:flex focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link to="/cart" aria-label={t('nav.cart')} className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-[20px] rounded-full bg-primary px-1.5 text-center text-[10px] font-bold leading-5 text-primary-foreground">
                {count}
                <span className="sr-only">articles dans le panier</span>
              </span>
            )}
          </Link>
        </div>
      </div>
    
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}