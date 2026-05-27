import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Premium loading interface during initialization
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin"></div>
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground animate-pulse">
            Carregando sua sessão
          </h3>
          <p className="text-xs text-slate-400">Verificando segurança...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirects to login, capturing the previous path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Profile authorization check
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role || 'USER';
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
