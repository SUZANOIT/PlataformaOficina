import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isPortalGestorUser } from '../utils/auth';

/** Guarda das rotas /portal/*: somente usuários do Portal do Gestor de Frota. */
export function PortalGestorRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando sua sessão…
      </div>
    );
  }
  if (!isAuthenticated || !user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isPortalGestorUser(user)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
