import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma, basePrisma } from '../lib/prisma';
import { z } from 'zod';
import { AuditLogger } from '../utils/audit.logger';
import { QuoteHistoryHelper } from '../utils/quoteHistory.helper';

const createQuoteSchema = z.object({
  companyId: z.string(),
  client: z.object({
    nome: z.string(),
    empresa: z.string().nullish(),
    cnpj: z.string().nullish(),
    telefone: z.string().nullish(),
    email: z.string().nullish(),
    cidade: z.string().nullish(),
    estado: z.string().nullish(),
    logradouro: z.string().nullish(),
    numero: z.string().nullish(),
    complemento: z.string().nullish(),
    bairro: z.string().nullish(),
    cep: z.string().nullish(),
    dataSituacao: z.string().nullish(),
    atividadePrincipal: z.string().nullish(),
  }),
  condicaoPagamento: z.string(),
  parcelas: z.number().nullish(),
  valorParcela: z.number().nullish(),
  validade: z.string(),
  garantia: z.string().nullish(),
  prazoExecucao: z.string().nullish(),
  observacao: z.string().nullish(),
  veiculoMarca: z.string().nullish(),
  veiculoModelo: z.string().nullish(),
  veiculoAno: z.string().nullish(),
  veiculoPlaca: z.string().nullish(),
  veiculoPrefixo: z.string().nullish(),
  veiculoAnoFabricacao: z.string().nullish(),
  veiculoAnoModelo: z.string().nullish(),
  veiculoChassi: z.string().nullish(),
  veiculoRenavam: z.string().nullish(),
  veiculoFrota: z.string().nullish(),
  veiculoSubfrota: z.string().nullish(),
  veiculoHodometro: z.string().nullish(),
  veiculoTipo: z.string().nullish(),
  plataformaGestaoId: z.string().nullish(),
  osExterna: z.string().max(100).nullish(),
  oficinaId: z.string().nullish(),
  notaFiscalDescricao: z.string().nullish(),
  mecanicoId: z.string().nullish(),
  isCloned: z.boolean().optional().default(false),
  clonedFromId: z.string().nullish(),
  items: z.array(z.object({
    descricao: z.string(),
    quantidade: z.number(),
    valorUnitario: z.number(),
    valorTotal: z.number(),
    tipo: z.string().optional().default("Peça"),
    codigoPeca: z.string().max(100).nullish(),
    tipoPeca: z.string().nullish(),
  })).superRefine((items, ctx) => {
    items.forEach((item, index) => {
      if (item.tipo === 'Peça') {
        const validTipos = ['Genuína', 'Original', 'Paralela', 'Remanufaturada'];
        if (!item.tipoPeca || !validTipos.includes(item.tipoPeca)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Tipo da peça deve ser Genuína, Original, Paralela ou Remanufaturada',
            path: [index, 'tipoPeca']
          });
        }
      }
    });
  }),
  subtotal: z.number(),
  total: z.number(),
  status: z.string().optional().default("Aguardando Aprovação"),
});

async function resolveClientForQuote(
  clientData: z.infer<typeof createQuoteSchema>['client'],
  existingClient?: { id: string; nome: string; cnpj?: string | null; email?: string | null } | null
) {
  const normalizedCnpj = clientData.cnpj ? clientData.cnpj.trim().replace(/\D/g, '') : '';
  const normalizedEmail = clientData.email ? clientData.email.trim().toLowerCase() : '';
  const normalizedNome = clientData.nome.trim();

  if (existingClient) {
    const existingCnpj = existingClient.cnpj ? existingClient.cnpj.trim().replace(/\D/g, '') : '';
    const existingEmail = existingClient.email ? existingClient.email.trim().toLowerCase() : '';
    const existingNome = existingClient.nome.trim().toLowerCase();

    const isSameClient =
      (normalizedCnpj && existingCnpj && normalizedCnpj === existingCnpj) ||
      (normalizedEmail && existingEmail && normalizedEmail === existingEmail) ||
      existingNome === normalizedNome.toLowerCase();

    if (isSameClient) {
      return prisma.client.update({
        where: { id: existingClient.id },
        data: clientData,
      });
    }
  }

  let client;

  if (normalizedCnpj && normalizedCnpj.length === 14) {
    client = await prisma.client.findFirst({
      where: {
        cnpj: {
          contains: normalizedCnpj
        }
      }
    });
  }

  if (!client && normalizedEmail) {
    client = await prisma.client.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive'
        }
      }
    });
  }

  if (!client) {
    client = await prisma.client.findFirst({
      where: {
        nome: {
          equals: normalizedNome,
          mode: 'insensitive'
        }
      }
    });
  }

  if (client) {
    return prisma.client.update({
      where: { id: client.id },
      data: clientData,
    });
  }

  return prisma.client.create({
    data: clientData,
  });
}

export const QuoteController = {
  async list(req: Request, res: Response) {
    try {
      const quotes = await prisma.quote.findMany({
        include: {
          client: true,
          company: true,
          items: true,
          plataformaGestao: true,
          oficina: true,
          mecanico: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(quotes);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error in quote.list:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in quote.list:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async getDashboardStats(req: Request, res: Response) {
    try {
      const quotesCount = await prisma.quote.count();

      // Find MCA company dynamically
      const mcaCompany = await prisma.company.findFirst({
        where: {
          OR: [
            { razaoSocial: { contains: 'mca', mode: 'insensitive' } },
            { nomeFantasia: { contains: 'mca', mode: 'insensitive' } }
          ]
        }
      });
      const mcaCompanyId = mcaCompany?.id || 'mca-padrao-company-uuid-000000000001';

      const quotes = await prisma.quote.findMany({
        where: {
          companyId: mcaCompanyId,
          status: {
            in: ['Aprovado', 'Emitir Nota Fiscal', 'Pago']
          }
        },
        select: { total: true }
      });
      const totalSold = quotes.reduce((acc, q) => acc + q.total, 0);

      const recentQuotes = await prisma.quote.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { 
          client: true,
          company: true
        }
      });

      // Calculate breakdown by company excluding Cobertura
      const companies = await prisma.company.findMany();
      const companyBreakdown = await Promise.all(
        companies.map(async (company) => {
          const companyQuotes = await prisma.quote.findMany({
            where: { 
              companyId: company.id,
              status: {
                in: ['Aprovado', 'Emitir Nota Fiscal', 'Pago']
              }
            },
            select: { total: true }
          });
          
          const count = companyQuotes.length;
          const total = companyQuotes.reduce((acc, q) => acc + q.total, 0);
          
          return {
            companyId: company.id,
            companyName: company.razaoSocial || company.nomeFantasia,
            quotesCount: count,
            totalSold: total
          };
        })
      );

      const activeClientsCount = await prisma.client.count({
        where: { status: 'ATIVO' }
      });

      const activeClientsList = await prisma.client.findMany({
        where: { status: 'ATIVO' },
        select: {
          id: true,
          nome: true,
          empresa: true,
          cnpj: true,
          email: true,
          telefone: true
        },
        orderBy: { nome: 'asc' }
      });

      return res.json({
        quotesCount,
        totalSold,
        recentQuotes,
        companyBreakdown,
        activeClientsCount,
        activeClientsList
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error in quote.getDashboardStats:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in quote.getDashboardStats:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = createQuoteSchema.parse(req.body);

      let finalCompanyId = data.companyId;
      if (data.isCloned || data.clonedFromId) {
        const curio = await prisma.company.findFirst({
          where: {
            OR: [
              { razaoSocial: { contains: 'curio', mode: 'insensitive' } },
              { nomeFantasia: { contains: 'curio', mode: 'insensitive' } },
              { razaoSocial: { contains: 'curió', mode: 'insensitive' } },
              { nomeFantasia: { contains: 'curió', mode: 'insensitive' } }
            ]
          }
        });
        if (!curio) {
          return res.status(400).json({ error: 'Empresa Curio não cadastrada no sistema' });
        }
        finalCompanyId = curio.id;
      }

      // Validar limite mensal de Ordens de Serviço (OS) do plano
      const company = await prisma.company.findUnique({
        where: { id: finalCompanyId },
        include: { plan: true }
      });

      const isCurio = company && (
        (company.razaoSocial || '').toLowerCase().includes('curio') ||
        (company.razaoSocial || '').toLowerCase().includes('curió') ||
        (company.nomeFantasia || '').toLowerCase().includes('curio') ||
        (company.nomeFantasia || '').toLowerCase().includes('curió')
      );

      if (company && company.plan) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);

        const osCount = await prisma.quote.count({
          where: {
            companyId: finalCompanyId,
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          }
        });

        if (osCount >= company.plan.limiteOsMes) {
          return res.status(403).json({
            error: `Limite mensal de ordens de serviço atingido para o plano ${company.plan.nome} (${company.plan.limiteOsMes} OS/mês).`,
            code: 'PLAN_LIMIT_REACHED'
          });
        }
      }

      if (!data.items || data.items.length === 0) {
        return res.status(400).json({ error: 'Quote must contain at least one item' });
      }

      // Prevenir duplicação de cliente: busca por CNPJ, E-mail ou Nome antes de criar
      let client;
      
      const normalizedCnpj = data.client.cnpj ? data.client.cnpj.trim().replace(/\D/g, '') : '';
      const normalizedEmail = data.client.email ? data.client.email.trim().toLowerCase() : '';
      const normalizedNome = data.client.nome.trim();

      if (normalizedCnpj && normalizedCnpj.length === 14) {
        client = await prisma.client.findFirst({
          where: {
            cnpj: {
              contains: normalizedCnpj
            }
          }
        });
      }

      if (!client && normalizedEmail) {
        client = await prisma.client.findFirst({
          where: {
            email: {
              equals: normalizedEmail,
              mode: 'insensitive'
            }
          }
        });
      }

      if (!client) {
        client = await prisma.client.findFirst({
          where: {
            nome: {
              equals: normalizedNome,
              mode: 'insensitive'
            }
          }
        });
      }

      if (client) {
        // Atualiza os dados do cliente existente para mantê-lo atualizado
        client = await prisma.client.update({
          where: { id: client.id },
          data: data.client,
        });
      } else {
        // Cria um novo cliente apenas se realmente não existir na base
        client = await prisma.client.create({
          data: data.client,
        });
      }

      // Resolve or create vehicle
      let veiculoId: string | null = null;
      if (data.veiculoPlaca && data.veiculoPlaca.trim() !== '') {
        const cleanPlate = data.veiculoPlaca.toUpperCase().replace(/[\s-]/g, "");
        const cleanChassi = data.veiculoChassi ? data.veiculoChassi.trim() : '';
        
        let vehicle = await prisma.vehicle.findUnique({
          where: { placa: cleanPlate }
        });

        if (!vehicle && cleanChassi) {
          vehicle = await prisma.vehicle.findFirst({
            where: { OR: [{ chassi: cleanChassi }, { vin: cleanChassi }] }
          });
        }

        const parsedYear = data.veiculoAnoFabricacao ? (parseInt(data.veiculoAnoFabricacao) || 2020) : (data.veiculoAno ? (parseInt(data.veiculoAno) || 2020) : 2020);
        const parsedAnoModelo = data.veiculoAnoModelo ? (parseInt(data.veiculoAnoModelo) || 2020) : (data.veiculoAno ? (parseInt(data.veiculoAno) || 2020) : 2020);
        const hodometro = data.veiculoHodometro ? (parseInt(data.veiculoHodometro.replace(/\D/g, '')) || 0) : 0;

        if (vehicle) {
          vehicle = await prisma.vehicle.update({
            where: { id: vehicle.id },
            data: {
              clienteId: client.id,
              kmAtual: hodometro > vehicle.kmAtual ? hodometro : vehicle.kmAtual,
              marca: data.veiculoMarca || vehicle.marca,
              modelo: data.veiculoModelo || vehicle.modelo,
              prefixo: data.veiculoPrefixo || vehicle.prefixo,
              chassi: data.veiculoChassi || vehicle.chassi,
              vin: data.veiculoChassi || vehicle.vin,
              renavam: data.veiculoRenavam || vehicle.renavam,
              frota: data.veiculoFrota || vehicle.frota,
              subfrota: data.veiculoSubfrota || vehicle.subfrota,
              tipoVeiculo: data.veiculoTipo || vehicle.tipoVeiculo,
            }
          });
          veiculoId = vehicle.id;
        } else {
          const newVehicle = await prisma.vehicle.create({
            data: {
              placa: cleanPlate,
              marca: data.veiculoMarca || 'N/A',
              modelo: data.veiculoModelo || 'N/A',
              anoFabricacao: parsedYear,
              anoModelo: parsedAnoModelo,
              chassi: data.veiculoChassi || null,
              vin: data.veiculoChassi || null,
              renavam: data.veiculoRenavam || null,
              frota: data.veiculoFrota || null,
              subfrota: data.veiculoSubfrota || null,
              prefixo: data.veiculoPrefixo || null,
              tipoVeiculo: data.veiculoTipo || null,
              kmAtual: hodometro,
              clienteId: client.id,
              companyId: finalCompanyId,
              status: 'ATIVO',
              observacoes: `Criado automaticamente via Novo Orçamento`
            }
          });
          veiculoId = newVehicle.id;
        }
      }

      // Create quote
      const quote = await prisma.quote.create({
        data: {
          companyId: finalCompanyId,
          clientId: client.id,
          condicaoPagamento: data.condicaoPagamento,
          parcelas: data.parcelas,
          valorParcela: data.valorParcela,
          validade: data.validade,
          garantia: data.garantia,
          prazoExecucao: data.prazoExecucao,
          observacao: data.observacao,
          veiculoMarca: data.veiculoMarca,
          veiculoModelo: data.veiculoModelo,
          veiculoAno: data.veiculoAno,
          veiculoPlaca: data.veiculoPlaca,
          veiculoPrefixo: data.veiculoPrefixo,
          veiculoAnoFabricacao: data.veiculoAnoFabricacao,
          veiculoAnoModelo: data.veiculoAnoModelo,
          veiculoChassi: data.veiculoChassi,
          veiculoRenavam: data.veiculoRenavam,
          veiculoFrota: data.veiculoFrota,
          veiculoSubfrota: data.veiculoSubfrota,
          veiculoHodometro: data.veiculoHodometro,
          veiculoTipo: data.veiculoTipo,
          veiculoId: veiculoId,
          plataformaGestaoId: data.plataformaGestaoId || null,
          osExterna: data.osExterna,
          oficinaId: data.oficinaId || null,
          notaFiscalDescricao: data.notaFiscalDescricao || null,
          mecanicoId: data.mecanicoId || null,
          isCloned: data.isCloned || !!data.clonedFromId,
          clonedFromId: data.clonedFromId,
          subtotal: data.subtotal,
          total: data.total,
          status: isCurio ? 'Cobertura' : data.status,
          items: {
            create: data.items,
          },
        },
        include: {
          items: true,
          client: true,
          company: true,
          plataformaGestao: true,
          oficina: true,
          mecanico: true
        }
      });

      console.log(`Quote created: #${quote.numeroOrcamento} for client ${client.nome} (id=${quote.id})`);

      // Audit log for added parts
      const parts = data.items.filter(item => item.tipo === 'Peça');
      if (parts.length > 0) {
        const userId = (req as any).userId || 'SYSTEM';
        const companyId = (req as any).companyId || finalCompanyId;
        parts.forEach(part => {
          AuditLogger.log(
            userId,
            companyId,
            'ADD_PART',
            `Peça adicionada no orçamento #${quote.numeroOrcamento}: Descrição: ${part.descricao}, Código: ${part.codigoPeca}, Tipo: ${part.tipoPeca}, Qtd: ${part.quantidade}, Valor: ${part.valorUnitario}`,
            'SUCCESS'
          );
        });
      }

      try {
        const userId = (req as any).userId || undefined;
        const userName = (req as any).userName || 'Sistema';
        await prisma.quoteHistory.create({
          data: QuoteHistoryHelper.createEvent({
            quoteId: quote.id,
            companyId: finalCompanyId,
            userId,
            userName
          }, 'CRIADO', 'ORÇAMENTO CRIADO')
        });
      } catch (err) {
        console.error('Failed to log quote history on create:', err);
      }

      return res.status(201).json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          return res.status(400).json({ error: 'Invalid companyId: company not found' });
        }
        console.error('Prisma error in quote.create:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in quote.create:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async show(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const quote = await prisma.quote.findUnique({
        where: { id },
        include: {
          items: true,
          client: true,
          company: true,
          plataformaGestao: true,
          oficina: true,
          mecanico: true,
          history: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!quote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      return res.json(quote);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error in quote.show:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in quote.show:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = createQuoteSchema.parse(req.body);

      if (!data.items || data.items.length === 0) {
        return res.status(400).json({ error: 'Quote must contain at least one item' });
      }

      const existingQuote = await prisma.quote.findUnique({
        where: { id },
        include: { client: true, items: true }
      });

      if (!existingQuote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      if (existingQuote.isCloned || existingQuote.clonedFromId) {
        if (data.companyId !== existingQuote.companyId) {
          return res.status(400).json({ error: 'Não é permitido alterar a empresa de um orçamento clonado.' });
        }
      }

      const targetCompanyId = data.companyId || existingQuote.companyId;
      const company = await prisma.company.findUnique({
        where: { id: targetCompanyId }
      });
      const isCurio = company && (
        (company.razaoSocial || '').toLowerCase().includes('curio') ||
        (company.razaoSocial || '').toLowerCase().includes('curió') ||
        (company.nomeFantasia || '').toLowerCase().includes('curio') ||
        (company.nomeFantasia || '').toLowerCase().includes('curió')
      );

      const client = await resolveClientForQuote(data.client, existingQuote.client);

      // Resolve or create vehicle
      let veiculoId: string | null = null;
      if (data.veiculoPlaca && data.veiculoPlaca.trim() !== '') {
        const cleanPlate = data.veiculoPlaca.toUpperCase().replace(/[\s-]/g, "");
        const cleanChassi = data.veiculoChassi ? data.veiculoChassi.trim() : '';
        
        let vehicle = await prisma.vehicle.findUnique({
          where: { placa: cleanPlate }
        });

        if (!vehicle && cleanChassi) {
          vehicle = await prisma.vehicle.findFirst({
            where: { OR: [{ chassi: cleanChassi }, { vin: cleanChassi }] }
          });
        }

        const parsedYear = data.veiculoAnoFabricacao ? (parseInt(data.veiculoAnoFabricacao) || 2020) : (data.veiculoAno ? (parseInt(data.veiculoAno) || 2020) : 2020);
        const parsedAnoModelo = data.veiculoAnoModelo ? (parseInt(data.veiculoAnoModelo) || 2020) : (data.veiculoAno ? (parseInt(data.veiculoAno) || 2020) : 2020);
        const hodometro = data.veiculoHodometro ? (parseInt(data.veiculoHodometro.replace(/\D/g, '')) || 0) : 0;

        if (vehicle) {
          vehicle = await prisma.vehicle.update({
            where: { id: vehicle.id },
            data: {
              clienteId: client.id,
              kmAtual: hodometro > vehicle.kmAtual ? hodometro : vehicle.kmAtual,
              marca: data.veiculoMarca || vehicle.marca,
              modelo: data.veiculoModelo || vehicle.modelo,
              prefixo: data.veiculoPrefixo || vehicle.prefixo,
              chassi: data.veiculoChassi || vehicle.chassi,
              vin: data.veiculoChassi || vehicle.vin,
              renavam: data.veiculoRenavam || vehicle.renavam,
              frota: data.veiculoFrota || vehicle.frota,
              subfrota: data.veiculoSubfrota || vehicle.subfrota,
              tipoVeiculo: data.veiculoTipo || vehicle.tipoVeiculo,
            }
          });
          veiculoId = vehicle.id;
        } else {
          const newVehicle = await prisma.vehicle.create({
            data: {
              placa: cleanPlate,
              marca: data.veiculoMarca || 'N/A',
              modelo: data.veiculoModelo || 'N/A',
              anoFabricacao: parsedYear,
              anoModelo: parsedAnoModelo,
              chassi: data.veiculoChassi || null,
              vin: data.veiculoChassi || null,
              renavam: data.veiculoRenavam || null,
              frota: data.veiculoFrota || null,
              subfrota: data.veiculoSubfrota || null,
              prefixo: data.veiculoPrefixo || null,
              tipoVeiculo: data.veiculoTipo || null,
              kmAtual: hodometro,
              clienteId: client.id,
              companyId: data.companyId,
              status: 'ATIVO',
              observacoes: `Criado automaticamente via Edição de Orçamento`
            }
          });
          veiculoId = newVehicle.id;
        }
      }

      // Update quote & items (delete old, create new) in transaction
      const quoteItems = data.items.map(item => ({
        descricao: item.descricao,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
        tipo: item.tipo,
        codigoPeca: item.codigoPeca,
        tipoPeca: item.tipoPeca,
      }));

      let quote = await prisma.$transaction(async (tx) => {
        const updatedQuote = await tx.quote.update({
          where: { id },
          data: {
            clientId: client.id,
            condicaoPagamento: data.condicaoPagamento,
            parcelas: data.parcelas,
            valorParcela: data.valorParcela,
            validade: data.validade,
            garantia: data.garantia,
            prazoExecucao: data.prazoExecucao,
            observacao: data.observacao,
            veiculoMarca: data.veiculoMarca,
            veiculoModelo: data.veiculoModelo,
            veiculoAno: data.veiculoAno,
            veiculoPlaca: data.veiculoPlaca,
            veiculoPrefixo: data.veiculoPrefixo,
            veiculoAnoFabricacao: data.veiculoAnoFabricacao,
            veiculoAnoModelo: data.veiculoAnoModelo,
            veiculoChassi: data.veiculoChassi,
            veiculoRenavam: data.veiculoRenavam,
            veiculoFrota: data.veiculoFrota,
            veiculoSubfrota: data.veiculoSubfrota,
            veiculoHodometro: data.veiculoHodometro,
            veiculoTipo: data.veiculoTipo,
            veiculoId: veiculoId,
            plataformaGestaoId: data.plataformaGestaoId || null,
            osExterna: data.osExterna,
            oficinaId: data.oficinaId || null,
            notaFiscalDescricao: data.notaFiscalDescricao || null,
            mecanicoId: data.mecanicoId || null,
            subtotal: data.subtotal,
            total: data.total,
            status: isCurio ? 'Cobertura' : data.status,
            items: {
              deleteMany: {},
              create: quoteItems,
            }
          },
          include: {
            items: true,
            client: true,
            company: true,
            plataformaGestao: true,
            oficina: true,
            mecanico: true
          }
        });

        try {
          const userId = (req as any).userId || undefined;
          const userName = (req as any).userName || 'Sistema';
          
          const historyEvents = QuoteHistoryHelper.generateDiff(
            existingQuote as any, 
            { ...data, items: quoteItems } as any, 
            { quoteId: id, companyId: existingQuote.companyId, userId, userName }
          );

          if (historyEvents.length > 0) {
            await tx.quoteHistory.createMany({
              data: historyEvents
            });
          }
        } catch (err) {
          console.error('Failed to log quote history on update:', err);
        }

        return updatedQuote;
      });

      if (data.companyId && data.companyId !== existingQuote.companyId) {
        const targetCompany = await basePrisma.company.findUnique({
          where: { id: data.companyId }
        });

        if (!targetCompany) {
          return res.status(400).json({ error: 'Invalid companyId: company not found' });
        }

        quote = await basePrisma.quote.update({
          where: { id },
          data: { companyId: data.companyId },
          include: {
            items: true,
            client: true,
            company: true,
            plataformaGestao: true,
            oficina: true,
            mecanico: true
          }
        });
      }

      console.log(`Quote updated: #${quote.numeroOrcamento} (id=${quote.id})`);

      const userId = (req as any).userId || 'SYSTEM';
      const companyId = (req as any).companyId || data.companyId;
      AuditLogger.log(
        userId,
        companyId,
        'UPDATE_QUOTE',
        `Orçamento #${quote.numeroOrcamento} atualizado por ${userId}`,
        'SUCCESS'
      );

      // Audit log for added/updated parts
      const parts = data.items.filter(item => item.tipo === 'Peça');
      if (parts.length > 0) {
        parts.forEach(part => {
          AuditLogger.log(
            userId,
            companyId,
            'ADD_PART',
            `Peça atualizada no orçamento #${quote.numeroOrcamento}: Descrição: ${part.descricao}, Código: ${part.codigoPeca}, Tipo: ${part.tipoPeca}, Qtd: ${part.quantidade}, Valor: ${part.valorUnitario}`,
            'SUCCESS'
          );
        });
      }

      return res.json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Quote not found' });
        }
        if (error.code === 'P2003') {
          return res.status(400).json({ error: 'Invalid companyId: company not found' });
        }
        console.error('Prisma error in quote.update:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in quote.update:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      
      const existingQuote = await prisma.quote.findUnique({
        where: { id }
      });

      if (!existingQuote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      await prisma.quote.delete({
        where: { id }
      });

      console.log(`Quote deleted: #${existingQuote.numeroOrcamento} (id=${existingQuote.id})`);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: 'Quote not found' });
        }
        console.error('Prisma error in quote.delete:', error.code, error.message);
        return res.status(500).json({ error: 'Database error', code: error.code });
      }
      console.error('Error in quote.delete:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
      });
    }
  },

  async getHistory(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const history = await prisma.quoteHistory.findMany({
        where: { quoteId: id },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(history);
    } catch (error) {
      console.error('Error fetching quote history:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getWorkshopDashboardStats(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId;
      const {
        clientId,
        placa,
        oficinaId,
        status,
        startDate,
        endDate,
        tipoServico,
        subfrota
      } = req.query as any;

      const where: Prisma.QuoteWhereInput = {
        companyId
      };

      if (clientId && clientId !== 'all') {
        where.clientId = clientId;
      }
      if (placa && placa.trim() !== '') {
        where.veiculoPlaca = {
          contains: placa.trim(),
          mode: 'insensitive'
        };
      }
      if (oficinaId && oficinaId !== 'all') {
        where.oficinaId = oficinaId;
      }
      if (status && status !== 'all') {
        where.status = status;
      }
      if (subfrota && subfrota.trim() !== '') {
        where.veiculoSubfrota = {
          contains: subfrota.trim(),
          mode: 'insensitive'
        };
      }
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }
      if (tipoServico && tipoServico !== 'all') {
        where.items = {
          some: {
            tipo: tipoServico
          }
        };
      }

      const quotes = await prisma.quote.findMany({
        where,
        include: {
          client: true,
          items: true,
          oficina: true,
          mecanico: true,
          history: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Standard Approved list based on rules
      const approvedStatuses = ['Aprovado', 'Aguardando Pagamento', 'Emitir Nota Fiscal', 'Pago', 'Cobertura'];

      // Cards Metrics
      const totalQuotes = quotes.length;
      
      const approvedQuotes = quotes.filter(q => approvedStatuses.includes(q.status));
      const totalApprovedValue = approvedQuotes.reduce((acc, q) => acc + q.total, 0);

      const paidQuotes = quotes.filter(q => q.status === 'Pago');
      const totalPaidValue = paidQuotes.reduce((acc, q) => acc + q.total, 0);

      const approvedCount = approvedQuotes.length;
      const ticketMedio = approvedCount > 0 ? totalApprovedValue / approvedCount : 0;

      // Unique vehicles serviced in approved/completed quotes
      const uniquePlates = new Set<string>();
      approvedQuotes.forEach(q => {
        if (q.veiculoPlaca) {
          uniquePlates.add(q.veiculoPlaca.toUpperCase().trim());
        }
      });
      const veiculosAtendidos = uniquePlates.size;

      // SLA calculations
      let totalToApproveTime = 0;
      let countToApprove = 0;
      let totalToExecuteTime = 0;
      let countToExecute = 0;
      let totalToAttendTime = 0;
      let countToAttend = 0;

      quotes.forEach(q => {
        const createDate = new Date(q.createdAt).getTime();
        let approveDate: number | null = null;
        let completeDate: number | null = null;

        q.history.forEach((h: any) => {
          let details: any = {};
          try {
            if (h.details) details = JSON.parse(h.details);
          } catch (_) {}

          const newStatus = details.para || '';
          const hDate = new Date(h.createdAt).getTime();

          if (
            newStatus === 'Aprovado' || 
            newStatus === 'Aguardando Pagamento' || 
            newStatus === 'Emitir Nota Fiscal' || 
            newStatus === 'Pago'
          ) {
            if (!approveDate || hDate < approveDate) {
              approveDate = hDate;
            }
          }

          if (newStatus === 'Emitir Nota Fiscal' || newStatus === 'Pago') {
            if (!completeDate || hDate < completeDate) {
              completeDate = hDate;
            }
          }
        });

        if (approveDate) {
          totalToApproveTime += (approveDate - createDate);
          countToApprove++;
        }

        if (approveDate && completeDate && completeDate >= approveDate) {
          totalToExecuteTime += (completeDate - approveDate);
          countToExecute++;
        }

        if (completeDate) {
          totalToAttendTime += (completeDate - createDate);
          countToAttend++;
        }
      });

      const avgApprovalTimeHours = countToApprove > 0 ? (totalToApproveTime / countToApprove) / (1000 * 60 * 60) : 0;
      const avgExecutionTimeHours = countToExecute > 0 ? (totalToExecuteTime / countToExecute) / (1000 * 60 * 60) : 0;
      const avgAttendTimeHours = countToAttend > 0 ? (totalToAttendTime / countToAttend) / (1000 * 60 * 60) : 0;

      // Main Chart: Monthly Billing (January to December)
      const currentYear = new Date().getFullYear();
      const monthlyBilling = Array.from({ length: 12 }, (_, i) => ({
        month: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i],
        valorPago: 0,
        qtdServicos: 0,
        percentualComparativo: 0
      }));

      quotes.forEach(q => {
        const qDate = new Date(q.createdAt);
        if (qDate.getFullYear() === currentYear) {
          const m = qDate.getMonth();
          const isApproved = approvedStatuses.includes(q.status);
          const isPaid = q.status === 'Pago';

          if (isPaid) {
            monthlyBilling[m].valorPago += q.total;
          }

          if (isApproved) {
            const serviceItems = q.items.filter(item => item.tipo !== 'Peça');
            const totalQty = serviceItems.reduce((acc, item) => acc + item.quantidade, 0);
            monthlyBilling[m].qtdServicos += totalQty > 0 ? totalQty : 1;
          }
        }
      });

      for (let i = 0; i < 12; i++) {
        const currentPaid = monthlyBilling[i].valorPago;
        const prevPaid = i > 0 ? monthlyBilling[i - 1].valorPago : 0;
        if (i > 0) {
          monthlyBilling[i].percentualComparativo = prevPaid > 0 
            ? ((currentPaid - prevPaid) / prevPaid) * 100 
            : currentPaid > 0 ? 100 : 0;
        }
      }

      // Group Client rankings & Grid data (deduplicating by name/CNPJ)
      const clientMap: Record<string, { clientId: string, name: string, totalPaid: number, countOS: number, uniqueVehicles: Set<string>, countQuotes: number, countApproved: number }> = {};

      quotes.forEach(q => {
        const clientId = q.clientId;
        const clientName = q.client?.nome || 'Cliente não identificado';
        const clientCnpj = q.client?.cnpj ? q.client.cnpj.trim().replace(/\D/g, '') : '';
        const groupKey = clientCnpj ? `cnpj_${clientCnpj}` : `nome_${clientName.trim().toLowerCase()}`;
        
        const isApproved = approvedStatuses.includes(q.status);
        const isPaid = q.status === 'Pago';

        if (!clientMap[groupKey]) {
          clientMap[groupKey] = {
            clientId: clientId, // store the first seen id
            name: clientName,
            totalPaid: 0,
            countOS: 0,
            uniqueVehicles: new Set(),
            countQuotes: 0,
            countApproved: 0
          };
        }

        clientMap[groupKey].countQuotes++;
        if (isApproved) {
          clientMap[groupKey].countApproved++;
          if (q.veiculoPlaca) {
            clientMap[groupKey].uniqueVehicles.add(q.veiculoPlaca.toUpperCase().trim());
          }
          clientMap[groupKey].countOS++;
        }

        if (isPaid) {
          clientMap[groupKey].totalPaid += q.total;
        }
      });

      const clientRanking = Object.values(clientMap)
        .map((data) => ({
          clientId: data.clientId,
          name: data.name,
          veiculosAtendidos: data.uniqueVehicles.size,
          orcamentos: data.countQuotes,
          aprovados: data.countApproved,
          valorPago: data.totalPaid,
          ticketMedio: data.countApproved > 0 ? data.totalPaid / data.countApproved : 0
        }))
        .sort((a, b) => b.valorPago - a.valorPago);

      const topClients = clientRanking.map(c => ({
        clientId: c.clientId,
        name: c.name,
        totalPaid: c.valorPago,
        countOS: c.aprovados
      })).slice(0, 10);

      // Grid de Serviços
      const servicesGrid = quotes.map(q => {
        const servicosList = q.items
          .filter(item => item.tipo !== 'Peça')
          .map(item => item.descricao)
          .join(', ');

        return {
          id: q.id,
          os: q.numeroOrcamento,
          cliente: q.client?.nome || 'N/A',
          oficina: q.oficina?.nome || 'N/A',
          veiculo: `${q.veiculoMarca || ''} ${q.veiculoModelo || ''} (${q.veiculoPlaca || 'N/A'})`.trim(),
          servico: servicosList || 'Apenas Peças/Outros',
          valor: q.total,
          status: q.status,
          data: q.createdAt
        };
      });

      // Strategic indicators
      // 1. Cliente que mais gera receita
      const topClientData = clientRanking[0];
      const clienteMaisReceita = topClientData ? { name: topClientData.name, value: topClientData.valorPago } : null;

      // 2. Serviço mais vendido
      const serviceFrequency: Record<string, { count: number, total: number }> = {};
      quotes.forEach(q => {
        const isApproved = approvedStatuses.includes(q.status);
        if (isApproved) {
          q.items.forEach(item => {
            if (item.tipo !== 'Peça') {
              const desc = item.descricao.trim();
              if (!serviceFrequency[desc]) {
                serviceFrequency[desc] = { count: 0, total: 0 };
              }
              serviceFrequency[desc].count += item.quantidade;
              serviceFrequency[desc].total += item.valorTotal;
            }
          });
        }
      });
      const rankedServices = Object.entries(serviceFrequency)
        .map(([desc, data]) => ({
          descricao: desc,
          quantidade: data.count,
          valorTotal: data.total
        }))
        .sort((a, b) => b.quantidade - a.quantidade);
      const topService = rankedServices[0] ? { name: rankedServices[0].descricao, value: rankedServices[0].quantidade } : null;

      // 3. Mecânico com mais atendimentos & produtividade
      const mechanicFrequency: Record<string, { name: string, count: number, totalExecuteTime: number, countExecuted: number }> = {};
      quotes.forEach(q => {
        if (q.mecanicoId) {
          const isApproved = approvedStatuses.includes(q.status);
          if (isApproved) {
            const name = q.mecanico?.nome || 'Mecânico não nomeado';
            if (!mechanicFrequency[q.mecanicoId]) {
              mechanicFrequency[q.mecanicoId] = { name, count: 0, totalExecuteTime: 0, countExecuted: 0 };
            }
            mechanicFrequency[q.mecanicoId].count++;

            const createDate = new Date(q.createdAt).getTime();
            let approveDate: number | null = null;
            let completeDate: number | null = null;

            q.history.forEach((h: any) => {
              let details: any = {};
              try { if (h.details) details = JSON.parse(h.details); } catch (_) {}
              const newStatus = details.para || '';
              const hDate = new Date(h.createdAt).getTime();
              if (newStatus === 'Aprovado' || newStatus === 'Aguardando Pagamento' || newStatus === 'Emitir Nota Fiscal' || newStatus === 'Pago') {
                if (!approveDate || hDate < approveDate) approveDate = hDate;
              }
              if (newStatus === 'Emitir Nota Fiscal' || newStatus === 'Pago') {
                if (!completeDate || hDate < completeDate) completeDate = hDate;
              }
            });

            if (approveDate && completeDate && completeDate >= approveDate) {
              mechanicFrequency[q.mecanicoId].totalExecuteTime += (completeDate - approveDate);
              mechanicFrequency[q.mecanicoId].countExecuted++;
            }
          }
        }
      });
      const rankedMechanics = Object.entries(mechanicFrequency)
        .map(([id, data]) => ({
          id,
          name: data.name,
          atendimentos: data.count,
          tempoMedioExecucaoHoras: data.countExecuted > 0 ? (data.totalExecuteTime / data.countExecuted) / (1000 * 60 * 60) : 0
        }))
        .sort((a, b) => b.atendimentos - a.atendimentos);
      const topMechanic = rankedMechanics[0] ? { name: rankedMechanics[0].name, value: rankedMechanics[0].atendimentos } : null;

      // 4. Conversion Rate & Accumulated year faturamento
      const conversionRate = totalQuotes > 0 ? (approvedCount / totalQuotes) * 100 : 0;

      // Accumulated year faturamento
      const faturamentoAcumuladoAno = monthlyBilling.reduce((acc, m) => acc + m.valorPago, 0);

      return res.json({
        totalQuotes,
        totalApproved: totalApprovedValue,
        totalPago: totalPaidValue,
        ticketMedio,
        veiculosAtendidos,
        tempoMedioAtendimento: avgAttendTimeHours,
        tempoMedioAprovacao: avgApprovalTimeHours,
        tempoMedioExecucao: avgExecutionTimeHours,
        taxaConversao: conversionRate,
        faturamentoAcumuladoAno,
        monthlyBilling,
        topClients,
        clientsGrid: clientRanking,
        servicesGrid,
        strategicIndicators: {
          clienteMaisReceita,
          servicoMaisVendido: topService,
          mecanicoMaisAtendimentos: topMechanic,
          tempoMedioAprovacao: avgApprovalTimeHours,
          tempoMedioExecucao: avgExecutionTimeHours,
          taxaConversao: conversionRate,
          faturamentoAcumuladoAno,
          topClients,
          topServices: rankedServices.slice(0, 10),
          topMechanics: rankedMechanics
        }
      });
    } catch (error) {
      console.error('Error in quote.getWorkshopDashboardStats:', error);
      return res.status(500).json({ error: 'Internal server error generating workshop stats' });
    }
  }
};
