import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSaaSAuth } from '../hooks/useSaaSAuth';
import { ShieldAlert } from 'lucide-react';

interface SaaSAuthGuardProps {
  children: React.ReactNode;
  permission?: string;
}

export function SaaSAuthGuard({ children, permission }: SaaSAuthGuardProps) {
  const { isAuthenticated, isLoading, hasPermission } = useSaaSAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-slate-950 text-slate-200">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm font-medium">Verificando credenciais do SaaS...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/administracao/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 rounded-full bg-red-500/10 p-4 text-red-500">
          <ShieldAlert size={48} />
        </div>
        <h3 className="text-lg font-bold text-slate-100">Acesso Restrito</h3>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          Seu perfil de acesso administrativo não possui a permissão necessária ('{permission}') para visualizar esta seção.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
