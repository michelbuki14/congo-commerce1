import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, Heart, Bell, Store, ShieldCheck } from 'lucide-react';
import { useCart } from '@/lib/cart';
import CurrencyToggle from '@/components/CurrencyToggle';
import BrandLogo from '@/components/BrandLogo';

export default function TopBar() {
  const navigate = useNavigate();
  const { count } = useCart();
  const [term, setTerm] = useState('');

  const submit = (e) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-3 py-2.5 md:px-6">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Congo Commerce">
          <BrandLogo />
        </Link>

        <form onSubmit={submit} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Rechercher un produit, une boutique…"
            className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </form>

        <CurrencyToggle className="hidden sm:inline-flex" />

        <div className="flex items-center gap-1">
          <Link to="/wishlist" className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-secondary sm:flex">
            <Heart className="h-5 w-5" />
          </Link>
          <Link to="/notifications" className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-secondary sm:flex">
            <Bell className="h-5 w-5" />
          </Link>
          <Link to="/seller" className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-secondary md:flex" title="Espace vendeur">
            <Store className="h-5 w-5" />
          </Link>
          <Link to="/admin" className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-secondary md:flex" title="Administration">
            <ShieldCheck className="h-5 w-5" />
          </Link>
          <Link to="/cart" className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-[18px] text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}