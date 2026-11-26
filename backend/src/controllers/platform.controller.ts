import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuditLogger } from '../utils/audit.logger';
import { summarizePlatformQuotes } from '../services/platformQuoteStats';

const platformSchema = z.object({
  razaoSocial: z.string().min(1, 'Razão Social é obrigatória'),
  nomeFantasia: z.string().min(1, 'Nome Fantasia é obrigatório'),
  cnpj: z.string().min(14, 'CNPJ inválido'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('E-mail inválido'),
  responsavel: z.string().optional().nullable(),
  status: z.enum(['ATIVO', 'INATIVO']).default('ATIVO'),
  observacoes: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
  valorBaseGuincho: z.coerce.number().optional().default(0),
  valorKmGuincho: z.coerce.number().optional().default(0),
  valorHoraParadaGuincho: z.coerce.number().optional().default(0),
  valorServicoMecanico: z.coerce.number().optional().default(0),
  valorDeslocamento: z.coerce.number().optional().default(0),
  valorHoraTecnica: z.coerce.number().optional().default(0),
  valorHoraEspecializada: z.coerce.number().optional().default(0),
});

export const PlatformController = {
  async list(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const { search, status, page = '1', limit = '10' } = req.query;
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const whereClause: any = { companyId };

      if (status && status !== 'TODOS') {
        whereClause.status = status as string;
      }

      if (search) {
        const searchStr = search as string;
        whereClause.AND = [
          {
            OR: [
              { nomeFantasia: { contains: searchStr, mode: 'insensitive' } },
              { razaoSocial: { contains: searchStr, mode: 'insensitive' } },
              { cnpj: { contains: searchStr, mode: 'insensitive' } },
            ]
          }
        ];
      }

      // Status do orçamento (opcional): filtra os indicadores e a quebra por status
      const quoteStatus = typeof req.query.quoteStatus === 'string' && req.query.quoteStatus !== 'TODOS' ? req.query.quoteStatus : undefined;
      const quoteSelect = {
        quotes: { select: { status: true, total: true } },
        towingQuotes: { select: { status: true, valorTotal: true } },
      } as const;
      const toItems = (p: any) => [
        ...p.quotes.map((q: any) => ({ status: q.status, valor: q.total })),
        ...p.towingQuotes.map((q: any) => ({ status: q.status, valor: q.valorTotal })),
      ];

      const [platforms, total, allFilteredPlatforms] = await Promise.all([
        prisma.plataformaGestao.findMany({
          where: whereClause,
          orderBy: { nomeFantasia: 'asc' },
          skip,
          take: limitNum,
          include: quoteSelect,
        }),
        prisma.plataformaGestao.count({ where: whereClause }),
        prisma.plataformaGestao.findMany({ where: whereClause, select: quoteSelect }),
      ]);

      // Totais gerais (todas as plataformas do filtro)
      const { porStatus: summaryPorStatus, ...summary } = summarizePlatformQuotes(allFilteredPlatforms.flatMap(toItems), quoteStatus);

      // Indicadores e quebra por status de cada plataforma (sem enviar a lista de orçamentos)
      const formattedData = platforms.map((p: any) => {
        const { porStatus, ...stats } = summarizePlatformQuotes(toItems(p), quoteStatus);
        const { quotes, towingQuotes, ...rest } = p;
        return { ...rest, stats, porStatus };
      });

      return res.json({
        data: formattedData,
        summary: { ...summary, porStatus: summaryPorStatus },
        quoteStatus: quoteStatus || 'TODOS',
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      console.error('Error listing platforms:', error);
      return res.status(500).json({ error: 'Erro ao listar plataformas de gestão' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const userId = (req as any).userId;
      const data = platformSchema.parse(req.body);
      
      const cnpjSemMascara = data.cnpj.replace(/\D/g, '');
      if (cnpjSemMascara.length !== 14) {
        return res.status(400).json({ error: 'CNPJ deve conter exatamente 14 dígitos' });
      }

      // Check duplicate CNPJ
      const duplicate = await prisma.plataformaGestao.findFirst({
        where: {
          companyId,
          cnpjSemMascara,
        }
      });

      if (duplicate) {
        AuditLogger.log(userId, companyId, 'CREATE_PLATFORM', `Attempted duplicate platform CNPJ: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
        return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
      }

      const platform = await prisma.plataformaGestao.create({
        data: {
          ...data,
          cnpjSemMascara,
          companyId,
        }
      });

      AuditLogger.log(userId, companyId, 'CREATE_PLATFORM', `Created platform: ${platform.nomeFantasia} (${platform.id})`, 'SUCCESS');
      return res.status(201).json(platform);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors[0]?.message || 'Erro de validação' });
      }
      console.error('Error creating platform:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar plataforma de gestão' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId as string;
      const userId = (req as any).userId;
      const data = platformSchema.parse(req.body);

      const cnpjSemMascara = data.cnpj.replace(/\D/g, '');
      if (cnpjSemMascara.length !== 14) {
        return res.status(400).json({ error: 'CNPJ deve conter exatamente 14 dígitos' });
      }

      // Check ownership
      const existing = await prisma.plataformaGestao.findFirst({
        where: { id, companyId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Plataforma de gestão não encontrada ou acesso não autorizado' });
      }

      // Check duplicate CNPJ on other platforms
      const duplicate = await prisma.plataformaGestao.findFirst({
        where: {
          companyId,
          cnpjSemMascara,
          id: { not: id },
        }
      });

      if (duplicate) {
        AuditLogger.log(userId, companyId, 'UPDATE_PLATFORM', `Attempted duplicate platform CNPJ update: ${data.cnpj}`, 'DUPLICATE_ATTEMPT');
        return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
      }

      const platform = await prisma.plataformaGestao.update({
        where: { id },
        data: {
          ...data,
          cnpjSemMascara,
        }
      });

      // Check if contractual values changed
      const hasChanged = 
        existing.valorBaseGuincho !== platform.valorBaseGuincho ||
        existing.valorKmGuincho !== platform.valorKmGuincho ||
        existing.valorHoraParadaGuincho !== platform.valorHoraParadaGuincho ||
        existing.valorServicoMecanico !== platform.valorServicoMecanico ||
        existing.valorDeslocamento !== platform.valorDeslocamento ||
        existing.valorHoraTecnica !== platform.valorHoraTecnica ||
        existing.valorHoraEspecializada !== platform.valorHoraEspecializada;

      if (hasChanged) {
        const novaVersao = existing.contratoVersao + 1;
        
        // Fetch user name
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const userName = user ? user.name : 'Sistema';

        // Create history record
        await prisma.plataformaContratoHistory.create({
          data: {
            plataformaId: id,
            companyId,
            userId,
            userName,
            versao: novaVersao,
            
            valorBaseGuinchoAnt: existing.valorBaseGuincho,
            valorKmGuinchoAnt: existing.valorKmGuincho,
            valorHoraParadaGuinchoAnt: existing.valorHoraParadaGuincho,
            valorServicoMecanicoAnt: existing.valorServicoMecanico,
            valorDeslocamentoAnt: existing.valorDeslocamento,
            valorHoraTecnicaAnt: existing.valorHoraTecnica,
            valorHoraEspecializadaAnt: existing.valorHoraEspecializada,

            valorBaseGuinchoNovo: platform.valorBaseGuincho,
            valorKmGuinchoNovo: platform.valorKmGuincho,
            valorHoraParadaGuinchoNovo: platform.valorHoraParadaGuincho,
            valorServicoMecanicoNovo: platform.valorServicoMecanico,
            valorDeslocamentoNovo: platform.valorDeslocamento,
            valorHoraTecnicaNovo: platform.valorHoraTecnica,
            valorHoraEspecializadaNovo: platform.valorHoraEspecializada,
          }
        });

        // Update version in Platform model
        await prisma.plataformaGestao.update({
          where: { id },
          data: { contratoVersao: novaVersao }
        });
        
        platform.contratoVersao = novaVersao;
      }

      AuditLogger.log(userId, companyId, 'UPDATE_PLATFORM', `Updated platform: ${platform.nomeFantasia} (${platform.id})`, 'SUCCESS');
      return res.json(platform);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors[0]?.message || 'Erro de validação' });
      }
      console.error('Error updating platform:', error);
      return res.status(500).json({ error: 'Erro ao atualizar plataforma de gestão' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId as string;

      // Check ownership
      const existing = await prisma.plataformaGestao.findFirst({
        where: { id, companyId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Plataforma de gestão não encontrada ou acesso não autorizado' });
      }

      await prisma.plataformaGestao.delete({
        where: { id }
      });

      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting platform:', error);
      return res.status(500).json({ error: 'Erro ao excluir plataforma de gestão' });
    }
  },

  /**
   * GET /registry/platforms/:id/quotes?quoteStatus=
   * Drill da plataforma: orçamentos (oficina e guincho) da plataforma, da própria empresa.
   */
  async listQuotes(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const id = req.params.id as string;
      const platform = await prisma.plataformaGestao.findFirst({ where: { id, companyId }, select: { id: true, nomeFantasia: true } });
      if (!platform) return res.status(404).json({ error: 'Plataforma não encontrada' });
      const quoteStatus = typeof req.query.quoteStatus === 'string' && req.query.quoteStatus !== 'TODOS' ? req.query.quoteStatus : undefined;

      const [quotes, towing] = await Promise.all([
        prisma.quote.findMany({
          where: { plataformaGestaoId: id, companyId, ...(quoteStatus ? { status: quoteStatus } : {}) },
          select: {
            id: true, numeroOrcamento: true, status: true, total: true, createdAt: true, updatedAt: true,
            veiculoPlaca: true, client: { select: { nome: true, empresa: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
        prisma.towingQuote.findMany({
          where: { plataformaId: id, companyId, ...(quoteStatus ? { status: quoteStatus } : {}) },
          select: {
            id: true, numeroOrcamento: true, numeroFormatado: true, status: true, valorTotal: true, createdAt: true, updatedAt: true,
            veiculoPlaca: true, clienteNome: true, clienteEmpresa: true, client: { select: { nome: true, empresa: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      ]);

      const itens = [
        ...quotes.map(q => ({
          id: q.id, tipo: 'OFICINA' as const, numero: String(q.numeroOrcamento).padStart(5, '0'), status: q.status, valor: q.total,
          cliente: q.client?.empresa || q.client?.nome || '—', placa: q.veiculoPlaca, createdAt: q.createdAt, updatedAt: q.updatedAt,
        })),
        ...towing.map(t => ({
          id: t.id, tipo: 'GUINCHO' as const, numero: t.numeroFormatado || String(t.numeroOrcamento), status: t.status, valor: t.valorTotal,
          cliente: t.client?.empresa || t.client?.nome || t.clienteEmpresa || t.clienteNome || '—', placa: t.veiculoPlaca, createdAt: t.createdAt, updatedAt: t.updatedAt,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const resumo = summarizePlatformQuotes(itens.map(i => ({ status: i.status, valor: i.valor })));
      return res.json({ plataforma: platform, quoteStatus: quoteStatus || 'TODOS', resumo, itens });
    } catch (error) {
      console.error('Error listing platform quotes:', error);
      return res.status(500).json({ error: 'Erro ao listar os orçamentos da plataforma' });
    }
  },

  async listHistory(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const companyId = (req as any).companyId as string;

      // Check ownership
      const platform = await prisma.plataformaGestao.findFirst({
        where: { id, companyId }
      });

      if (!platform) {
        return res.status(404).json({ error: 'Plataforma de gestão não encontrada ou acesso não autorizado' });
      }

      const history = await prisma.plataformaContratoHistory.findMany({
        where: { plataformaId: id, companyId },
        orderBy: { createdAt: 'desc' }
      });

      return res.json(history);
    } catch (error) {
      console.error('Error listing platform contract history:', error);
      return res.status(500).json({ error: 'Erro ao listar histórico contratual da plataforma' });
    }
  }
};
