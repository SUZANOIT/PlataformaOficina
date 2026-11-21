import { Request, Response } from 'express';
import { z } from 'zod';
import { basePrisma } from '../lib/prisma';
import { AuditLogger } from '../utils/audit.logger';
import { getPortalScope, handlePortalError } from '../portalGestor/portalGestor.scope';
import {
  Actor, FlowError, SOLICITACAO_STATUS,
  abrirSolicitacaoOficina, criarSolicitacao, gerarOrdemServico, getSolicitacaoCliente,
  listarNotificacoes, listarSolicitacoesCliente, listarSolicitacoesOficina, marcarEmAnalise,
  marcarNotificacaoLida, marcarTodasLidas, recusarPelaOficina, vincularOrcamento, withOs,
} from './manutencao.service';

function handle(res: Response, error: any, context: string) {
  if (error instanceof FlowError) return res.status(error.status).json({ error: error.message, code: error.code });
  return handlePortalError(res, error, context);
}

async function userName(userId?: string) {
  if (!userId) return 'Usuário';
  const u = await basePrisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return u?.name || 'Usuário';
}

// ---------------------------------------------------------------------------
// Portal do Gestor de Frota (cliente)
// ---------------------------------------------------------------------------

const novaSolicitacaoSchema = z.object({
  vehicleId: z.string().min(1, 'Selecione o veículo.'),
  descricao: z.string().trim().min(5, 'Descreva o problema ou serviço desejado (mínimo de 5 caracteres).').max(4000),
  km: z.coerce.number({ error: 'Informe a KM atual do veículo.' })
    .int('Informe a KM atual do veículo (número inteiro).')
    .positive('Informe a KM atual do veículo.')
    .max(9_999_999, 'KM atual inválida.'),
});

async function clienteActor(req: Request): Promise<Actor> {
  const scope = getPortalScope(req);
  return { userId: scope.userId, nome: `${await userName(scope.userId)} (cliente)`, perfil: 'CLIENTE' };
}

export const ManutencaoPortalController = {
  async listar(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      return res.json(await withOs(await listarSolicitacoesCliente(scope)));
    } catch (e) { return handle(res, e, 'manutencao.listar'); }
  },

  async criar(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const data = novaSolicitacaoSchema.parse(req.body);
      const s = await criarSolicitacao(scope, await clienteActor(req), data);
      AuditLogger.log(scope.userId, scope.companyId, 'PORTAL_GESTOR_SOLICITACAO', `Solicitação #${s.protocolo} enviada`, 'SUCCESS');
      const [view] = await withOs([s]);
      return res.status(201).json(view);
    } catch (e: any) {
      if (e?.name === 'ZodError') return res.status(400).json({ error: e.issues?.[0]?.message || 'Dados inválidos' });
      return handle(res, e, 'manutencao.criar');
    }
  },

  async detalhe(req: Request, res: Response) {
    try {
      const s = await getSolicitacaoCliente(getPortalScope(req), req.params.id as string);
      const [view] = await withOs([s]);
      return res.json(view);
    } catch (e) { return handle(res, e, 'manutencao.detalhe'); }
  },

  async gerarOs(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const km = Number(req.body?.km);
      const { os, solicitacao } = await gerarOrdemServico(scope, await clienteActor(req), req.params.id as string, km);
      AuditLogger.log(scope.userId, scope.companyId, 'PORTAL_GESTOR_OS', `OS nº ${os.numero} gerada (solicitação #${solicitacao.protocolo})`, 'SUCCESS');
      const [view] = await withOs([solicitacao]);
      return res.status(201).json(view);
    } catch (e) { return handle(res, e, 'manutencao.gerarOs'); }
  },

  async notificacoes(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      return res.json(await listarNotificacoes(scope.userId, scope.companyId, { limit: Number(req.query.limit) || 30, apenasNaoLidas: req.query.naoLidas === '1' }));
    } catch (e) { return handle(res, e, 'manutencao.notificacoes'); }
  },

  async marcarLida(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      await marcarNotificacaoLida(scope.userId, scope.companyId, req.params.id as string);
      return res.status(204).send();
    } catch (e) { return handle(res, e, 'manutencao.marcarLida'); }
  },

  async marcarTodas(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      return res.json({ atualizadas: await marcarTodasLidas(scope.userId, scope.companyId) });
    } catch (e) { return handle(res, e, 'manutencao.marcarTodas'); }
  },
};

// ---------------------------------------------------------------------------
// Oficina
// ---------------------------------------------------------------------------

/** Solicitações: Administrador ou Orçamentista da oficina. */
function oficinaScope(req: Request, res: Response) {
  const companyId = (req as any).companyId as string | undefined;
  const roles = (req as any).roles || {};
  if ((req as any).portalScope || !companyId) {
    res.status(403).json({ error: 'Acesso restrito à oficina.' });
    return null;
  }
  if (!roles.admin && !roles.orcamentista) {
    res.status(403).json({ error: 'Somente Administrador ou Orçamentista podem tratar solicitações de orçamento.' });
    return null;
  }
  return { companyId, userId: (req as any).userId as string };
}

async function oficinaActor(userId: string): Promise<Actor> {
  return { userId, nome: `${await userName(userId)} (oficina)`, perfil: 'OFICINA' };
}

export const ManutencaoOficinaController = {
  async listar(req: Request, res: Response) {
    const scope = oficinaScope(req, res); if (!scope) return;
    try {
      const status = req.query.status ? String(req.query.status) : undefined;
      if (status && !(status in SOLICITACAO_STATUS)) return res.status(400).json({ error: 'Status inválido.' });
      return res.json(await withOs(await listarSolicitacoesOficina(scope.companyId, { status })));
    } catch (e) { return handle(res, e, 'oficina.listar'); }
  },

  async detalhe(req: Request, res: Response) {
    const scope = oficinaScope(req, res); if (!scope) return;
    try {
      const s = await abrirSolicitacaoOficina(scope.companyId, await oficinaActor(scope.userId), req.params.id as string);
      const [view] = await withOs([s]);
      return res.json(view);
    } catch (e) { return handle(res, e, 'oficina.detalhe'); }
  },

  async emAnalise(req: Request, res: Response) {
    const scope = oficinaScope(req, res); if (!scope) return;
    try {
      const [view] = await withOs([await marcarEmAnalise(scope.companyId, await oficinaActor(scope.userId), req.params.id as string)]);
      return res.json(view);
    } catch (e) { return handle(res, e, 'oficina.emAnalise'); }
  },

  async recusar(req: Request, res: Response) {
    const scope = oficinaScope(req, res); if (!scope) return;
    try {
      const motivo = z.string().trim().min(3, 'Informe o motivo da recusa.').max(2000).parse(req.body?.motivo);
      const [view] = await withOs([await recusarPelaOficina(scope.companyId, await oficinaActor(scope.userId), req.params.id as string, motivo)]);
      return res.json(view);
    } catch (e: any) {
      if (e?.name === 'ZodError') return res.status(400).json({ error: e.issues?.[0]?.message || 'Dados inválidos' });
      return handle(res, e, 'oficina.recusar');
    }
  },

  async vincular(req: Request, res: Response) {
    const scope = oficinaScope(req, res); if (!scope) return;
    try {
      const quoteId = z.string().min(1).parse(req.body?.quoteId);
      const [view] = await withOs([await vincularOrcamento(scope.companyId, await oficinaActor(scope.userId), req.params.id as string, quoteId)]);
      return res.json(view);
    } catch (e: any) {
      if (e?.name === 'ZodError') return res.status(400).json({ error: 'Informe o orçamento.' });
      return handle(res, e, 'oficina.vincular');
    }
  },

  // Notificações de qualquer usuário da oficina (cada um vê só as suas)
  async notificacoes(req: Request, res: Response) {
    const companyId = (req as any).companyId as string | undefined;
    if ((req as any).portalScope || !companyId) return res.status(403).json({ error: 'Acesso restrito à oficina.' });
    try {
      return res.json(await listarNotificacoes((req as any).userId, companyId, { limit: Number(req.query.limit) || 30, apenasNaoLidas: req.query.naoLidas === '1' }));
    } catch (e) { return handle(res, e, 'oficina.notificacoes'); }
  },

  async marcarLida(req: Request, res: Response) {
    const companyId = (req as any).companyId as string | undefined;
    if ((req as any).portalScope || !companyId) return res.status(403).json({ error: 'Acesso restrito à oficina.' });
    try {
      await marcarNotificacaoLida((req as any).userId, companyId, req.params.id as string);
      return res.status(204).send();
    } catch (e) { return handle(res, e, 'oficina.marcarLida'); }
  },

  async marcarTodas(req: Request, res: Response) {
    const companyId = (req as any).companyId as string | undefined;
    if ((req as any).portalScope || !companyId) return res.status(403).json({ error: 'Acesso restrito à oficina.' });
    try {
      return res.json({ atualizadas: await marcarTodasLidas((req as any).userId, companyId) });
    } catch (e) { return handle(res, e, 'oficina.marcarTodas'); }
  },
};
