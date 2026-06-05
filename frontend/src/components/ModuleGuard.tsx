import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UpgradeBlock } from './UpgradeBlock';

interface ModuleGuardProps {
  moduleKey: string;
  moduleName: string;
  children: React.ReactNode;
}

export function ModuleGuard({ moduleKey, moduleName, children }: ModuleGuardProps) {
  const { user } = useAuth();

  if (!user) return null;

  // Administradores da plataforma (MCA CARD) têm acesso ilimitado a todos os módulos
  const isPlatformAdmin = user.companyId === 'mca-padrao-company-uuid-000000000001';
  const hasModule = isPlatformAdmin || (user.activeModules && user.activeModules.includes(moduleKey));

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
