import React from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, allowedRoles, fallback = null }: AuthGuardProps) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Prevents layout flickering during load state
  }

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  // Profile-based checking
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role || 'USER';
    const hasRole = allowedRoles.includes(userRole);
    if (!hasRole) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
