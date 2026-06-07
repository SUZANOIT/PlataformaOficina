import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AlertTriangle, Home } from 'lucide-react';

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = 
    user.role === 'SUPER_ADMIN' || 
    (user.roleAdmin && user.companyId === 'mca-padrao-company-uuid-000000000001');

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6 bg-card border border-border rounded-2xl p-8 shadow-xl animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">403 - Acesso Negado</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Você não tem permissão para acessar esta área administrativa do SaaS. Este módulo é restrito apenas para super administradores do sistema.
            </p>
          </div>
          <div className="pt-4">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-xl transition shadow-sm"
            >
              <Home size={16} />
              Voltar ao Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
