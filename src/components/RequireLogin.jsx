import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * Auth gate for the role consoles. A visitor without a session is sent to the
 * sign-in page carrying the console they asked for, so they land back on it
 * once they are logged in.
 */
export default function RequireLogin() {
  const { pathname, search } = useLocation();
  const returnTo = encodeURIComponent(pathname + search);
  return <ProtectedRoute unauthenticatedElement={<Navigate to={`/login?returnTo=${returnTo}`} replace />} />;
}