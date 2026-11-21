import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { basePrisma } from '../lib/prisma';
import { AuditLogger } from '../utils/audit.logger';
import { QuoteHistoryHelper } from '../utils/quoteHistory.helper';
import { buildApprovalReceivables, isPendingQuoteStatus, resolveQuoteStatus } from '../utils/quoteReceivables.helper';
import { buildVehicleSections, sanitizeQuoteItemForPortal, BILLED_STATUSES } from '../services/vehicleDetails.service';
import { S3Service } from '../services/s3.service';
import {
  findScopedQuote, findScopedVehicle, getClientVehicleIds, getPortalScope,
  handlePortalError, onlyDigits, PortalScope, quoteWhere, vehicleWhere,
} from './portalGestor.scope';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Orçamento passou da fase de aprovação (é uma OS em andamento ou concluída). */
const isServiceOrder = (q: { status: string }) => !isPendingQuoteStatus(q.status) && q.status !== 'Cancelado';

const quoteListSelect = {
  id: true, numeroOrcamento: true, status: true, createdAt: true, updatedAt: true,
  subtotal: true, total: true, condicaoPagamento: true, parcelas: true, valorParcela: true, valorEntrada: true,
  validade: true, garantia: true, prazoExecucao: true, observacao: true, osExterna: true,
  veiculoId: true, veiculoPlaca: true, veiculoMarca: true, veiculoModelo: true, veiculoPrefixo: true, veiculoFrota: true, veiculoSubfrota: true,
  oficina: { select: { id: true, nome: true } },
} as const;

/** Inclusões usadas para montar o cockpit do veículo no modo portal (sem contas a pagar). */
const quoteSectionInclude = {
  items: true,
  financialReceivables: { include: { attachments: true } },
  linkedReceivables: { include: { receivable: { include: { attachments: true } } } },
  oficina: { select: { id: true, nome: true } },
} as const;

async function loadClientQuotes(scope: PortalScope, extra: any = {}) {
  const vehicleIds = await getClientVehicleIds(scope);
  return basePrisma.quote.findMany({
    where: quoteWhere(scope, vehicleIds, extra),
    include: quoteSectionInclude,
    orderBy: { createdAt: 'desc' },
  });
}

async function loadClientVehiclesFull(scope: PortalScope, extra: any = {}) {
  return basePrisma.vehicle.findMany({
    where: vehicleWhere(scope, extra),
    include: {
      events: { orderBy: { data: 'desc' } },
      trocasOleoMotor: { orderBy: { dataTroca: 'desc' }, include: { oficina: { select: { nome: true } } } },
      trocasOleoCambio: { orderBy: { dataTroca: 'desc' }, include: { oficina: { select: { nome: true } } } },
      fleetDrivers: { where: { status: 'ATIVO' }, select: { id: true, nome: true } },
    },
    orderBy: [{ subfrota: 'asc' }, { placa: 'asc' }],
  });
}

function vehicleCard(v: any) {
  return {
    id: v.id, placa: v.placa, prefixo: v.prefixo, frota: v.frota, subfrota: v.subfrota,
    marca: v.marca, modelo: v.modelo, versao: v.versao, anoFabricacao: v.anoFabricacao, anoModelo: v.anoModelo,
    cor: v.cor, combustivel: v.combustivel, tipoVeiculo: v.tipoVeiculo, chassi: v.chassi, renavam: v.renavam,
    kmAtual: v.kmAtual, status: v.status, observacoes: v.observacoes,
    motoristas: v.fleetDrivers || [],
  };
}

/** Recebíveis da empresa: vinculados às suas OS (direto ou via link) ou lançados com origem no cliente. */
async function loadClientReceivables(scope: PortalScope, quoteIds: string[]) {
  const receivables = await basePrisma.financialReceivable.findMany({
    where: {
      companyId: scope.companyId,
      OR: [
        ...(quoteIds.length ? [{ quoteId: { in: quoteIds } }, { linkedQuotes: { some: { quoteId: { in: quoteIds } } } }] : []),
        { origem_tipo: 'CLIENTE', origem_id: scope.clientId },
      ],
    },
    include: { linkedQuotes: { where: { quoteId: { in: quoteIds } } } },
    orderBy: { vencimento: 'desc' },
  });

  return receivables.map(r => {
    // Recebível de faturamento conjunto: mostrar apenas a parcela vinculada às OS desta empresa
    const isDirect = (r.quoteId && quoteIds.includes(r.quoteId)) || (r.origem_tipo === 'CLIENTE' && r.origem_id === scope.clientId);
    const valor = isDirect ? r.valor : r.linkedQuotes.reduce((s, l) => s + l.valorVinculado, 0);
    return {
      id: r.id,
      numero: r.numeroRecebimento,
      descricao: r.descricao,
      valor,
      dataEmissao: r.dataEmissao,
      vencimento: r.vencimento,
      dataRecebimento: r.dataRecebimento,
      formaRecebimento: r.formaRecebimento,
      numeroEmpenho: r.numeroEmpenho,
      status: r.status,
      quoteIds: r.quoteId ? [r.quoteId] : r.linkedQuotes.map(l => l.quoteId).filter(Boolean),
    };
  });
}

const isReceived = (status: string) => ['RECEBIDA', 'LIQUIDADO', 'PAGO', 'PAGA'].includes((status || '').toUpperCase());

function isOverdue(r: { status: string; vencimento: Date }) {
  return !isReceived(r.status) && (r.status || '').toUpperCase() !== 'CANCELADA' && new Date(r.vencimento) < new Date();
}

function sumItems(items: any[], kind: 'peca' | 'servico') {
  return items
    .filter(i => {
      const t = (i.tipo || '').toLowerCase();
      const peca = t === 'peça' || t === 'peca' || t === 'produto';
      return kind === 'peca' ? peca : !peca;
    })
    .reduce((s, i) => s + (i.valorTotal || 0), 0);
}

// --------------------------------------------------------------------------
// Controller
// --------------------------------------------------------------------------

const empresaUpdateSchema = z.object({
  telefone: z.string().max(30).nullish(),
  whatsapp: z.string().max(30).nullish(),
  email: z.string().email().max(200).nullish().or(z.literal('')),
  logradouro: z.string().max(200).nullish(),
  numero: z.string().max(20).nullish(),
  complemento: z.string().max(100).nullish(),
  bairro: z.string().max(100).nullish(),
  cidade: z.string().max(100).nullish(),
  estado: z.string().max(2).nullish(),
  cep: z.string().max(10).nullish(),
});

const driverSchema = z.object({
  nome: z.string().trim().min(3).max(150),
  cpf: z.string().transform(onlyDigits).refine(v => v.length === 11, 'CPF deve ter 11 dígitos'),
  cnh: z.string().max(20).nullish(),
  categoriaCnh: z.string().max(5).nullish(),
  validadeCnh: z.string().nullish().transform(v => (v ? new Date(v) : null)),
  telefone: z.string().max(30).nullish(),
  email: z.string().email().max(200).nullish().or(z.literal('')),
  vehicleId: z.string().nullish(),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
  observacoes: z.string().max(1000).nullish(),
});

export const PortalGestorController = {
  // ---------------- Dashboard ----------------
  async dashboard(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const [vehicles, quotes, drivers] = await Promise.all([
        loadClientVehiclesFull(scope),
        loadClientQuotes(scope),
        basePrisma.fleetDriver.findMany({ where: { clientId: scope.clientId, companyId: scope.companyId, status: 'ATIVO' } }),
      ]);
      const receivables = await loadClientReceivables(scope, quotes.map(q => q.id));

      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 86400000);
      const startYear = new Date(now.getFullYear(), 0, 1);

      const pendentes = quotes.filter(q => isPendingQuoteStatus(q.status));
      const osAbertas = quotes.filter(q => isServiceOrder(q) && q.status !== 'Pago');
      const faturadoAno = quotes.filter(q => BILLED_STATUSES.includes(q.status) && q.createdAt >= startYear)
        .reduce((s, q) => s + q.total, 0);

      const proximasTrocas: any[] = [];
      vehicles.forEach(v => {
        const m = v.trocasOleoMotor[0];
        const c = v.trocasOleoCambio[0];
        if (m && m.proximaTrocaData <= in30) proximasTrocas.push({ veiculoId: v.id, placa: v.placa, tipo: 'Óleo do motor', data: m.proximaTrocaData, km: m.proximaTrocaKm, kmAtual: v.kmAtual });
        if (c && c.proximaTrocaData <= in30) proximasTrocas.push({ veiculoId: v.id, placa: v.placa, tipo: 'Óleo do câmbio', data: c.proximaTrocaData, km: c.proximaTrocaKm, kmAtual: v.kmAtual });
      });

      const abertos = receivables.filter(r => !isReceived(r.status) && (r.status || '').toUpperCase() !== 'CANCELADA');

      return res.json({
        veiculos: {
          total: vehicles.length,
          ativos: vehicles.filter(v => v.status === 'ATIVO').length,
          emManutencao: vehicles.filter(v => v.status === 'EM_MANUTENCAO').length,
          inativos: vehicles.filter(v => v.status === 'INATIVO' || v.status === 'VENDIDO').length,
        },
        orcamentosPendentes: { quantidade: pendentes.length, valor: pendentes.reduce((s, q) => s + q.total, 0) },
        ordensEmAndamento: osAbertas.length,
        faturadoAno,
        financeiro: {
          emAberto: abertos.reduce((s, r) => s + r.valor, 0),
          vencido: abertos.filter(isOverdue).reduce((s, r) => s + r.valor, 0),
        },
        motoristas: {
          total: drivers.length,
          cnhVencendo: drivers.filter(d => d.validadeCnh && d.validadeCnh <= in30).map(d => ({ id: d.id, nome: d.nome, validadeCnh: d.validadeCnh })),
        },
        proximasTrocas: proximasTrocas.sort((a, b) => a.data.getTime() - b.data.getTime()),
        ultimosOrcamentos: pendentes.slice(0, 5).map(q => ({ id: q.id, numeroOrcamento: q.numeroOrcamento, total: q.total, status: q.status, veiculoPlaca: q.veiculoPlaca, createdAt: q.createdAt })),
      });
    } catch (error) {
      return handlePortalError(res, error, 'dashboard');
    }
  },

  // ---------------- Cadastro da Empresa ----------------
  async getEmpresa(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const client = await basePrisma.client.findFirst({ where: { id: scope.clientId, companyId: scope.companyId } });
      if (!client) return res.status(404).json({ error: 'Empresa não encontrada' });
      const oficina = await basePrisma.company.findUnique({
        where: { id: scope.companyId },
        select: { razaoSocial: true, nomeFantasia: true, cnpj: true, telefone: true, whatsapp: true, email: true, endereco: true, logo: true },
      });
      const { companyId, ...empresa } = client;
      return res.json({ empresa, oficina });
    } catch (error) {
      return handlePortalError(res, error, 'getEmpresa');
    }
  },

  /** Atualiza apenas dados de contato/endereço. Razão social e CNPJ são mantidos pela oficina. */
  async updateEmpresa(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const data = empresaUpdateSchema.parse(req.body);
      const result = await basePrisma.client.updateMany({
        where: { id: scope.clientId, companyId: scope.companyId },
        data: { ...data, email: data.email || null },
      });
      if (result.count !== 1) return res.status(404).json({ error: 'Empresa não encontrada' });
      AuditLogger.log(scope.userId, scope.companyId, 'PORTAL_GESTOR_UPDATE_EMPRESA', `Contato atualizado pelo gestor do cliente ${scope.clientId}`, 'SUCCESS');
      return PortalGestorController.getEmpresa(req, res);
    } catch (error) {
      return handlePortalError(res, error, 'updateEmpresa');
    }
  },

  // ---------------- Veículos ----------------
  async listVehicles(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const { status, search } = req.query as any;
      const extra: any = {};
      if (status && status !== 'all') extra.status = status;
      if (search) {
        extra.OR = [
          { placa: { contains: String(search).toUpperCase().replace(/[\s-]/g, ''), mode: 'insensitive' } },
          { modelo: { contains: String(search), mode: 'insensitive' } },
          { prefixo: { contains: String(search), mode: 'insensitive' } },
        ];
      }
      const vehicles = await loadClientVehiclesFull(scope, extra);
      return res.json(vehicles.map(v => {
        const datas = [v.events[0]?.data, v.trocasOleoMotor[0]?.dataTroca, v.trocasOleoCambio[0]?.dataTroca].filter(Boolean) as Date[];
        return { ...vehicleCard(v), dataUltimoServico: datas.length ? new Date(Math.max(...datas.map(d => d.getTime()))) : null };
      }));
    } catch (error) {
      return handlePortalError(res, error, 'listVehicles');
    }
  },

  /** Cockpit do veículo — mesma montagem da Gestão de Frotas, em modo portal. */
  async getVehicle(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const [vehicle] = await loadClientVehiclesFull(scope, { id: req.params.id as string });
      if (!vehicle) return res.status(404).json({ error: 'Veículo não encontrado' });

      const quotes = await loadClientQuotes(scope, { veiculoId: vehicle.id });
      const sections = buildVehicleSections(vehicle, quotes, 'portal');
      return res.json({ infoCadastral: vehicleCard(vehicle), ...sections });
    } catch (error) {
      return handlePortalError(res, error, 'getVehicle');
    }
  },

  // ---------------- Orçamentos ----------------
  async listQuotes(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const vehicleIds = await getClientVehicleIds(scope);
      const { status, veiculoId } = req.query as any;
      const extra: any = {};
      if (veiculoId) extra.veiculoId = veiculoId;
      if (status === 'pendentes') extra.status = { in: ['Orçamento', 'Em Andamento', 'Aguardando Aprovação'] };
      else if (status && status !== 'all') extra.status = status;

      const quotes = await basePrisma.quote.findMany({
        where: quoteWhere(scope, vehicleIds, extra),
        select: { ...quoteListSelect, items: { select: { descricao: true, tipo: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return res.json(quotes.map(q => ({ ...q, aguardandoAprovacao: isPendingQuoteStatus(q.status) })));
    } catch (error) {
      return handlePortalError(res, error, 'listQuotes');
    }
  },

  /** Detalhe do orçamento (itens sem custo interno) + dados da oficina para impressão. */
  async getQuote(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const quote = await findScopedQuote(scope, req.params.id as string, {
        items: true,
        client: true,
        oficina: { select: { id: true, nome: true, cnpj: true, telefone: true, endereco: true } },
        company: { select: { razaoSocial: true, nomeFantasia: true, cnpj: true, cnpjSemMascara: true, telefone: true, whatsapp: true, email: true, endereco: true, logo: true, inscricaoEstadual: true } },
        history: { orderBy: { createdAt: 'desc' }, select: { id: true, action: true, description: true, details: true, userName: true, createdAt: true } },
      });
      if (!quote) return res.status(404).json({ error: 'Orçamento não encontrado' });

      const { client, company, history, mecanicoId, isCloned, clonedFromId, plataformaGestaoId, ...rest } = quote as any;
      const { companyId, ...clientData } = client || {};
      return res.json({
        ...rest,
        items: (quote as any).items.map(sanitizeQuoteItemForPortal),
        client: clientData,
        company,
        history,
        aguardandoAprovacao: isPendingQuoteStatus(quote.status),
      });
    } catch (error) {
      return handlePortalError(res, error, 'getQuote');
    }
  },

  /** Aprovação pelo cliente: mesma regra de status e de geração de recebíveis da oficina. */
  async approveQuote(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const quote = await findScopedQuote(scope, req.params.id as string, { client: true, company: true });
      if (!quote) return res.status(404).json({ error: 'Orçamento não encontrado' });
      if (!isPendingQuoteStatus(quote.status)) {
        return res.status(409).json({ error: `Este orçamento não está aguardando aprovação (status atual: ${quote.status}).` });
      }

      const q: any = quote;
      const company = q.company;
      const isCurio = !!company && [company.razaoSocial, company.nomeFantasia]
        .some((n: string | null) => (n || '').toLowerCase().includes('curio') || (n || '').toLowerCase().includes('curió'));
      const user = await basePrisma.user.findUnique({ where: { id: scope.userId }, select: { name: true } });
      const userName = `Portal do Gestor - ${user?.name || 'Cliente'}`;

      const updated = await basePrisma.$transaction(async tx => {
        const existingReceivablesCount = await tx.financialReceivable.count({ where: { quoteId: quote.id } });
        const receivables = buildApprovalReceivables({
          status: 'Aprovado',
          condicaoPagamento: quote.condicaoPagamento,
          valorEntrada: quote.valorEntrada,
          parcelas: quote.parcelas,
          total: quote.total,
          clientNome: q.client?.nome || '',
          companyId: quote.companyId,
          existingReceivablesCount,
        });
        const newStatus = resolveQuoteStatus({ status: 'Aprovado', condicaoPagamento: quote.condicaoPagamento, valorEntrada: quote.valorEntrada, isCurio });

        // Atualização condicional: evita dupla aprovação concorrente
        const res1 = await tx.quote.updateMany({
          where: { id: quote.id, companyId: scope.companyId, status: quote.status },
          data: { status: newStatus },
        });
        if (res1.count !== 1) {
          const err: any = new Error('O orçamento foi alterado por outro usuário. Atualize a página.');
          err.status = 409;
          throw err;
        }
        if (receivables.length) {
          await tx.financialReceivable.createMany({ data: receivables.map(r => ({ ...r, quoteId: quote.id })) });
        }
        await tx.quoteHistory.create({
          data: QuoteHistoryHelper.createEvent(
            { quoteId: quote.id, companyId: quote.companyId, userId: scope.userId, userName },
            'STATUS_ALTERADO', 'APROVADO PELO CLIENTE (PORTAL DO GESTOR)', { de: quote.status, para: newStatus },
          ),
        });
        return tx.quote.findUnique({ where: { id: quote.id }, select: quoteListSelect });
      });

      AuditLogger.log(scope.userId, scope.companyId, 'PORTAL_GESTOR_APPROVE_QUOTE', `Orçamento #${quote.numeroOrcamento} aprovado pelo cliente ${scope.clientId}`, 'SUCCESS');
      return res.json(updated);
    } catch (error) {
      return handlePortalError(res, error, 'approveQuote');
    }
  },

  /** Recusa pelo cliente: status "Cancelado" + histórico com o motivo. */
  async rejectQuote(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const motivo = z.string().trim().min(3, 'Informe o motivo da recusa').max(1000).parse(req.body?.motivo);
      const quote = await findScopedQuote(scope, req.params.id as string);
      if (!quote) return res.status(404).json({ error: 'Orçamento não encontrado' });
      if (!isPendingQuoteStatus(quote.status)) {
        return res.status(409).json({ error: `Este orçamento não está aguardando aprovação (status atual: ${quote.status}).` });
      }
      const user = await basePrisma.user.findUnique({ where: { id: scope.userId }, select: { name: true } });
      const userName = `Portal do Gestor - ${user?.name || 'Cliente'}`;

      const updated = await basePrisma.$transaction(async tx => {
        const r = await tx.quote.updateMany({
          where: { id: quote.id, companyId: scope.companyId, status: quote.status },
          data: { status: 'Cancelado' },
        });
        if (r.count !== 1) {
          const err: any = new Error('O orçamento foi alterado por outro usuário. Atualize a página.');
          err.status = 409;
          throw err;
        }
        await tx.quoteHistory.create({
          data: QuoteHistoryHelper.createEvent(
            { quoteId: quote.id, companyId: quote.companyId, userId: scope.userId, userName },
            'STATUS_ALTERADO', 'RECUSADO PELO CLIENTE (PORTAL DO GESTOR)', { de: quote.status, para: 'Cancelado', motivo },
          ),
        });
        return tx.quote.findUnique({ where: { id: quote.id }, select: quoteListSelect });
      });

      AuditLogger.log(scope.userId, scope.companyId, 'PORTAL_GESTOR_REJECT_QUOTE', `Orçamento #${quote.numeroOrcamento} recusado pelo cliente ${scope.clientId}`, 'SUCCESS');
      return res.json(updated);
    } catch (error) {
      return handlePortalError(res, error, 'rejectQuote');
    }
  },

  // ---------------- Ordens de Serviço ----------------
  async listServiceOrders(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const vehicleIds = await getClientVehicleIds(scope);
      const quotes = await basePrisma.quote.findMany({
        where: quoteWhere(scope, vehicleIds, {
          status: { notIn: ['Orçamento', 'Em Andamento', 'Aguardando Aprovação', 'Cancelado'] },
          ...(req.query.veiculoId ? { veiculoId: String(req.query.veiculoId) } : {}),
        }),
        select: {
          ...quoteListSelect,
          items: { select: { descricao: true, tipo: true, quantidade: true } },
          history: { orderBy: { createdAt: 'desc' }, take: 1, select: { description: true, createdAt: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
      return res.json(quotes.map(q => ({ ...q, ultimaAtualizacao: q.history[0] || null, history: undefined })));
    } catch (error) {
      return handlePortalError(res, error, 'listServiceOrders');
    }
  },

  // ---------------- Manutenção ----------------
  async listMaintenance(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const vehicles = await loadClientVehiclesFull(scope, req.query.veiculoId ? { id: String(req.query.veiculoId) } : {});
      const quotes = await loadClientQuotes(scope);
      const historico: any[] = [];
      vehicles.forEach(v => {
        buildVehicleSections(v, [], 'portal').manutencoes
          .forEach(m => historico.push({ ...m, veiculoId: v.id, placa: v.placa, modelo: `${v.marca} ${v.modelo}` }));
      });
      // Andamento: OS ainda não concluídas (pagas) dos veículos da empresa
      const andamento = quotes.filter(q => isServiceOrder(q) && q.status !== 'Pago')
        .filter(q => !req.query.veiculoId || q.veiculoId === req.query.veiculoId)
        .map(q => ({ id: q.id, numeroOrcamento: q.numeroOrcamento, status: q.status, veiculoPlaca: q.veiculoPlaca, prazoExecucao: q.prazoExecucao, updatedAt: q.updatedAt, oficina: q.oficina?.nome }));
      historico.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      return res.json({ andamento, historico });
    } catch (error) {
      return handlePortalError(res, error, 'listMaintenance');
    }
  },

  // ---------------- Peças Utilizadas ----------------
  async listParts(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const vehicleIds = await getClientVehicleIds(scope);
      const quotes = await basePrisma.quote.findMany({
        where: quoteWhere(scope, vehicleIds, {
          status: { notIn: ['Orçamento', 'Em Andamento', 'Aguardando Aprovação', 'Cancelado'] },
          ...(req.query.veiculoId ? { veiculoId: String(req.query.veiculoId) } : {}),
        }),
        select: { id: true, numeroOrcamento: true, status: true, createdAt: true, veiculoId: true, veiculoPlaca: true, items: true },
        orderBy: { createdAt: 'desc' },
      });
      const pecas: any[] = [];
      quotes.forEach(q => q.items.forEach(i => {
        const t = (i.tipo || '').toLowerCase();
        if (t !== 'peça' && t !== 'peca' && t !== 'produto') return;
        pecas.push({
          id: i.id, descricao: i.descricao, codigoPeca: i.codigoPeca, tipoPeca: i.tipoPeca,
          quantidade: i.quantidade, valorUnitario: i.valorUnitario, valorTotal: i.valorTotal,
          data: q.createdAt, numeroOrcamento: q.numeroOrcamento, quoteId: q.id, status: q.status,
          veiculoId: q.veiculoId, placa: q.veiculoPlaca,
        });
      }));
      return res.json({
        pecas,
        totais: { quantidade: pecas.reduce((s, p) => s + p.quantidade, 0), valor: pecas.reduce((s, p) => s + p.valorTotal, 0) },
      });
    } catch (error) {
      return handlePortalError(res, error, 'listParts');
    }
  },

  // ---------------- Documentos ----------------
  async listDocuments(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const quotes = await loadClientQuotes(scope);
      const quoteIds = quotes.map(q => q.id);
      const anexos = quoteIds.length ? await basePrisma.anexoNF.findMany({
        where: { quoteId: { in: quoteIds } },
        select: { id: true, tipo: true, nomeOriginal: true, contentType: true, tamanho: true, createdAt: true, quoteId: true },
        orderBy: { createdAt: 'desc' },
      }) : [];
      const byId = new Map(quotes.map(q => [q.id, q]));

      const documentos: any[] = anexos.map(a => ({
        id: a.id,
        origem: 'OS',
        nome: a.nomeOriginal,
        tipo: a.tipo,
        contentType: a.contentType,
        tamanho: a.tamanho,
        data: a.createdAt,
        referencia: `OS #${byId.get(a.quoteId)?.numeroOrcamento ?? ''}`,
        placa: byId.get(a.quoteId)?.veiculoPlaca || null,
        downloadPath: `/portal-gestor/documentos/os/${a.id}/download`,
      }));

      // Anexos de recebíveis vinculados às OS da empresa (regra do cockpit em modo portal)
      quotes.forEach(q => {
        buildVehicleSections({}, [q], 'portal').documentos.forEach(d => documentos.push({
          id: d.id, origem: 'FINANCEIRO', nome: d.nome, tipo: d.tipo, data: d.data,
          referencia: d.origem, placa: q.veiculoPlaca, downloadPath: `/portal-gestor/documentos/financeiro/${d.id}/download`,
        }));
      });

      documentos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      return res.json(documentos);
    } catch (error) {
      return handlePortalError(res, error, 'listDocuments');
    }
  },

  async downloadOsDocument(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const anexo = await basePrisma.anexoNF.findUnique({ where: { id: req.params.id as string } });
      if (!anexo || !(await findScopedQuote(scope, anexo.quoteId))) return res.status(404).json({ error: 'Documento não encontrado' });
      const url = await S3Service.getPresignedUrl(anexo.arquivo, 300);
      AuditLogger.log(scope.userId, scope.companyId, 'PORTAL_GESTOR_DOWNLOAD', `Download do anexo ${anexo.id}`, 'SUCCESS');
      return res.json({ url, nome: anexo.nomeOriginal });
    } catch (error) {
      return handlePortalError(res, error, 'downloadOsDocument');
    }
  },

  async downloadFinancialDocument(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const att = await basePrisma.financialAttachment.findUnique({
        where: { id: req.params.id as string },
        include: { receivable: { include: { linkedQuotes: true } } },
      });
      // Somente anexos de recebíveis (nunca de contas a pagar) ligados a OS da empresa
      if (!att || !att.receivable) return res.status(404).json({ error: 'Documento não encontrado' });
      const candidateQuoteIds = [att.receivable.quoteId, ...att.receivable.linkedQuotes.map(l => l.quoteId)].filter(Boolean) as string[];
      let allowed = false;
      for (const qid of candidateQuoteIds) {
        if (await findScopedQuote(scope, qid)) { allowed = true; break; }
      }
      if (!allowed) return res.status(404).json({ error: 'Documento não encontrado' });
      AuditLogger.log(scope.userId, scope.companyId, 'PORTAL_GESTOR_DOWNLOAD', `Download do anexo financeiro ${att.id}`, 'SUCCESS');
      return res.json({ url: att.fileUrl, nome: att.fileName });
    } catch (error) {
      return handlePortalError(res, error, 'downloadFinancialDocument');
    }
  },

  // ---------------- Finanças / DRE ----------------
  /**
   * DRE da frota sob a ótica do cliente: quanto a empresa gastou (OS faturadas e
   * manutenções registradas), por mês e por veículo, e a situação dos títulos.
   * Não inclui contas a pagar, custos de compra, margens ou dados contábeis da oficina.
   */
  async financial(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const ano = Number(req.query.ano) || new Date().getFullYear();
      const inicio = new Date(ano, 0, 1);
      const fim = new Date(ano + 1, 0, 1);

      const [quotes, vehicles] = await Promise.all([loadClientQuotes(scope), loadClientVehiclesFull(scope)]);
      const receivables = await loadClientReceivables(scope, quotes.map(q => q.id));

      const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, pecas: 0, servicos: 0, totalOs: 0, manutencaoExterna: 0, total: 0 }));
      const porVeiculo = new Map<string, { veiculoId: string | null; placa: string; modelo: string; totalOs: number; manutencaoExterna: number; total: number; quantidadeOs: number }>();
      const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
      const keyFor = (veiculoId: string | null, placa: string | null) => veiculoId || `placa:${placa || 'sem-placa'}`;
      const ensure = (veiculoId: string | null, placa: string | null) => {
        const k = keyFor(veiculoId, placa);
        if (!porVeiculo.has(k)) {
          const v = veiculoId ? vehicleMap.get(veiculoId) : undefined;
          porVeiculo.set(k, { veiculoId, placa: v?.placa || placa || 'Sem placa', modelo: v ? `${v.marca} ${v.modelo}` : '', totalOs: 0, manutencaoExterna: 0, total: 0, quantidadeOs: 0 });
        }
        return porVeiculo.get(k)!;
      };

      quotes.filter(q => BILLED_STATUSES.includes(q.status) || q.status === 'Parcialmente Pago' || q.status === 'Aguardando Pagamento')
        .filter(q => q.createdAt >= inicio && q.createdAt < fim)
        .forEach(q => {
          const m = meses[q.createdAt.getMonth()];
          m.pecas += sumItems(q.items, 'peca');
          m.servicos += sumItems(q.items, 'servico');
          m.totalOs += q.total;
          const pv = ensure(q.veiculoId, q.veiculoPlaca);
          pv.totalOs += q.total;
          pv.quantidadeOs += 1;
        });

      vehicles.forEach(v => {
        buildVehicleSections(v, [], 'portal').manutencoes.forEach(mt => {
          const d = new Date(mt.data);
          if (!(d >= inicio && d < fim) || !(mt.valor > 0)) return;
          meses[d.getMonth()].manutencaoExterna += mt.valor;
          ensure(v.id, v.placa).manutencaoExterna += mt.valor;
        });
      });

      meses.forEach(m => { m.total = m.totalOs + m.manutencaoExterna; });
      porVeiculo.forEach(p => { p.total = p.totalOs + p.manutencaoExterna; });

      const titulosAno = receivables.filter(r => new Date(r.vencimento) >= inicio && new Date(r.vencimento) < fim);
      const ativos = titulosAno.filter(r => (r.status || '').toUpperCase() !== 'CANCELADA');

      return res.json({
        ano,
        resumo: {
          totalOs: meses.reduce((s, m) => s + m.totalOs, 0),
          pecas: meses.reduce((s, m) => s + m.pecas, 0),
          servicos: meses.reduce((s, m) => s + m.servicos, 0),
          manutencaoExterna: meses.reduce((s, m) => s + m.manutencaoExterna, 0),
          total: meses.reduce((s, m) => s + m.total, 0),
          pago: ativos.filter(r => isReceived(r.status)).reduce((s, r) => s + r.valor, 0),
          emAberto: ativos.filter(r => !isReceived(r.status)).reduce((s, r) => s + r.valor, 0),
          vencido: ativos.filter(isOverdue).reduce((s, r) => s + r.valor, 0),
        },
        meses,
        porVeiculo: Array.from(porVeiculo.values()).sort((a, b) => b.total - a.total),
        titulos: titulosAno.map(r => ({ ...r, vencido: isOverdue(r) })),
      });
    } catch (error) {
      return handlePortalError(res, error, 'financial');
    }
  },

  // ---------------- Motoristas ----------------
  async listDrivers(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const drivers = await basePrisma.fleetDriver.findMany({
        where: { clientId: scope.clientId, companyId: scope.companyId },
        include: { vehicle: { select: { id: true, placa: true, marca: true, modelo: true } } },
        orderBy: { nome: 'asc' },
      });
      return res.json(drivers.map(({ companyId, clientId, ...d }) => d));
    } catch (error) {
      return handlePortalError(res, error, 'listDrivers');
    }
  },

  async createDriver(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const data = driverSchema.parse(req.body);
      if (data.vehicleId && !(await findScopedVehicle(scope, data.vehicleId))) {
        return res.status(400).json({ error: 'Veículo inválido para esta empresa.' });
      }
      const driver = await basePrisma.fleetDriver.create({
        data: { ...data, email: data.email || null, vehicleId: data.vehicleId || null, companyId: scope.companyId, clientId: scope.clientId },
      });
      AuditLogger.log(scope.userId, scope.companyId, 'PORTAL_GESTOR_CREATE_DRIVER', `Motorista ${driver.id} criado`, 'SUCCESS');
      const { companyId, clientId, ...rest } = driver;
      return res.status(201).json(rest);
    } catch (error) {
      return handlePortalError(res, error, 'createDriver');
    }
  },

  async updateDriver(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const data = driverSchema.parse(req.body);
      if (data.vehicleId && !(await findScopedVehicle(scope, data.vehicleId))) {
        return res.status(400).json({ error: 'Veículo inválido para esta empresa.' });
      }
      const r = await basePrisma.fleetDriver.updateMany({
        where: { id: req.params.id as string, clientId: scope.clientId, companyId: scope.companyId },
        data: { ...data, email: data.email || null, vehicleId: data.vehicleId || null },
      });
      if (r.count !== 1) return res.status(404).json({ error: 'Motorista não encontrado' });
      AuditLogger.log(scope.userId, scope.companyId, 'PORTAL_GESTOR_UPDATE_DRIVER', `Motorista ${req.params.id} atualizado`, 'SUCCESS');
      const driver = await basePrisma.fleetDriver.findFirst({ where: { id: req.params.id as string, clientId: scope.clientId } });
      const { companyId, clientId, ...rest } = driver!;
      return res.json(rest);
    } catch (error) {
      return handlePortalError(res, error, 'updateDriver');
    }
  },

  async deleteDriver(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const r = await basePrisma.fleetDriver.deleteMany({ where: { id: req.params.id as string, clientId: scope.clientId, companyId: scope.companyId } });
      if (r.count !== 1) return res.status(404).json({ error: 'Motorista não encontrado' });
      AuditLogger.log(scope.userId, scope.companyId, 'PORTAL_GESTOR_DELETE_DRIVER', `Motorista ${req.params.id} excluído`, 'SUCCESS');
      return res.status(204).send();
    } catch (error) {
      return handlePortalError(res, error, 'deleteDriver');
    }
  },

  // ---------------- Meu Acesso ----------------
  async myAccess(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const user = await basePrisma.user.findUnique({
        where: { id: scope.userId },
        select: { name: true, status: true, createdAt: true, updatedAt: true, client: { select: { cnpj: true, empresa: true, nome: true } } },
      });
      return res.json({ nome: user?.name, login: onlyDigits(user?.client?.cnpj), status: user?.status, criadoEm: user?.createdAt, atualizadoEm: user?.updatedAt });
    } catch (error) {
      return handlePortalError(res, error, 'myAccess');
    }
  },

  async changePassword(req: Request, res: Response) {
    try {
      const scope = getPortalScope(req);
      const { senhaAtual, novaSenha } = z.object({
        senhaAtual: z.string().min(1),
        novaSenha: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres').max(128),
      }).parse(req.body);
      const user = await basePrisma.user.findUnique({ where: { id: scope.userId } });
      if (!user || !(await bcrypt.compare(senhaAtual, user.password))) {
        return res.status(400).json({ error: 'Senha atual incorreta.' });
      }
      if (await bcrypt.compare(novaSenha, user.password)) {
        return res.status(400).json({ error: 'A nova senha deve ser diferente da atual.' });
      }
      await basePrisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(novaSenha, 10), mustChangePassword: false } });
      AuditLogger.log(scope.userId, scope.companyId, 'PORTAL_GESTOR_CHANGE_PASSWORD', 'Senha alterada', 'SUCCESS');
      return res.json({ message: 'Senha alterada com sucesso.' });
    } catch (error) {
      return handlePortalError(res, error, 'changePassword');
    }
  },
};

