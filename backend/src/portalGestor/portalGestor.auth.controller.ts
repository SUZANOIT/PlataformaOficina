import { Request, Response } from 'express';
import { REVOKE_SESSIONS, signUserToken } from '../lib/security/session';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { basePrisma } from '../lib/prisma';
import { AuditLogger } from '../utils/audit.logger';
import { handlePortalError, onlyDigits, PORTAL_INITIAL_PASSWORD, PORTAL_ROLE } from './portalGestor.scope';

// Hash fictício: mesmo custo de comparação quando o CNPJ não tem acesso (evita enumeração)
const DUMMY_HASH = bcrypt.hashSync('dummy-password-not-used', 10);

const loginSchema = z.object({
  cnpj: z.string(),
  password: z.string().min(1),
  companyId: z.string().optional(),
});

function portalUserPayload(user: any) {
  const client = user.client;
  const company = user.company;
  return {
    id: user.id,
    nome: user.name,
    name: user.name,
    email: user.email,
    role: PORTAL_ROLE,
    isPortalGestor: true,
    clientId: user.clientId,
    companyId: user.companyId,
    cliente: client ? {
      id: client.id,
      nome: client.nome,
      empresa: client.empresa,
      cnpj: client.cnpj,
    } : null,
    oficina: company ? {
      id: company.id,
      nome: company.nomeFantasia || company.razaoSocial,
      telefone: company.telefone,
      whatsapp: company.whatsapp,
      email: company.email,
      logo: company.logo,
    } : null,
  };
}

/** Localiza usuários do portal cujo cliente possui o CNPJ informado (comparação só por dígitos). */
async function findPortalUsersByCnpj(cnpjDigits: string) {
  const rows = await basePrisma.$queryRaw<{ id: string }[]>`
    SELECT u."id" FROM "User" u
    JOIN "Client" c ON c."id" = u."clientId"
    WHERE u."clientId" IS NOT NULL
      AND regexp_replace(COALESCE(c."cnpj", ''), '\\D', '', 'g') = ${cnpjDigits}
  `;
  if (rows.length === 0) return [];
  return basePrisma.user.findMany({
    where: { id: { in: rows.map(r => r.id) } },
    include: { client: true, company: true },
  });
}

export const PortalGestorAuthController = {
  /** POST /auth/portal-login  { cnpj, password, companyId? } */
  async login(req: Request, res: Response) {
    try {
      const { cnpj, password, companyId } = loginSchema.parse(req.body);
      const digits = onlyDigits(cnpj);
      if (digits.length !== 14) {
        return res.status(400).json({ error: 'Informe o CNPJ da empresa com 14 dígitos.' });
      }

      const candidates = await findPortalUsersByCnpj(digits);
      const matches: any[] = [];
      for (const u of candidates) {
        if (await bcrypt.compare(password, u.password)) matches.push(u);
      }
      if (candidates.length === 0) await bcrypt.compare(password, DUMMY_HASH);

      if (matches.length === 0) {
        AuditLogger.log(null, null, 'PORTAL_GESTOR_LOGIN', `Falha de login para CNPJ ${digits}`, 'ERROR');
        return res.status(400).json({ error: 'CNPJ ou senha inválidos.' });
      }

      let user = matches[0];
      if (matches.length > 1) {
        const chosen = companyId ? matches.find(m => m.companyId === companyId) : null;
        if (!chosen) {
          return res.status(409).json({
            error: 'SELECT_WORKSHOP',
            message: 'Este CNPJ possui acesso em mais de uma oficina. Selecione a oficina.',
            oficinas: matches.map(m => ({ companyId: m.companyId, nome: m.company?.nomeFantasia || m.company?.razaoSocial })),
          });
        }
        user = chosen;
      }

      if (user.status !== 'ATIVO' || !user.client || user.client.status === 'INATIVO') {
        return res.status(403).json({ error: 'Acesso ao portal bloqueado. Entre em contato com a oficina.' });
      }
      if (!user.companyId || user.client.companyId !== user.companyId) {
        return res.status(403).json({ error: 'Cadastro de acesso inconsistente. Entre em contato com a oficina.' });
      }

      if (user.mustChangePassword) {
        const tempToken = signUserToken(user, { requirePasswordChange: true }, '1h');
        return res.status(403).json({
          error: 'REQUIRE_PASSWORD_CHANGE',
          message: 'Você deve definir uma nova senha no primeiro acesso.',
          tempToken,
        });
      }

      const token = signUserToken(user, { portal: true }, '1d');
      AuditLogger.log(user.id, user.companyId, 'PORTAL_GESTOR_LOGIN', `Login do gestor do cliente ${user.clientId}`, 'SUCCESS');
      return res.json({ token, user: portalUserPayload(user) });
    } catch (error) {
      return handlePortalError(res, error, 'login');
    }
  },

  /** GET /auth/me para usuários do portal (não expõe dados internos da oficina). */
  async me(req: Request, res: Response) {
    try {
      const user = await basePrisma.user.findUnique({
        where: { id: (req as any).userId },
        include: { client: true, company: true },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json(portalUserPayload(user));
    } catch (error) {
      return handlePortalError(res, error, 'me');
    }
  },
};

// ---------------------------------------------------------------------------
// Gestão do acesso pela oficina (tela de Clientes)
// ---------------------------------------------------------------------------

function requireAdmin(req: Request, res: Response) {
  if (!(req as any).roles?.admin) {
    res.status(403).json({ error: 'Somente administradores podem gerenciar o acesso ao Portal do Gestor de Frota.' });
    return false;
  }
  return true;
}

async function loadTenantClient(req: Request) {
  const companyId = (req as any).companyId as string | undefined;
  if (!companyId) return null;
  return basePrisma.client.findFirst({ where: { id: req.params.id as string, companyId } });
}

function accessView(user: any) {
  if (!user) return { hasAccess: false };
  return {
    hasAccess: true,
    userId: user.id,
    login: onlyDigits(user.client?.cnpj),
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  };
}

export const PortalAccessController = {
  /** GET /registry/clients/:id/portal-access */
  async get(req: Request, res: Response) {
    try {
      if (!requireAdmin(req, res)) return;
      const client = await loadTenantClient(req);
      if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
      const user = await basePrisma.user.findFirst({ where: { clientId: client.id, companyId: client.companyId }, include: { client: true } });
      return res.json(accessView(user));
    } catch (error) {
      return handlePortalError(res, error, 'access.get');
    }
  },

  /**
   * POST /registry/clients/:id/portal-access
   * Cria o acesso (login = CNPJ, senha inicial padrão) ou, se já existir, redefine a senha inicial.
   */
  async createOrReset(req: Request, res: Response) {
    try {
      if (!requireAdmin(req, res)) return;
      const client = await loadTenantClient(req);
      if (!client || !client.companyId) return res.status(404).json({ error: 'Cliente não encontrado' });

      const digits = onlyDigits(client.cnpj);
      if (digits.length !== 14) {
        return res.status(400).json({ error: 'O portal é exclusivo para clientes PJ. Cadastre um CNPJ válido (14 dígitos) no cliente.' });
      }

      // Não permitir duplicidade: outro cadastro do mesmo CNPJ nesta oficina já com acesso
      const duplicates = await basePrisma.$queryRaw<{ id: string }[]>`
        SELECT u."id" FROM "User" u
        JOIN "Client" c ON c."id" = u."clientId"
        WHERE u."companyId" = ${client.companyId}
          AND c."id" <> ${client.id}
          AND regexp_replace(COALESCE(c."cnpj", ''), '\\D', '', 'g') = ${digits}
      `;
      if (duplicates.length > 0) {
        return res.status(409).json({
          error: 'Já existe acesso ao portal para outro cadastro com este CNPJ. Unifique os clientes duplicados antes de gerar o acesso.',
          code: 'DUPLICATE_RECORD',
        });
      }

      const hashed = await bcrypt.hash(PORTAL_INITIAL_PASSWORD, 10);
      const existing = await basePrisma.user.findFirst({ where: { clientId: client.id, companyId: client.companyId } });

      let user;
      if (existing) {
        user = await basePrisma.user.update({
          where: { id: existing.id },
          data: { password: hashed, mustChangePassword: true, status: 'ATIVO', ...REVOKE_SESSIONS },
          include: { client: true },
        });
        AuditLogger.log((req as any).userId, client.companyId, 'PORTAL_GESTOR_RESET', `Senha inicial redefinida para cliente ${client.id}`, 'SUCCESS');
      } else {
        user = await basePrisma.user.create({
          data: {
            name: client.empresa || client.nome,
            email: `gestor.${digits}.${client.companyId.slice(0, 8)}@portal-gestor.local`,
            password: hashed,
            role: PORTAL_ROLE,
            status: 'ATIVO',
            mustChangePassword: true,
            companyId: client.companyId,
            clientId: client.id,
          },
          include: { client: true },
        });
        AuditLogger.log((req as any).userId, client.companyId, 'PORTAL_GESTOR_CREATE', `Acesso criado para cliente ${client.id}`, 'SUCCESS');
      }

      return res.status(existing ? 200 : 201).json({ ...accessView(user), senhaInicial: PORTAL_INITIAL_PASSWORD });
    } catch (error) {
      return handlePortalError(res, error, 'access.createOrReset');
    }
  },

  /** PUT /registry/clients/:id/portal-access/status  { status: 'ATIVO' | 'INATIVO' } */
  async setStatus(req: Request, res: Response) {
    try {
      if (!requireAdmin(req, res)) return;
      const status = z.enum(['ATIVO', 'INATIVO']).parse(req.body?.status);
      const client = await loadTenantClient(req);
      if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
      const existing = await basePrisma.user.findFirst({ where: { clientId: client.id, companyId: client.companyId } });
      if (!existing) return res.status(404).json({ error: 'Este cliente ainda não possui acesso ao portal.' });
      const user = await basePrisma.user.update({
        where: { id: existing.id },
        data: { status, ...(status === 'INATIVO' ? REVOKE_SESSIONS : {}) },
        include: { client: true },
      });
      AuditLogger.log((req as any).userId, client.companyId, 'PORTAL_GESTOR_STATUS', `Acesso ${status} para cliente ${client.id}`, 'SUCCESS');
      return res.json(accessView(user));
    } catch (error) {
      return handlePortalError(res, error, 'access.setStatus');
    }
  },
};
