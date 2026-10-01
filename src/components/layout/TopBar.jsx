import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ShoppingBag, Heart, Bell, Store, ShieldCheck, MessageCircle, Menu, User, ChevronDown, LogOut } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/AuthContext';
import CurrencyToggle from '@/components/CurrencyToggle';
import LanguageToggle from '@/components/LanguageToggle';
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import MobileDrawer from '@/components/MobileDrawer';

export default function TopBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { count } = useCart();
  const { user, logout } = useAuth();
  const [term, setTerm] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
        aria-label={t('nav.menu')}
        aria-expanded={drawerOpen}
        aria-controls="mobile-drawer"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-3 py-2.5 md:px-6">
        <Link to="/" className="flex shrink-0 items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md" aria-label="Congo Commerce — accueil">
          <BrandLogo />
        </Link>

        {/* Primary Navigation - visible on desktop */}
        <nav className="hidden md:flex items-center gap-1 mx-2" aria-label={t('nav.primary')}>
          <Link
            to="/"
            className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-secondary transition-colors"
            aria-current={window.location.pathname === '/' ? 'page' : undefined}
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/discover"
            className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-secondary transition-colors"
            aria-current={window.location.pathname.startsWith('/discover') ? 'page' : undefined}
          >
            {t('nav.discover')}
          </Link>
          <Link
            to="/categories"
            className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-secondary transition-colors"
            aria-current={window.location.pathname.startsWith('/categories') ? 'page' : undefined}
          >
            {t('nav.categories')}
          </Link>
        </nav>

        <form onSubmit={submit} className="relative flex-1 max-w-xl md:max-w-md" role="search">
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

        <div className="flex items-center gap-2">
          <CurrencyToggle className="hidden sm:inline-flex" />
          <LanguageToggle className="hidden h-11 sm:block" />
          <ThemeToggle className="hidden sm:inline-flex" />

          {/* User actions - desktop */}
          <div className="flex items-center gap-1">
            <Link
              to="/wishlist"
              aria-label={t('nav.wishlist')}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              to="/messages"
              aria-label={t('nav.messages')}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary sm:flex focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              to="/notifications"
              aria-label={t('nav.notifications')}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary sm:flex focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
            </Link>

            {/* User menu dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label={user ? t('nav.profile') : t('nav.login')}
              >
                <User className="h-5 w-5" aria-hidden="true" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} aria-hidden="true" />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-xl border border-border bg-card py-2 shadow-lg animate-in fade-in-0 zoom-in-95">
                    {user ? (
                      <>
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary"
                        >
                          <User className="h-4 w-4" aria-hidden="true" />
                          {t('nav.profile')}
                        </Link>
                        <Link
                          to="/wishlist"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary"
                        >
                          <Heart className="h-4 w-4" aria-hidden="true" />
                          {t('nav.wishlist')}
                        </Link>
                        <Link
                          to="/messages"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary"
                        >
                          <MessageCircle className="h-4 w-4" aria-hidden="true" />
                          {t('nav.messages')}
                        </Link>
                        <Link
                          to="/notifications"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary"
                        >
                          <Bell className="h-4 w-4" aria-hidden="true" />
                          {t('nav.notifications')}
                        </Link>
                        {user.role === 'seller' && (
                          <Link
                            to="/seller"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary"
                          >
                            <Store className="h-4 w-4" aria-hidden="true" />
                            {t('nav.sellerSpace')}
                          </Link>
                        )}
                        {user.role === 'admin' && (
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary"
                          >
                            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                            {t('nav.admin')}
                          </Link>
                        )}
                        <hr className="my-2 border-border" />
                        <button
                          type="button"
                          onClick={() => { logout(); setUserMenuOpen(false); }}
                          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-secondary"
                        >
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          {t('nav.logout')}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-sm font-medium">{t('nav.guest')}</p>
                          <p className="text-xs text-muted-foreground">{t('nav.guestDesc')}</p>
                        </div>
                        <Link
                          to="/login"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary"
                        >
                          <User className="h-4 w-4" aria-hidden="true" />
                          {t('nav.login')}
                        </Link>
                        <Link
                          to="/register"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary"
                        >
                          <User className="h-4 w-4" aria-hidden="true" />
                          {t('nav.register')}
                        </Link>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <Link
              to="/cart"
              aria-label={t('nav.cart')}
              className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-[20px] rounded-full bg-primary px-1.5 text-center text-[10px] font-bold leading-5 text-primary-foreground">
                  {count}
                  <span className="sr-only">{t('cart.items', { count })}</span>
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}