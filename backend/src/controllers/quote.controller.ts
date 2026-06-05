import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

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
  items: z.array(z.object({
    descricao: z.string(),
    quantidade: z.number(),
    valorUnitario: z.number(),
    valorTotal: z.number(),
    tipo: z.string().optional().default("Peça"),
  })),
  subtotal: z.number(),
  total: z.number(),
  status: z.string().optional().default("Aguardando Aprovação"),
});

export const QuoteController = {
  async list(req: Request, res: Response) {
    try {
      const quotes = await prisma.quote.findMany({
        include: {
          client: true,
          company: true,
          items: true,
          plataformaGestao: true,
          oficina: true
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
      const quotes = await prisma.quote.findMany({
        where: {
          status: {
            in: ['Aprovado', 'Emitir Nota Fiscal', 'Cobertura', 'Pago']
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

      // Calculate breakdown by company
      const companies = await prisma.company.findMany();
      const companyBreakdown = await Promise.all(
        companies.map(async (company) => {
          const companyQuotes = await prisma.quote.findMany({
            where: { 
              companyId: company.id,
              status: {
                in: ['Aprovado', 'Emitir Nota Fiscal', 'Cobertura', 'Pago']
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

      // Validar limite mensal de Ordens de Serviço (OS) do plano
      const company = await prisma.company.findUnique({
        where: { id: data.companyId },
        include: { plan: true }
      });

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
            companyId: data.companyId,
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
              companyId: data.companyId,
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
          companyId: data.companyId,
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
          subtotal: data.subtotal,
          total: data.total,
          status: data.status,
          items: {
            create: data.items,
          },
        },
        include: {
          items: true,
          client: true,
          company: true,
          plataformaGestao: true,
          oficina: true
        }
      });

      console.log(`Quote created: #${quote.numeroOrcamento} for client ${client.nome} (id=${quote.id})`);
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
          oficina: true
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
        include: { client: true }
      });

      if (!existingQuote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      // Prevenir duplicação de cliente e evitar sobrescrever registros compartilhados
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
        // Cria um novo cliente se realmente não existir
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
              companyId: data.companyId,
              status: 'ATIVO',
              observacoes: `Criado automaticamente via Edição de Orçamento`
            }
          });
          veiculoId = newVehicle.id;
        }
      }

      // Update quote & items (delete old, create new)
      const quote = await prisma.quote.update({
        where: { id },
        data: {
          companyId: data.companyId,
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
          subtotal: data.subtotal,
          total: data.total,
          status: data.status,
          items: {
            deleteMany: {},
            create: data.items,
          }
        },
        include: {
          items: true,
          client: true,
          company: true,
          plataformaGestao: true,
          oficina: true
        }
      });

      console.log(`Quote updated: #${quote.numeroOrcamento} (id=${quote.id})`);
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
  }
};
