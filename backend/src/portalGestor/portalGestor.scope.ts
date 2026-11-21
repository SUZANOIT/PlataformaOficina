import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { basePrisma } from '../lib/prisma';

/**
 * Escopo de acesso do Portal do Gestor de Frota.
 *
 * Toda consulta do portal usa o basePrisma (sem a extensão de tenant, que possui
 * exceções para Quote/Vehicle) e aplica SEMPRE os dois filtros abaixo:
 *   companyId -> oficina (tenant) dona do cadastro do cliente
 *   clientId  -> cliente PJ autenticado
 */
export interface PortalScope {
  userId: string;
  companyId: string;
  clientId: string;
}

export const PORTAL_ROLE = 'GESTOR_FROTA';

/** Senha inicial padrão do portal (troca obrigatória no primeiro acesso). */
export const PORTAL_INITIAL_PASSWORD = '#12345678*';

export const onlyDigits = (v?: string | null) => (v || '').replace(/\D/g, '');

/** Rotas que um usuário do portal pode acessar (verificado no authMiddleware). */
export function isPortalAllowedPath(path: string) {
  return path === '/auth/me' || path === '/portal-gestor' || path.startsWith('/portal-gestor/');
}

export function getPortalScope(req: Request): PortalScope {
  const scope = (req as any).portalScope as PortalScope | undefined;
  if (!scope || !scope.companyId || !scope.clientId) {
    const err: any = new Error('Acesso restrito ao Portal do Gestor de Frota');
    err.status = 403;
    throw err;
  }
  return scope;
}

/** Middleware: exige usuário do portal (usuários da oficina não acessam /portal-gestor). */
export function requirePortalUser(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).portalScope) {
    return res.status(403).json({ error: 'Acesso restrito ao Portal do Gestor de Frota', code: 'PORTAL_ONLY' });
  }
  return next();
}

/** Veículos do cliente: o vínculo é Vehicle.clienteId -> Client (que pertence ao tenant). */
export function vehicleWhere(scope: PortalScope, extra: Prisma.VehicleWhereInput = {}): Prisma.VehicleWhereInput {
  return { ...extra, clienteId: scope.clientId, client: { companyId: scope.companyId } };
}

export async function getClientVehicleIds(scope: PortalScope): Promise<string[]> {
  const vehicles = await basePrisma.vehicle.findMany({ where: vehicleWhere(scope), select: { id: true } });
  return vehicles.map(v => v.id);
}

/**
 * Orçamentos/OS da empresa: emitidos pela oficina (companyId) para o cliente
 * (clientId) ou para um veículo que pertence ao cliente.
 */
export function quoteWhere(scope: PortalScope, vehicleIds: string[], extra: Prisma.QuoteWhereInput = {}): Prisma.QuoteWhereInput {
  const or: Prisma.QuoteWhereInput[] = [{ clientId: scope.clientId }];
  if (vehicleIds.length > 0) or.push({ veiculoId: { in: vehicleIds } });
  return { AND: [extra, { companyId: scope.companyId }, { OR: or }] };
}

export async function findScopedQuote(scope: PortalScope, quoteId: string, include?: Prisma.QuoteInclude) {
  const vehicleIds = await getClientVehicleIds(scope);
  return basePrisma.quote.findFirst({ where: quoteWhere(scope, vehicleIds, { id: quoteId }), include });
}

export async function findScopedVehicle(scope: PortalScope, vehicleId: string) {
  return basePrisma.vehicle.findFirst({ where: vehicleWhere(scope, { id: vehicleId }) });
}

/** Resposta de erro padronizada (404 para registros fora do escopo, nunca 403, para não revelar existência). */
export function handlePortalError(res: Response, error: any, context: string) {
  if (error?.status) return res.status(error.status).json({ error: error.message });
  if (error?.name === 'ZodError') return res.status(400).json({ error: 'Dados inválidos', details: error.issues || error.errors });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
  }
  console.error(`[PortalGestor] ${context}:`, error);
  return res.status(500).json({ error: 'Erro interno no Portal do Gestor de Frota' });
}
