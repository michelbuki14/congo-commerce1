import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

/** Nested inside RequireLogin: the marketplace console is for admin accounts. */
export default function AdminOnly() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 text-base font-bold">Accès réservé aux administrateurs</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Votre compte n'a pas les droits d'administration de la place de marché.
        </p>
      </div>
    );
  }

  return <Outlet />;
}