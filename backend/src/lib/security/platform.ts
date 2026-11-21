/** Empresa dona da plataforma (MCA Gestão de Oficina): seus administradores gerenciam o SaaS. */
export const PLATFORM_COMPANY_ID = 'mca-padrao-company-uuid-000000000001';

interface PlatformUserLike {
  role?: string | null;
  roleAdmin?: boolean | null;
  companyId?: string | null;
  clientId?: string | null;
}

/**
 * Administrador da plataforma: SUPER_ADMIN ou administrador da empresa da plataforma.
 * Sempre avaliado sobre o cadastro do usuário (nunca sobre o tenant escolhido na requisição).
 */
export function isPlatformAdmin(user: PlatformUserLike | null | undefined): boolean {
  if (!user || user.clientId) return false;
  return user.role === 'SUPER_ADMIN' || (!!user.roleAdmin && user.companyId === PLATFORM_COMPANY_ID);
}
