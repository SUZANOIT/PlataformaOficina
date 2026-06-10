import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UpgradeBlock } from './UpgradeBlock';

interface ModuleGuardProps {
  moduleKey: string;
  moduleName: string;
  children: React.ReactNode;
}

export function ModuleGuard({ moduleKey, moduleName, children }: ModuleGuardProps) {
  const { user, isLoading } = useAuth();

  if (!user) return null;

  // Administradores da plataforma (MCA CARD) têm acesso ilimitado a todos os módulos
  const isPlatformAdmin = user.companyId === 'mca-padrao-company-uuid-000000000001';
  const activeModules = user.activeModules ?? user.company?.activeModules;
  const hasModule = isPlatformAdmin || (activeModules?.includes(moduleKey) ?? false);

  // Logo após o login o usuário salvo ainda não tem o perfil completo (companyId /
  // activeModules), que só chega após o sync com /auth/me. Enquanto isso, mostra
  // loading em vez de bloquear indevidamente o módulo.
  const profilePending = isLoading || (!user.companyId && !user.company && activeModules === undefined);

  if (!hasModule && profilePending) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Verificando licença do módulo...</p>
        </div>
      </div>
    );
  }

  if (!hasModule) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px] flex items-center justify-center">
        <UpgradeBlock 
          title={`Módulo de ${moduleName} não contratado`} 
          description={`Sua empresa não possui a licença ativa para acessar as ferramentas de ${moduleName}. Entre em contato com o suporte para habilitar este módulo.`}
        />
      </div>
    );
  }

  return <>{children}</>;
}
