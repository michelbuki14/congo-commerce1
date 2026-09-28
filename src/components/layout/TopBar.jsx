import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useCart } from '@/lib/cart';
import HeaderActions from '@/components/layout/HeaderActions';
import StorefrontNav from '@/components/layout/StorefrontNav';
import BrandLogo from '@/components/BrandLogo';

export default function TopBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { count } = useCart();
  const [term, setTerm] = useState('');

  const submit = (e) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-3 py-3 md:px-6">
        <Link to="/" className="flex shrink-0 items-center rounded-lg bg-foreground px-3 py-1 dark:bg-background" aria-label="Congo Commerce">
          <BrandLogo />
        </Link>

        <form role="search" onSubmit={submit} className="relative order-last w-full lg:order-none lg:min-w-48 lg:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t('nav.searchPlaceholder')}
            aria-label={t('nav.searchPlaceholder')}
            type="search"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-12 text-sm focus:border-primary"
          />
          <button type="submit" aria-label={t('nav.searchPlaceholder')} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-xl text-primary hover:bg-secondary"><Search className="h-4 w-4" /></button>
        </form>
        <HeaderActions count={count} />
      </div>
      <StorefrontNav />
    </header>
  );
}