import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function SaaSAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Apenas administradores da plataforma (MCA CARD) podem acessar o Dashboard SaaS
  const isPlatformAdmin = user.roleAdmin && user.companyId === 'mca-padrao-company-uuid-000000000001';

  if (!isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
